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
    translate_sentences_batch,
    translate_title,
    translate_author
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
    japanese_kanji: str
    japanese_hiragana: str
    japanese_katakana: str
    japanese_romaji: str
    english: str
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
    book_key: Optional[str] = None  # For predefined books
    gutenberg_id: Optional[int] = None  # For custom Gutenberg imports
    title: Optional[str] = None
    author: Optional[str] = None

class GutenbergSearchResult(BaseModel):
    gutenberg_id: int
    title: str
    author: str
    languages: List[str]
    download_count: int

# ========================
# AUTH HELPERS
# ========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "exp": expiration
    }
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

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[dict]:
    """Get user if authenticated, otherwise return None"""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except:
        return None

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
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        username=user_data.username,
        created_at=now,
        vocabulary_count=0,
        books_read=0,
        total_words_read=0
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        created_at=user["created_at"],
        vocabulary_count=user.get("vocabulary_count", 0),
        books_read=user.get("books_read", 0),
        total_words_read=user.get("total_words_read", 0)
    )
    return TokenResponse(access_token=token, user=user_response)

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
    limit: int = Query(50, ge=1, le=200)
):
    """Get sentences with pagination for large chapters"""
    sentences = await db.sentences.find(
        {"chapter_id": chapter_id},
        {"_id": 0}
    ).sort("order", 1).skip(skip).limit(limit).to_list(limit)
    return sentences

@api_router.get("/chapters/{chapter_id}/sentences/count")
async def get_sentences_count(chapter_id: str):
    """Get total sentence count for a chapter"""
    count = await db.sentences.count_documents({"chapter_id": chapter_id})
    return {"count": count, "chapter_id": chapter_id}

# ========================
# BOOK IMPORT ENDPOINTS
# ========================

@api_router.get("/books/available/list")
async def get_available_books():
    """Get list of predefined books available for import"""
    available = []
    for key, info in GUTENBERG_BOOKS.items():
        # Check if already imported
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
    """Search Project Gutenberg for books"""
    results = await search_gutenberg(query)
    return results

