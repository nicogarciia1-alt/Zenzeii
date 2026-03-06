from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import asyncio

# Import services
from services.book_import import (
    fetch_gutenberg_text,
    clean_gutenberg_text,
    split_into_chapters,
    split_into_sentences,
    search_gutenberg,
    GUTENBERG_BOOKS,
    get_book_cover
)
from services.translation import (
    trigger_chapter_translation,
    ensure_sentences_translated,
    translate_title_simple,
    translate_author_simple,
    BATCH_SIZE
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Japanese Reading App API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========================
# MODELS
# ========================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    username: str
    created_at: str
    vocabulary_count: int = 0
    books_read: int = 0
    total_words_read: int = 0

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class BookResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    title_jp: str
    author: str
    author_jp: str
    cover_image: str
    description: str
    description_jp: str
    total_chapters: int
    difficulty: str
    genre: str
    import_status: str = "completed"
    sentences_count: int = 0

class ChapterResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    book_id: str
    chapter_number: int
    title: str
    title_jp: str
    sentences_count: int = 0

class SentenceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    chapter_id: str
    order: int
    english: str
    japanese_kanji: str  # Frontend compatibility
    japanese_hiragana: str
    japanese_katakana: str
    japanese_romaji: str
    translation_status: str = "pending"
    words: List[Dict[str, Any]] = []

class WordDefinition(BaseModel):
    word: str
    reading: str
    romaji: str
    meanings: List[str]
    parts_of_speech: List[str]
    example_sentence: Optional[str] = None
    example_translation: Optional[str] = None

class SaveWordRequest(BaseModel):
    word: str
    reading: str
    romaji: str
    meanings: List[str]
    parts_of_speech: List[str]
    example_sentence: Optional[str] = None
    example_translation: Optional[str] = None
    notes: Optional[str] = ""

class SavedWordResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    word: str
    reading: str
    romaji: str
    meanings: List[str]
    parts_of_speech: List[str]
    example_sentence: Optional[str]
    example_translation: Optional[str]
    notes: str
    mastery_level: int
    next_review: str
    times_reviewed: int
    created_at: str

class UpdateSavedWordRequest(BaseModel):
    notes: Optional[str] = None
    mastery_level: Optional[int] = None

class BookmarkRequest(BaseModel):
    book_id: str
    chapter_id: str
    sentence_id: str
    name: Optional[str] = "Bookmark"

class BookmarkResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    book_id: str
    chapter_id: str
    sentence_id: str
    name: str
    created_at: str

class ReadingProgressRequest(BaseModel):
    book_id: str
    chapter_id: str
    sentence_id: str
    words_read: int = 0

class ReadingProgressResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    book_id: str
    chapter_id: str
    sentence_id: str
    last_read: str
    words_read: int

class FlashcardReviewRequest(BaseModel):
    word_id: str
    correct: bool

class ImportBookRequest(BaseModel):
    book_key: Optional[str] = None
    gutenberg_id: Optional[int] = None
    title: Optional[str] = None
    author: Optional[str] = None

class GutenbergSearchResult(BaseModel):
    gutenberg_id: int
    title: str
    author: str
    languages: List[str]
    download_count: int

class TranslateRequest(BaseModel):
    chapter_id: str
    start_position: int = 1

# ========================
# AUTH HELPERS
# ========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {"sub": user_id, "exp": expiration}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ========================
# HELPER: Transform sentence for frontend
# ========================

def transform_sentence_for_frontend(sentence: dict) -> dict:
    """Transform database sentence to frontend format with fallbacks"""
    english = sentence.get("english", "")
    return {
        "id": sentence.get("id"),
        "chapter_id": sentence.get("chapter_id"),
        "order": sentence.get("order", 0),
        "english": english,
        # Use Japanese translations or fallback to English
        "japanese_kanji": sentence.get("kanji_text") or english,
        "japanese_hiragana": sentence.get("hiragana_text") or "",
        "japanese_katakana": sentence.get("katakana_text") or "",
        "japanese_romaji": sentence.get("romaji_text") or english.lower(),
        "translation_status": sentence.get("translation_status", "pending"),
        "words": sentence.get("words", [])
    }

# ========================
# AUTH ENDPOINTS
# ========================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "username": user_data.username,
        "password": hash_password(user_data.password),
        "created_at": now,
        "vocabulary_count": 0,
        "books_read": 0,
        "total_words_read": 0
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id, email=user_data.email, username=user_data.username,
            created_at=now, vocabulary_count=0, books_read=0, total_words_read=0
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"], email=user["email"], username=user["username"],
            created_at=user["created_at"],
            vocabulary_count=user.get("vocabulary_count", 0),
            books_read=user.get("books_read", 0),
            total_words_read=user.get("total_words_read", 0)
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ========================
# BOOKS ENDPOINTS
# ========================

@api_router.get("/books", response_model=List[BookResponse])
async def get_books():
    books = await db.books.find({}, {"_id": 0}).to_list(100)
    return books

@api_router.get("/books/{book_id}", response_model=BookResponse)
async def get_book(book_id: str):
    book = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@api_router.get("/books/{book_id}/chapters", response_model=List[ChapterResponse])
async def get_chapters(book_id: str):
    chapters = await db.chapters.find({"book_id": book_id}, {"_id": 0}).sort("chapter_number", 1).to_list(200)
    return chapters

@api_router.get("/chapters/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(chapter_id: str):
    chapter = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter

@api_router.get("/chapters/{chapter_id}/sentences", response_model=List[SentenceResponse])
async def get_sentences(
    chapter_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    background_tasks: BackgroundTasks = None
):
    """
    Get sentences with pagination.
    Automatically triggers background translation for untranslated sentences.
    """
    sentences = await db.sentences.find(
        {"chapter_id": chapter_id},
        {"_id": 0}
    ).sort("order", 1).skip(skip).limit(limit).to_list(limit)
    
    # Transform for frontend
    result = [transform_sentence_for_frontend(s) for s in sentences]
    
    # Trigger background translation for this chapter
    if background_tasks and sentences:
        start_pos = sentences[0].get("order", 1)
        background_tasks.add_task(trigger_chapter_translation, db, chapter_id, start_pos)
    
    return result

@api_router.get("/chapters/{chapter_id}/sentences/count")
async def get_sentences_count(chapter_id: str):
    count = await db.sentences.count_documents({"chapter_id": chapter_id})
    translated = await db.sentences.count_documents({
        "chapter_id": chapter_id,
        "translation_status": "completed"
    })
    return {
        "count": count,
        "translated": translated,
        "chapter_id": chapter_id
    }

# ========================
# TRANSLATION TRIGGER ENDPOINT
# ========================

@api_router.post("/translate/trigger")
async def trigger_translation(
    request: TranslateRequest,
    background_tasks: BackgroundTasks
):
    """
    Manually trigger translation for a chapter from a specific position.
    Called by frontend when user starts reading.
    """
    # Verify chapter exists
    chapter = await db.chapters.find_one({"id": request.chapter_id})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    # Trigger background translation
    background_tasks.add_task(
        trigger_chapter_translation, 
        db, 
        request.chapter_id, 
        request.start_position
    )
    
    return {"message": "Translation triggered", "chapter_id": request.chapter_id}

@api_router.post("/translate/sentences")
async def translate_specific_sentences(sentence_ids: List[str]):
    """
    Request immediate translation for specific sentences.
    Used when user is about to view sentences that aren't translated yet.
    """
    if len(sentence_ids) > 50:
        raise HTTPException(status_code=400, detail="Max 50 sentences per request")
    
    # Get translations (from cache or generate new)
    await ensure_sentences_translated(db, sentence_ids)
    
    # Return updated sentences
    sentences = await db.sentences.find(
        {"id": {"$in": sentence_ids}},
        {"_id": 0}
    ).to_list(len(sentence_ids))
    
    return [transform_sentence_for_frontend(s) for s in sentences]

# ========================
# BOOK IMPORT - INSTANT (English only)
# ========================

@api_router.get("/books/available/list")
async def get_available_books():
    available = []
    for key, info in GUTENBERG_BOOKS.items():
        existing = await db.books.find_one({"id": key})
        available.append({
            "book_key": key,
            "title": info["title"],
            "author": info["author"],
            "gutenberg_id": info["gutenberg_id"],
            "genre": info["genre"],
            "difficulty": info["difficulty"],
            "is_imported": existing is not None,
            "import_status": existing.get("import_status", "not_started") if existing else "not_started"
        })
    return available

@api_router.get("/books/search/gutenberg", response_model=List[GutenbergSearchResult])
async def search_gutenberg_books(query: str = Query(..., min_length=2)):
    results = await search_gutenberg(query)
    return results

@api_router.post("/books/import")
async def import_book(request: ImportBookRequest, background_tasks: BackgroundTasks):
    """
    Import a book from Project Gutenberg.
    INSTANT: Only stores English text. Translations happen on-demand when reading.
    """
    if request.book_key and request.book_key in GUTENBERG_BOOKS:
        book_info = GUTENBERG_BOOKS[request.book_key]
        book_id = request.book_key
        gutenberg_id = book_info["gutenberg_id"]
        title = book_info["title"]
        author = book_info["author"]
        genre = book_info.get("genre", "literature")
        difficulty = book_info.get("difficulty", "intermediate")
    elif request.gutenberg_id:
        book_id = f"gutenberg-{request.gutenberg_id}"
        gutenberg_id = request.gutenberg_id
        title = request.title or f"Book {request.gutenberg_id}"
        author = request.author or "Unknown"
        genre = "literature"
        difficulty = "intermediate"
    else:
        raise HTTPException(status_code=400, detail="Must provide book_key or gutenberg_id")
    
    existing = await db.books.find_one({"id": book_id})
    if existing and existing.get("import_status") == "completed":
        return {"message": "Book already imported", "book_id": book_id, "status": "completed"}
    
    # Start import in background
    background_tasks.add_task(process_book_import_fast, book_id, gutenberg_id, title, author, genre, difficulty)
    
    return {"message": "Book import started", "book_id": book_id, "status": "importing"}


async def process_book_import_fast(
    book_id: str, 
    gutenberg_id: int, 
    title: str, 
    author: str,
    genre: str,
    difficulty: str
):
    """
    Fast book import - only stores English text.
    Japanese translations will be generated on-demand when users read.
    """
    try:
        logger.info(f"Starting fast import for {book_id}")
        
        # Create initial book record
        book_doc = {
            "id": book_id,
            "title": title,
            "title_jp": title,  # Will be translated later or on first load
            "author": author,
            "author_jp": author,
            "cover_image": get_book_cover(book_id),
            "description": f"A classic work by {author}",
            "description_jp": "",
            "total_chapters": 0,
            "difficulty": difficulty,
            "genre": genre,
            "import_status": "importing",
            "sentences_count": 0,
            "gutenberg_id": gutenberg_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.books.update_one(
            {"id": book_id},
            {"$set": book_doc},
            upsert=True
        )
        
        # Fetch book text
        raw_text = await fetch_gutenberg_text(gutenberg_id)
        if not raw_text:
            await db.books.update_one(
                {"id": book_id},
                {"$set": {"import_status": "failed", "error": "Could not fetch from Gutenberg"}}
            )
            return
        
        # Clean and split
        clean_text = clean_gutenberg_text(raw_text)
        chapters = split_into_chapters(clean_text, book_id)
        
        logger.info(f"Found {len(chapters)} chapters")
        
        # Process each chapter
        total_sentences = 0
        
        for chapter in chapters:
            sentences = split_into_sentences(chapter['content'])
            if not sentences:
                continue
            
            # Create chapter
            chapter_doc = {
                "id": chapter['id'],
                "book_id": book_id,
                "chapter_number": chapter['chapter_number'],
                "title": chapter['title'],
                "title_jp": chapter['title'],  # Translated on-demand
                "sentences_count": len(sentences)
            }
            await db.chapters.update_one(
                {"id": chapter['id']},
                {"$set": chapter_doc},
                upsert=True
            )
            
            # Create sentences with ONLY English text
            sentence_docs = []
            for i, sentence_text in enumerate(sentences):
                sentence_docs.append({
                    "id": f"{chapter['id']}-s{i+1}",
                    "chapter_id": chapter['id'],
                    "book_id": book_id,
                    "order": i + 1,
                    "english": sentence_text,
                    # Japanese fields start as NULL
                    "kanji_text": None,
                    "hiragana_text": None,
                    "katakana_text": None,
                    "romaji_text": None,
                    "translation_status": "pending",
                    "words": []
                })
            
            # Bulk insert sentences
            if sentence_docs:
                # Delete existing sentences for this chapter first
                await db.sentences.delete_many({"chapter_id": chapter['id']})
                await db.sentences.insert_many(sentence_docs)
                total_sentences += len(sentence_docs)
        
        # Try to translate title and author (non-blocking)
        try:
            title_jp = await asyncio.wait_for(translate_title_simple(title), timeout=15)
            author_jp = await asyncio.wait_for(translate_author_simple(author), timeout=15)
        except:
            title_jp = title
            author_jp = author
        
        # Update book as completed
        await db.books.update_one(
            {"id": book_id},
            {"$set": {
                "import_status": "completed",
                "title_jp": title_jp,
                "author_jp": author_jp,
                "total_chapters": len(chapters),
                "sentences_count": total_sentences
            }}
        )
        
        logger.info(f"Fast import complete: {book_id} - {len(chapters)} chapters, {total_sentences} sentences")
        
    except Exception as e:
        logger.error(f"Import failed for {book_id}: {e}", exc_info=True)
        await db.books.update_one(
            {"id": book_id},
            {"$set": {"import_status": "failed", "error": str(e)}}
        )


@api_router.post("/books/upload")
async def upload_book(
    file: UploadFile = File(...),
    title: str = Query(...),
    author: str = Query(...),
    background_tasks: BackgroundTasks = None
):
    """Upload a book file for instant import"""
    if not file.filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only .txt files supported")
    
    content = await file.read()
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        text = content.decode('latin-1')
    
    book_id = f"upload-{str(uuid.uuid4())[:8]}"
    background_tasks.add_task(process_upload_fast, book_id, text, title, author)
    
    return {"message": "Upload started", "book_id": book_id, "status": "importing"}


async def process_upload_fast(book_id: str, text: str, title: str, author: str):
    """Process uploaded book with fast import"""
    try:
        book_doc = {
            "id": book_id,
            "title": title,
            "title_jp": title,
            "author": author,
            "author_jp": author,
            "cover_image": get_book_cover("default"),
            "description": f"Uploaded: {title}",
            "description_jp": "",
            "total_chapters": 0,
            "difficulty": "intermediate",
            "genre": "literature",
            "import_status": "importing",
            "sentences_count": 0,
            "source": "upload",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.books.insert_one(book_doc)
        
        clean_text = clean_gutenberg_text(text)
        chapters = split_into_chapters(clean_text, book_id)
        
        total_sentences = 0
        for chapter in chapters:
            sentences = split_into_sentences(chapter['content'])
            if not sentences:
                continue
            
            chapter_doc = {
                "id": chapter['id'],
                "book_id": book_id,
                "chapter_number": chapter['chapter_number'],
                "title": chapter['title'],
                "title_jp": chapter['title'],
                "sentences_count": len(sentences)
            }
            await db.chapters.insert_one(chapter_doc)
            
            sentence_docs = [{
                "id": f"{chapter['id']}-s{i+1}",
                "chapter_id": chapter['id'],
                "book_id": book_id,
                "order": i + 1,
                "english": s,
                "kanji_text": None,
                "hiragana_text": None,
                "katakana_text": None,
                "romaji_text": None,
                "translation_status": "pending",
                "words": []
            } for i, s in enumerate(sentences)]
            
            if sentence_docs:
                await db.sentences.insert_many(sentence_docs)
                total_sentences += len(sentence_docs)
        
        await db.books.update_one(
            {"id": book_id},
            {"$set": {
                "import_status": "completed",
                "total_chapters": len(chapters),
                "sentences_count": total_sentences
            }}
        )
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        await db.books.update_one(
            {"id": book_id},
            {"$set": {"import_status": "failed", "error": str(e)}}
        )


@api_router.get("/books/{book_id}/status")
async def get_book_status(book_id: str):
    book = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Count translated sentences
    translated = await db.sentences.count_documents({
        "book_id": book_id,
        "translation_status": "completed"
    })
    
    return {
        "book_id": book_id,
        "status": book.get("import_status", "unknown"),
        "total_sentences": book.get("sentences_count", 0),
        "translated_sentences": translated,
        "total_chapters": book.get("total_chapters", 0)
    }


@api_router.delete("/books/{book_id}")
async def delete_book(book_id: str, current_user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    await db.sentences.delete_many({"book_id": book_id})
    await db.chapters.delete_many({"book_id": book_id})
    await db.books.delete_one({"id": book_id})
    
    return {"message": "Book deleted"}

# ========================
# DICTIONARY ENDPOINT
# ========================

@api_router.get("/dictionary/{word}", response_model=WordDefinition)
async def lookup_word(word: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://jisho.org/api/v1/search/words",
                params={"keyword": word},
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("data"):
                    entry = data["data"][0]
                    japanese = entry.get("japanese", [{}])[0]
                    senses = entry.get("senses", [{}])
                    return WordDefinition(
                        word=japanese.get("word", word),
                        reading=japanese.get("reading", ""),
                        romaji=japanese.get("reading", ""),
                        meanings=[m for s in senses for m in s.get("english_definitions", [])[:3]],
                        parts_of_speech=[p for s in senses for p in s.get("parts_of_speech", [])[:2]]
                    )
    except Exception as e:
        logger.warning(f"Jisho API failed: {e}")
    
    return WordDefinition(
        word=word, reading=word, romaji=word,
        meanings=["Definition not found"], parts_of_speech=["unknown"]
    )

# ========================
# VOCABULARY ENDPOINTS
# ========================

@api_router.get("/vocabulary", response_model=List[SavedWordResponse])
async def get_vocabulary(current_user: dict = Depends(get_current_user)):
    words = await db.saved_words.find(
        {"user_id": current_user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return words

@api_router.post("/vocabulary", response_model=SavedWordResponse)
async def save_word(word_data: SaveWordRequest, current_user: dict = Depends(get_current_user)):
    existing = await db.saved_words.find_one({
        "user_id": current_user["id"], "word": word_data.word
    })
    if existing:
        raise HTTPException(status_code=400, detail="Word already saved")
    
    word_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    word_doc = {
        "id": word_id,
        "user_id": current_user["id"],
        "word": word_data.word,
        "reading": word_data.reading,
        "romaji": word_data.romaji,
        "meanings": word_data.meanings,
        "parts_of_speech": word_data.parts_of_speech,
        "example_sentence": word_data.example_sentence,
        "example_translation": word_data.example_translation,
        "notes": word_data.notes or "",
        "mastery_level": 0,
        "next_review": now.isoformat(),
        "times_reviewed": 0,
        "created_at": now.isoformat()
    }
    await db.saved_words.insert_one(word_doc)
    await db.users.update_one({"id": current_user["id"]}, {"$inc": {"vocabulary_count": 1}})
    return SavedWordResponse(**word_doc)

@api_router.put("/vocabulary/{word_id}", response_model=SavedWordResponse)
async def update_saved_word(word_id: str, update_data: UpdateSavedWordRequest, current_user: dict = Depends(get_current_user)):
    update_fields = {}
    if update_data.notes is not None:
        update_fields["notes"] = update_data.notes
    if update_data.mastery_level is not None:
        update_fields["mastery_level"] = update_data.mastery_level
    
    if update_fields:
        await db.saved_words.update_one(
            {"id": word_id, "user_id": current_user["id"]},
            {"$set": update_fields}
        )
    
    word = await db.saved_words.find_one({"id": word_id, "user_id": current_user["id"]}, {"_id": 0})
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    return SavedWordResponse(**word)

@api_router.delete("/vocabulary/{word_id}")
async def delete_saved_word(word_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.saved_words.delete_one({"id": word_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Word not found")
    await db.users.update_one({"id": current_user["id"]}, {"$inc": {"vocabulary_count": -1}})
    return {"message": "Word deleted"}

# ========================
# FLASHCARD REVIEW
# ========================

@api_router.get("/vocabulary/review", response_model=List[SavedWordResponse])
async def get_review_words(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    words = await db.saved_words.find(
        {"user_id": current_user["id"], "next_review": {"$lte": now}},
        {"_id": 0}
    ).sort("next_review", 1).to_list(20)
    return words

@api_router.post("/vocabulary/review")
async def submit_review(review: FlashcardReviewRequest, current_user: dict = Depends(get_current_user)):
    word = await db.saved_words.find_one({"id": review.word_id, "user_id": current_user["id"]}, {"_id": 0})
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    
    level = word.get("mastery_level", 0)
    new_level = min(level + 1, 5) if review.correct else max(level - 1, 0)
    days = 2 ** new_level if review.correct else 1
    next_review = datetime.now(timezone.utc) + timedelta(days=days)
    
    await db.saved_words.update_one(
        {"id": review.word_id, "user_id": current_user["id"]},
        {"$set": {"mastery_level": new_level, "next_review": next_review.isoformat()}, "$inc": {"times_reviewed": 1}}
    )
    return {"message": "Review recorded", "new_level": new_level}

# ========================
# BOOKMARKS
# ========================

@api_router.get("/bookmarks", response_model=List[BookmarkResponse])
async def get_bookmarks(current_user: dict = Depends(get_current_user)):
    bookmarks = await db.bookmarks.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return bookmarks

@api_router.post("/bookmarks", response_model=BookmarkResponse)
async def create_bookmark(bookmark: BookmarkRequest, current_user: dict = Depends(get_current_user)):
    bookmark_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    bookmark_doc = {
        "id": bookmark_id,
        "user_id": current_user["id"],
        "book_id": bookmark.book_id,
        "chapter_id": bookmark.chapter_id,
        "sentence_id": bookmark.sentence_id,
        "name": bookmark.name,
        "created_at": now
    }
    await db.bookmarks.insert_one(bookmark_doc)
    return BookmarkResponse(**bookmark_doc)

@api_router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.bookmarks.delete_one({"id": bookmark_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return {"message": "Bookmark deleted"}

# ========================
# READING PROGRESS
# ========================

@api_router.get("/progress", response_model=List[ReadingProgressResponse])
async def get_all_progress(current_user: dict = Depends(get_current_user)):
    progress = await db.reading_progress.find({"user_id": current_user["id"]}, {"_id": 0}).sort("last_read", -1).to_list(100)
    return progress

@api_router.get("/progress/{book_id}")
async def get_progress(book_id: str, current_user: dict = Depends(get_current_user)):
    progress = await db.reading_progress.find_one({"user_id": current_user["id"], "book_id": book_id}, {"_id": 0})
    return progress

@api_router.post("/progress", response_model=ReadingProgressResponse)
async def update_progress(progress: ReadingProgressRequest, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.reading_progress.find_one({"user_id": current_user["id"], "book_id": progress.book_id})
    
    if existing:
        await db.reading_progress.update_one(
            {"id": existing["id"]},
            {"$set": {"chapter_id": progress.chapter_id, "sentence_id": progress.sentence_id, "last_read": now},
             "$inc": {"words_read": progress.words_read}}
        )
        updated = await db.reading_progress.find_one({"id": existing["id"]}, {"_id": 0})
        await db.users.update_one({"id": current_user["id"]}, {"$inc": {"total_words_read": progress.words_read}})
        return ReadingProgressResponse(**updated)
    else:
        progress_id = str(uuid.uuid4())
        progress_doc = {
            "id": progress_id,
            "user_id": current_user["id"],
            "book_id": progress.book_id,
            "chapter_id": progress.chapter_id,
            "sentence_id": progress.sentence_id,
            "last_read": now,
            "words_read": progress.words_read
        }
        await db.reading_progress.insert_one(progress_doc)
        await db.users.update_one({"id": current_user["id"]}, {"$inc": {"total_words_read": progress.words_read}})
        return ReadingProgressResponse(**progress_doc)

# ========================
# STATS
# ========================

@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    vocab_count = await db.saved_words.count_documents({"user_id": current_user["id"]})
    books_in_progress = await db.reading_progress.count_documents({"user_id": current_user["id"]})
    
    mastery_pipeline = [
        {"$match": {"user_id": current_user["id"]}},
        {"$group": {"_id": "$mastery_level", "count": {"$sum": 1}}}
    ]
    mastery_dist = await db.saved_words.aggregate(mastery_pipeline).to_list(10)
    
    return {
        "vocabulary_count": vocab_count,
        "books_in_progress": books_in_progress,
        "total_words_read": user.get("total_words_read", 0),
        "mastery_distribution": {str(m["_id"]): m["count"] for m in mastery_dist}
    }

# ========================
# ROOT
# ========================

@api_router.get("/")
async def root():
    return {"message": "Japanese Reading App API", "version": "3.0.0"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