@api_router.post("/books/import")
async def import_book(request: ImportBookRequest, background_tasks: BackgroundTasks):
    """Start importing a book from Project Gutenberg"""
    
    # Determine which book to import
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
    
    # Check if already importing
    existing = await db.books.find_one({"id": book_id})
    if existing:
        if existing.get("import_status") == "completed":
            return {"message": "Book already imported", "book_id": book_id, "status": "completed"}
        elif existing.get("import_status") == "importing":
            return {"message": "Book import in progress", "book_id": book_id, "status": "importing"}
    
    # Create book record with importing status
    book_doc = {
        "id": book_id,
        "title": title,
        "title_jp": title,  # Will be updated by background task
        "author": author,
        "author_jp": author,  # Will be updated by background task
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
    
    if existing:
        await db.books.update_one({"id": book_id}, {"$set": book_doc})
    else:
        await db.books.insert_one(book_doc)
    
    # Start background import task
    background_tasks.add_task(process_book_import, book_id, gutenberg_id)
    
    return {
        "message": "Book import started",
        "book_id": book_id,
        "status": "importing"
    }

async def process_book_import(book_id: str, gutenberg_id: int):
    """Background task to process book import"""
    try:
        logger.info(f"Starting import for book {book_id} (Gutenberg ID: {gutenberg_id})")
        
        # Fetch book text from Gutenberg
        raw_text = await fetch_gutenberg_text(gutenberg_id)
        if not raw_text:
            await db.books.update_one(
                {"id": book_id},
                {"$set": {"import_status": "failed", "error": "Could not fetch book from Gutenberg"}}
            )
            return
        
        # Clean and process text
        clean_text = clean_gutenberg_text(raw_text)
        chapters = split_into_chapters(clean_text, book_id)
        
        logger.info(f"Found {len(chapters)} chapters for {book_id}")
        
        # Get book info for title translation
        book = await db.books.find_one({"id": book_id}, {"_id": 0})
        
        # Translate book title and author
        title_jp = await translate_title(book["title"])
        author_jp = await translate_author(book["author"])
        
        # Process each chapter
        total_sentences = 0
        chapter_docs = []
        
        for chapter in chapters:
            # Split chapter into sentences
            sentences = split_into_sentences(chapter['content'])
            
            if not sentences:
                continue
            
            # Translate chapter title
            chapter_title_jp = await translate_title(chapter['title'])
            
            chapter_doc = {
                "id": chapter['id'],
                "book_id": book_id,
                "chapter_number": chapter['chapter_number'],
                "title": chapter['title'],
                "title_jp": chapter_title_jp,
                "sentences_count": len(sentences)
            }
            chapter_docs.append(chapter_doc)
            
            # Translate sentences in batches
            logger.info(f"Translating {len(sentences)} sentences for chapter {chapter['chapter_number']}")
            translated_sentences = await translate_sentences_batch(sentences, batch_size=5)
            
            # Create sentence documents
            sentence_docs = []
            for i, trans in enumerate(translated_sentences):
                sentence_doc = {
                    "id": f"{chapter['id']}-s{i+1}",
                    "chapter_id": chapter['id'],
                    "order": i + 1,
                    "english": trans["english"],
                    "japanese_kanji": trans["japanese_kanji"],
                    "japanese_hiragana": trans["japanese_hiragana"],
                    "japanese_katakana": trans["japanese_katakana"],
                    "japanese_romaji": trans["japanese_romaji"],
                    "words": []  # Words can be extracted later or on-demand
                }
                sentence_docs.append(sentence_doc)
            
            # Insert sentences
            if sentence_docs:
                await db.sentences.insert_many(sentence_docs)
                total_sentences += len(sentence_docs)
            
            # Update progress
            await db.books.update_one(
                {"id": book_id},
                {"$set": {"sentences_count": total_sentences}}
            )
        
        # Insert chapters
        if chapter_docs:
            await db.chapters.insert_many(chapter_docs)
        
        # Update book with final status
        await db.books.update_one(
            {"id": book_id},
            {"$set": {
                "import_status": "completed",
                "title_jp": title_jp,
                "author_jp": author_jp,
                "description_jp": await translate_title(book.get("description", "")),
                "total_chapters": len(chapter_docs),
                "sentences_count": total_sentences
            }}
        )
        
        logger.info(f"Completed import for {book_id}: {len(chapter_docs)} chapters, {total_sentences} sentences")
        
    except Exception as e:
        logger.error(f"Book import failed for {book_id}: {e}")
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
    """Upload a book file (txt format) for import"""
    if not file.filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")
    
    # Read file content
    content = await file.read()
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        text = content.decode('latin-1')
    
    # Generate book ID
    book_id = f"upload-{str(uuid.uuid4())[:8]}"
    
    # Create book record
    book_doc = {
        "id": book_id,
        "title": title,
        "title_jp": title,
        "author": author,
        "author_jp": author,
        "cover_image": get_book_cover("default"),
        "description": f"Uploaded book: {title}",
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
    
    # Process in background
    background_tasks.add_task(process_uploaded_book, book_id, text, title, author)
    
    return {
        "message": "Book upload started",
        "book_id": book_id,
        "status": "importing"
    }

async def process_uploaded_book(book_id: str, text: str, title: str, author: str):
    """Process uploaded book text"""
    try:
        # Clean and process
        clean_text = clean_gutenberg_text(text)
        chapters = split_into_chapters(clean_text, book_id)
        
        # Translate metadata
        title_jp = await translate_title(title)
        author_jp = await translate_author(author)
        
        total_sentences = 0
        chapter_docs = []
        
        for chapter in chapters:
            sentences = split_into_sentences(chapter['content'])
            if not sentences:
                continue
            
            chapter_title_jp = await translate_title(chapter['title'])
            
            chapter_doc = {
                "id": chapter['id'],
                "book_id": book_id,
                "chapter_number": chapter['chapter_number'],
                "title": chapter['title'],
                "title_jp": chapter_title_jp,
                "sentences_count": len(sentences)
            }
            chapter_docs.append(chapter_doc)
            
            translated = await translate_sentences_batch(sentences, batch_size=5)
            
            sentence_docs = []
            for i, trans in enumerate(translated):
                sentence_docs.append({
                    "id": f"{chapter['id']}-s{i+1}",
                    "chapter_id": chapter['id'],
                    "order": i + 1,
                    "english": trans["english"],
                    "japanese_kanji": trans["japanese_kanji"],
                    "japanese_hiragana": trans["japanese_hiragana"],
                    "japanese_katakana": trans["japanese_katakana"],
                    "japanese_romaji": trans["japanese_romaji"],
                    "words": []
                })
            
            if sentence_docs:
                await db.sentences.insert_many(sentence_docs)
                total_sentences += len(sentence_docs)
        
        if chapter_docs:
            await db.chapters.insert_many(chapter_docs)
        
        await db.books.update_one(
            {"id": book_id},
            {"$set": {
                "import_status": "completed",
                "title_jp": title_jp,
                "author_jp": author_jp,
                "total_chapters": len(chapter_docs),
                "sentences_count": total_sentences
            }}
        )
        
    except Exception as e:
        logger.error(f"Upload processing failed: {e}")
        await db.books.update_one(
            {"id": book_id},
            {"$set": {"import_status": "failed", "error": str(e)}}
        )

@api_router.get("/books/{book_id}/status")
async def get_book_import_status(book_id: str):
    """Get import status for a book"""
    book = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    return {
        "book_id": book_id,
        "status": book.get("import_status", "unknown"),
        "total_chapters": book.get("total_chapters", 0),
        "sentences_count": book.get("sentences_count", 0),
        "error": book.get("error")
    }

@api_router.delete("/books/{book_id}")
async def delete_book(book_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a book and all its content"""
    book = await db.books.find_one({"id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Delete all related data
    await db.sentences.delete_many({"chapter_id": {"$regex": f"^{book_id}-"}})
    await db.chapters.delete_many({"book_id": book_id})
    await db.books.delete_one({"id": book_id})
    
    return {"message": "Book deleted successfully"}

# ========================
# DICTIONARY ENDPOINT
# ========================

@api_router.get("/dictionary/{word}", response_model=WordDefinition)
async def lookup_word(word: str):
    """Look up a Japanese word using Jisho API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://jisho.org/api/v1/search/words",
                params={"keyword": word},
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("data") and len(data["data"]) > 0:
                    entry = data["data"][0]
                    japanese = entry.get("japanese", [{}])[0]
                    senses = entry.get("senses", [{}])
                    
                    return WordDefinition(
                        word=japanese.get("word", word),
                        reading=japanese.get("reading", ""),
                        romaji=japanese.get("reading", ""),
                        meanings=[m for sense in senses for m in sense.get("english_definitions", [])[:3]],
                        parts_of_speech=[p for sense in senses for p in sense.get("parts_of_speech", [])[:2]],
                        example_sentence=None,
                        example_translation=None
                    )
    except Exception as e:
        logger.warning(f"Jisho API failed: {e}")
    
    # Fallback
    local_word = await db.dictionary.find_one({"word": word}, {"_id": 0})
    if local_word:
        return WordDefinition(**local_word)
    
    return WordDefinition(
        word=word,
        reading=word,
        romaji=word,
        meanings=["Definition not found"],
        parts_of_speech=["unknown"]
    )

# ========================
# VOCABULARY ENDPOINTS
# ========================

@api_router.get("/vocabulary", response_model=List[SavedWordResponse])
async def get_vocabulary(current_user: dict = Depends(get_current_user)):
    words = await db.saved_words.find(
        {"user_id": current_user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return words

@api_router.post("/vocabulary", response_model=SavedWordResponse)
async def save_word(word_data: SaveWordRequest, current_user: dict = Depends(get_current_user)):
    existing = await db.saved_words.find_one({
        "user_id": current_user["id"],
        "word": word_data.word
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
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"vocabulary_count": 1}}
    )
    
    return SavedWordResponse(**word_doc)

@api_router.put("/vocabulary/{word_id}", response_model=SavedWordResponse)
async def update_saved_word(
    word_id: str, 
    update_data: UpdateSavedWordRequest,
    current_user: dict = Depends(get_current_user)
):
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
    
    word = await db.saved_words.find_one(
        {"id": word_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    return SavedWordResponse(**word)

@api_router.delete("/vocabulary/{word_id}")
async def delete_saved_word(word_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.saved_words.delete_one({"id": word_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Word not found")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"vocabulary_count": -1}}
    )
    return {"message": "Word deleted"}

# ========================
# FLASHCARD REVIEW
# ========================

@api_router.get("/vocabulary/review", response_model=List[SavedWordResponse])
async def get_review_words(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    words = await db.saved_words.find(
        {
            "user_id": current_user["id"],
            "next_review": {"$lte": now}
        },
        {"_id": 0}
    ).sort("next_review", 1).to_list(20)
    return words

@api_router.post("/vocabulary/review")
async def submit_review(review: FlashcardReviewRequest, current_user: dict = Depends(get_current_user)):
    word = await db.saved_words.find_one(
        {"id": review.word_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    
    current_level = word.get("mastery_level", 0)
    if review.correct:
        new_level = min(current_level + 1, 5)
        days_until_review = 2 ** new_level
    else:
        new_level = max(current_level - 1, 0)
        days_until_review = 1
    
    next_review = datetime.now(timezone.utc) + timedelta(days=days_until_review)
    
    await db.saved_words.update_one(
        {"id": review.word_id, "user_id": current_user["id"]},
        {
            "$set": {
                "mastery_level": new_level,
                "next_review": next_review.isoformat()
            },
            "$inc": {"times_reviewed": 1}
        }
    )
    
    return {"message": "Review recorded", "new_level": new_level, "next_review": next_review.isoformat()}

# ========================
# BOOKMARKS
# ========================

@api_router.get("/bookmarks", response_model=List[BookmarkResponse])
async def get_bookmarks(current_user: dict = Depends(get_current_user)):
    bookmarks = await db.bookmarks.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
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
    progress = await db.reading_progress.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("last_read", -1).to_list(100)
    return progress

@api_router.get("/progress/{book_id}", response_model=Optional[ReadingProgressResponse])
async def get_progress(book_id: str, current_user: dict = Depends(get_current_user)):
    progress = await db.reading_progress.find_one(
        {"user_id": current_user["id"], "book_id": book_id},
        {"_id": 0}
    )
    return progress

@api_router.post("/progress", response_model=ReadingProgressResponse)
async def update_progress(progress: ReadingProgressRequest, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    existing = await db.reading_progress.find_one({
        "user_id": current_user["id"],
        "book_id": progress.book_id
    })
    
    if existing:
        await db.reading_progress.update_one(
            {"id": existing["id"]},
            {
                "$set": {
                    "chapter_id": progress.chapter_id,
                    "sentence_id": progress.sentence_id,
                    "last_read": now
                },
                "$inc": {"words_read": progress.words_read}
            }
        )
        updated = await db.reading_progress.find_one({"id": existing["id"]}, {"_id": 0})
        
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$inc": {"total_words_read": progress.words_read}}
        )
        
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
        
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$inc": {"total_words_read": progress.words_read}}
        )
        
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
# ROOT ENDPOINT
# ========================

@api_router.get("/")
async def root():
    return {"message": "Japanese Reading App API", "version": "2.0.0"}

# Include the router in the main app
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
