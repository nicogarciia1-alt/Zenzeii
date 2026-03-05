from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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

class ChapterResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    book_id: str
    chapter_number: int
    title: str
    title_jp: str

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
    words: List[Dict[str, Any]]

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

# ========================
# AUTH ENDPOINTS
# ========================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
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
    chapters = await db.chapters.find({"book_id": book_id}, {"_id": 0}).sort("chapter_number", 1).to_list(100)
    return chapters

@api_router.get("/chapters/{chapter_id}", response_model=ChapterResponse)
async def get_chapter(chapter_id: str):
    chapter = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter

@api_router.get("/chapters/{chapter_id}/sentences", response_model=List[SentenceResponse])
async def get_sentences(chapter_id: str):
    sentences = await db.sentences.find({"chapter_id": chapter_id}, {"_id": 0}).sort("order", 1).to_list(500)
    return sentences

# ========================
# DICTIONARY ENDPOINT
# ========================

@api_router.get("/dictionary/{word}", response_model=WordDefinition)
async def lookup_word(word: str):
    # Try Jisho API first
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
                        romaji=japanese.get("reading", ""),  # Would need proper conversion
                        meanings=[m for sense in senses for m in sense.get("english_definitions", [])[:3]],
                        parts_of_speech=[p for sense in senses for p in sense.get("parts_of_speech", [])[:2]],
                        example_sentence=None,
                        example_translation=None
                    )
    except Exception as e:
        logger.warning(f"Jisho API failed: {e}")
    
    # Fallback to local dictionary
    local_word = await db.dictionary.find_one({"word": word}, {"_id": 0})
    if local_word:
        return WordDefinition(**local_word)
    
    # Return basic response if nothing found
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
    # Check if word already saved
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
    
    # Update user vocabulary count
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
    
    # Spaced repetition logic
    current_level = word.get("mastery_level", 0)
    if review.correct:
        new_level = min(current_level + 1, 5)
        # Increase interval exponentially
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
        
        # Update user total words read
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
    
    # Get mastery distribution
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
# SEED DATA ENDPOINT (for development)
# ========================

@api_router.post("/seed")
async def seed_database():
    # Check if already seeded
    existing_books = await db.books.count_documents({})
    if existing_books > 0:
        return {"message": "Database already seeded", "books_count": existing_books}
    
    # Seed books with Japanese translations
    books_data = [
        {
            "id": "alice-wonderland",
            "title": "Alice in Wonderland",
            "title_jp": "不思議の国のアリス",
            "author": "Lewis Carroll",
            "author_jp": "ルイス・キャロル",
            "cover_image": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400",
            "description": "Follow Alice down the rabbit hole into a world of wonder and curiosity.",
            "description_jp": "アリスと一緒にウサギの穴を降りて、不思議と好奇心の世界へ。",
            "total_chapters": 3,
            "difficulty": "intermediate",
            "genre": "fantasy"
        },
        {
            "id": "sherlock-holmes",
            "title": "A Study in Scarlet",
            "title_jp": "緋色の研究",
            "author": "Arthur Conan Doyle",
            "author_jp": "アーサー・コナン・ドイル",
            "cover_image": "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=400",
            "description": "The first appearance of the legendary detective Sherlock Holmes.",
            "description_jp": "伝説の探偵シャーロック・ホームズの初登場。",
            "total_chapters": 2,
            "difficulty": "advanced",
            "genre": "mystery"
        },
        {
            "id": "pride-prejudice",
            "title": "Pride and Prejudice",
            "title_jp": "高慢と偏見",
            "author": "Jane Austen",
            "author_jp": "ジェーン・オースティン",
            "cover_image": "https://images.unsplash.com/photo-1474932430478-367dbb6832c1?w=400",
            "description": "A classic tale of love, family, and social standing in Regency England.",
            "description_jp": "リージェンシー時代のイギリスを舞台にした、愛と家族と社会的地位の古典的な物語。",
            "total_chapters": 2,
            "difficulty": "intermediate",
            "genre": "romance"
        },
        {
            "id": "anna-karenina",
            "title": "Anna Karenina",
            "title_jp": "アンナ・カレーニナ",
            "author": "Leo Tolstoy",
            "author_jp": "レフ・トルストイ",
            "cover_image": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400",
            "description": "A timeless story of passion, betrayal, and the search for meaning.",
            "description_jp": "情熱、裏切り、そして意味の探求についての永遠の物語。",
            "total_chapters": 2,
            "difficulty": "advanced",
            "genre": "literary"
        }
    ]
    
    await db.books.insert_many(books_data)
    
    # Seed chapters and sentences for Alice in Wonderland
    alice_chapters = [
        {
            "id": "alice-ch1",
            "book_id": "alice-wonderland",
            "chapter_number": 1,
            "title": "Down the Rabbit Hole",
            "title_jp": "ウサギの穴に落ちて"
        },
        {
            "id": "alice-ch2",
            "book_id": "alice-wonderland",
            "chapter_number": 2,
            "title": "The Pool of Tears",
            "title_jp": "涙の池"
        },
        {
            "id": "alice-ch3",
            "book_id": "alice-wonderland",
            "chapter_number": 3,
            "title": "A Mad Tea-Party",
            "title_jp": "狂ったお茶会"
        }
    ]
    
    alice_sentences_ch1 = [
        {
            "id": "alice-ch1-s1",
            "chapter_id": "alice-ch1",
            "order": 1,
            "japanese_kanji": "アリスは姉のそばに座って、何もすることがなくて退屈していました。",
            "japanese_hiragana": "ありすはあねのそばにすわって、なにもすることがなくてたいくつしていました。",
            "japanese_katakana": "アリスハアネノソバニスワッテ、ナニモスルコトガナクテタイクツシテイマシタ。",
            "japanese_romaji": "Arisu wa ane no soba ni suwatte, nanimo suru koto ga nakute taikutsu shite imashita.",
            "english": "Alice was beginning to get very tired of sitting by her sister and having nothing to do.",
            "words": [
                {"word": "アリス", "reading": "ありす", "romaji": "arisu", "meaning": "Alice"},
                {"word": "姉", "reading": "あね", "romaji": "ane", "meaning": "older sister"},
                {"word": "座る", "reading": "すわる", "romaji": "suwaru", "meaning": "to sit"},
                {"word": "退屈", "reading": "たいくつ", "romaji": "taikutsu", "meaning": "boredom"}
            ]
        },
        {
            "id": "alice-ch1-s2",
            "chapter_id": "alice-ch1",
            "order": 2,
            "japanese_kanji": "一、二度、姉が読んでいる本をのぞいてみましたが、絵も会話もありませんでした。",
            "japanese_hiragana": "いち、にど、あねがよんでいるほんをのぞいてみましたが、えもかいわもありませんでした。",
            "japanese_katakana": "イチ、ニド、アネガヨンデイルホンヲノゾイテミマシタガ、エモカイワモアリマセンデシタ。",
            "japanese_romaji": "Ichi, nido, ane ga yonde iru hon wo nozoite mimashita ga, e mo kaiwa mo arimasen deshita.",
            "english": "Once or twice she peeped into the book her sister was reading, but it had no pictures or conversations in it.",
            "words": [
                {"word": "本", "reading": "ほん", "romaji": "hon", "meaning": "book"},
                {"word": "絵", "reading": "え", "romaji": "e", "meaning": "picture"},
                {"word": "会話", "reading": "かいわ", "romaji": "kaiwa", "meaning": "conversation"},
                {"word": "読む", "reading": "よむ", "romaji": "yomu", "meaning": "to read"}
            ]
        },
        {
            "id": "alice-ch1-s3",
            "chapter_id": "alice-ch1",
            "order": 3,
            "japanese_kanji": "「絵も会話もない本に何の意味があるの？」とアリスは思いました。",
            "japanese_hiragana": "「えもかいわもないほんになんのいみがあるの？」とありすはおもいました。",
            "japanese_katakana": "「エモカイワモナイホンニナンノイミガアルノ？」トアリスハオモイマシタ。",
            "japanese_romaji": "\"E mo kaiwa mo nai hon ni nan no imi ga aru no?\" to Arisu wa omoimashita.",
            "english": "\"And what is the use of a book,\" thought Alice, \"without pictures or conversations?\"",
            "words": [
                {"word": "意味", "reading": "いみ", "romaji": "imi", "meaning": "meaning"},
                {"word": "思う", "reading": "おもう", "romaji": "omou", "meaning": "to think"}
            ]
        },
        {
            "id": "alice-ch1-s4",
            "chapter_id": "alice-ch1",
            "order": 4,
            "japanese_kanji": "突然、ピンクの目をした白いウサギが近くを走り過ぎました。",
            "japanese_hiragana": "とつぜん、ぴんくのめをしたしろいうさぎがちかくをはしりすぎました。",
            "japanese_katakana": "トツゼン、ピンクノメヲシタシロイウサギガチカクヲハシリスギマシタ。",
            "japanese_romaji": "Totsuzen, pinku no me wo shita shiroi usagi ga chikaku wo hashiri sugimashita.",
            "english": "Suddenly a White Rabbit with pink eyes ran close by her.",
            "words": [
                {"word": "突然", "reading": "とつぜん", "romaji": "totsuzen", "meaning": "suddenly"},
                {"word": "白い", "reading": "しろい", "romaji": "shiroi", "meaning": "white"},
                {"word": "ウサギ", "reading": "うさぎ", "romaji": "usagi", "meaning": "rabbit"},
                {"word": "走る", "reading": "はしる", "romaji": "hashiru", "meaning": "to run"}
            ]
        },
        {
            "id": "alice-ch1-s5",
            "chapter_id": "alice-ch1",
            "order": 5,
            "japanese_kanji": "ウサギは「大変だ！大変だ！遅刻しちゃう！」と言いました。",
            "japanese_hiragana": "うさぎは「たいへんだ！たいへんだ！ちこくしちゃう！」といいました。",
            "japanese_katakana": "ウサギハ「タイヘンダ！タイヘンダ！チコクシチャウ！」トイイマシタ。",
            "japanese_romaji": "Usagi wa \"Taihen da! Taihen da! Chikoku shichau!\" to iimashita.",
            "english": "The Rabbit said, \"Oh dear! Oh dear! I shall be too late!\"",
            "words": [
                {"word": "大変", "reading": "たいへん", "romaji": "taihen", "meaning": "terrible, serious"},
                {"word": "遅刻", "reading": "ちこく", "romaji": "chikoku", "meaning": "being late"},
                {"word": "言う", "reading": "いう", "romaji": "iu", "meaning": "to say"}
            ]
        },
        {
            "id": "alice-ch1-s6",
            "chapter_id": "alice-ch1",
            "order": 6,
            "japanese_kanji": "アリスはウサギの後を追って、大きな穴に飛び込みました。",
            "japanese_hiragana": "ありすはうさぎのあとをおって、おおきなあなにとびこみました。",
            "japanese_katakana": "アリスハウサギノアトヲオッテ、オオキナアナニトビコミマシタ。",
            "japanese_romaji": "Arisu wa usagi no ato wo otte, ookina ana ni tobikomi mashita.",
            "english": "Alice followed the Rabbit and jumped into a large hole.",
            "words": [
                {"word": "後", "reading": "あと", "romaji": "ato", "meaning": "after, behind"},
                {"word": "追う", "reading": "おう", "romaji": "ou", "meaning": "to chase"},
                {"word": "大きな", "reading": "おおきな", "romaji": "ookina", "meaning": "large, big"},
                {"word": "穴", "reading": "あな", "romaji": "ana", "meaning": "hole"},
                {"word": "飛び込む", "reading": "とびこむ", "romaji": "tobikomu", "meaning": "to jump into"}
            ]
        },
        {
            "id": "alice-ch1-s7",
            "chapter_id": "alice-ch1",
            "order": 7,
            "japanese_kanji": "穴はとても深くて、アリスは長い間落ち続けました。",
            "japanese_hiragana": "あなはとてもふかくて、ありすはながいあいだおちつづけました。",
            "japanese_katakana": "アナハトテモフカクテ、アリスハナガイアイダオチツヅケマシタ。",
            "japanese_romaji": "Ana wa totemo fukakute, Arisu wa nagai aida ochi tsuzukemashita.",
            "english": "The hole was very deep, and Alice kept falling for a long time.",
            "words": [
                {"word": "深い", "reading": "ふかい", "romaji": "fukai", "meaning": "deep"},
                {"word": "長い", "reading": "ながい", "romaji": "nagai", "meaning": "long"},
                {"word": "間", "reading": "あいだ", "romaji": "aida", "meaning": "interval, period"},
                {"word": "落ちる", "reading": "おちる", "romaji": "ochiru", "meaning": "to fall"},
                {"word": "続ける", "reading": "つづける", "romaji": "tsuzukeru", "meaning": "to continue"}
            ]
        },
        {
            "id": "alice-ch1-s8",
            "chapter_id": "alice-ch1",
            "order": 8,
            "japanese_kanji": "壁には本棚や地図や絵がたくさんありました。",
            "japanese_hiragana": "かべにはほんだなやちずやえがたくさんありました。",
            "japanese_katakana": "カベニハホンダナヤチズヤエガタクサンアリマシタ。",
            "japanese_romaji": "Kabe ni wa hondana ya chizu ya e ga takusan arimashita.",
            "english": "The walls were lined with bookshelves, maps, and pictures.",
            "words": [
                {"word": "壁", "reading": "かべ", "romaji": "kabe", "meaning": "wall"},
                {"word": "本棚", "reading": "ほんだな", "romaji": "hondana", "meaning": "bookshelf"},
                {"word": "地図", "reading": "ちず", "romaji": "chizu", "meaning": "map"},
                {"word": "たくさん", "reading": "たくさん", "romaji": "takusan", "meaning": "many, a lot"}
            ]
        }
    ]
    
    alice_sentences_ch2 = [
        {
            "id": "alice-ch2-s1",
            "chapter_id": "alice-ch2",
            "order": 1,
            "japanese_kanji": "アリスは不思議な部屋に着きました。",
            "japanese_hiragana": "ありすはふしぎなへやにつきました。",
            "japanese_katakana": "アリスハフシギナヘヤニツキマシタ。",
            "japanese_romaji": "Arisu wa fushigi na heya ni tsukimashita.",
            "english": "Alice arrived in a strange room.",
            "words": [
                {"word": "不思議", "reading": "ふしぎ", "romaji": "fushigi", "meaning": "mysterious, strange"},
                {"word": "部屋", "reading": "へや", "romaji": "heya", "meaning": "room"},
                {"word": "着く", "reading": "つく", "romaji": "tsuku", "meaning": "to arrive"}
            ]
        },
        {
            "id": "alice-ch2-s2",
            "chapter_id": "alice-ch2",
            "order": 2,
            "japanese_kanji": "テーブルの上に小さな瓶がありました。",
            "japanese_hiragana": "てーぶるのうえにちいさなびんがありました。",
            "japanese_katakana": "テーブルノウエニチイサナビンガアリマシタ。",
            "japanese_romaji": "Teeburu no ue ni chiisana bin ga arimashita.",
            "english": "On the table there was a small bottle.",
            "words": [
                {"word": "テーブル", "reading": "てーぶる", "romaji": "teeburu", "meaning": "table"},
                {"word": "上", "reading": "うえ", "romaji": "ue", "meaning": "on, above"},
                {"word": "小さな", "reading": "ちいさな", "romaji": "chiisana", "meaning": "small"},
                {"word": "瓶", "reading": "びん", "romaji": "bin", "meaning": "bottle"}
            ]
        },
        {
            "id": "alice-ch2-s3",
            "chapter_id": "alice-ch2",
            "order": 3,
            "japanese_kanji": "瓶には「私を飲んで」と書いてありました。",
            "japanese_hiragana": "びんには「わたしをのんで」とかいてありました。",
            "japanese_katakana": "ビンニハ「ワタシヲノンデ」トカイテアリマシタ。",
            "japanese_romaji": "Bin ni wa \"watashi wo nonde\" to kaite arimashita.",
            "english": "The bottle had a label that said \"Drink Me.\"",
            "words": [
                {"word": "私", "reading": "わたし", "romaji": "watashi", "meaning": "I, me"},
                {"word": "飲む", "reading": "のむ", "romaji": "nomu", "meaning": "to drink"},
                {"word": "書く", "reading": "かく", "romaji": "kaku", "meaning": "to write"}
            ]
        },
        {
            "id": "alice-ch2-s4",
            "chapter_id": "alice-ch2",
            "order": 4,
            "japanese_kanji": "アリスはその液体を飲みました。",
            "japanese_hiragana": "ありすはそのえきたいをのみました。",
            "japanese_katakana": "アリスハソノエキタイヲノミマシタ。",
            "japanese_romaji": "Arisu wa sono ekitai wo nomimashita.",
            "english": "Alice drank the liquid.",
            "words": [
                {"word": "液体", "reading": "えきたい", "romaji": "ekitai", "meaning": "liquid"}
            ]
        },
        {
            "id": "alice-ch2-s5",
            "chapter_id": "alice-ch2",
            "order": 5,
            "japanese_kanji": "すると、アリスはどんどん小さくなりました。",
            "japanese_hiragana": "すると、ありすはどんどんちいさくなりました。",
            "japanese_katakana": "スルト、アリスハドンドンチイサクナリマシタ。",
            "japanese_romaji": "Suru to, Arisu wa dondon chiisaku narimashita.",
            "english": "Then, Alice became smaller and smaller.",
            "words": [
                {"word": "どんどん", "reading": "どんどん", "romaji": "dondon", "meaning": "rapidly, steadily"},
                {"word": "小さい", "reading": "ちいさい", "romaji": "chiisai", "meaning": "small"},
                {"word": "なる", "reading": "なる", "romaji": "naru", "meaning": "to become"}
            ]
        }
    ]
    
    # Sherlock Holmes chapters
    sherlock_chapters = [
        {
            "id": "sherlock-ch1",
            "book_id": "sherlock-holmes",
            "chapter_number": 1,
            "title": "Mr. Sherlock Holmes",
            "title_jp": "シャーロック・ホームズ氏"
        },
        {
            "id": "sherlock-ch2",
            "book_id": "sherlock-holmes",
            "chapter_number": 2,
            "title": "The Science of Deduction",
            "title_jp": "演繹の科学"
        }
    ]
    
    sherlock_sentences_ch1 = [
        {
            "id": "sherlock-ch1-s1",
            "chapter_id": "sherlock-ch1",
            "order": 1,
            "japanese_kanji": "私がホームズと初めて会ったのは一八七八年のことでした。",
            "japanese_hiragana": "わたしがほーむずとはじめてあったのはいちはちななはちねんのことでした。",
            "japanese_katakana": "ワタシガホームズトハジメテアッタノハイチハチナナハチネンノコトデシタ。",
            "japanese_romaji": "Watashi ga Hoomzu to hajimete atta no wa ichi hachi nana hachi nen no koto deshita.",
            "english": "I first met Holmes in the year 1878.",
            "words": [
                {"word": "初めて", "reading": "はじめて", "romaji": "hajimete", "meaning": "for the first time"},
                {"word": "会う", "reading": "あう", "romaji": "au", "meaning": "to meet"},
                {"word": "年", "reading": "ねん", "romaji": "nen", "meaning": "year"}
            ]
        },
        {
            "id": "sherlock-ch1-s2",
            "chapter_id": "sherlock-ch1",
            "order": 2,
            "japanese_kanji": "彼はとても背が高く、痩せていました。",
            "japanese_hiragana": "かれはとてもせがたかく、やせていました。",
            "japanese_katakana": "カレハトテモセガタカク、ヤセテイマシタ。",
            "japanese_romaji": "Kare wa totemo se ga takaku, yasete imashita.",
            "english": "He was very tall and thin.",
            "words": [
                {"word": "彼", "reading": "かれ", "romaji": "kare", "meaning": "he"},
                {"word": "背", "reading": "せ", "romaji": "se", "meaning": "height, back"},
                {"word": "高い", "reading": "たかい", "romaji": "takai", "meaning": "tall, high"},
                {"word": "痩せる", "reading": "やせる", "romaji": "yaseru", "meaning": "to be thin"}
            ]
        },
        {
            "id": "sherlock-ch1-s3",
            "chapter_id": "sherlock-ch1",
            "order": 3,
            "japanese_kanji": "ホームズは鷹のように鋭い目をしていました。",
            "japanese_hiragana": "ほーむずはたかのようにするどいめをしていました。",
            "japanese_katakana": "ホームズハタカノヨウニスルドイメヲシテイマシタ。",
            "japanese_romaji": "Hoomzu wa taka no you ni surudoi me wo shite imashita.",
            "english": "Holmes had eyes as sharp as a hawk.",
            "words": [
                {"word": "鷹", "reading": "たか", "romaji": "taka", "meaning": "hawk"},
                {"word": "鋭い", "reading": "するどい", "romaji": "surudoi", "meaning": "sharp"},
                {"word": "目", "reading": "め", "romaji": "me", "meaning": "eye"}
            ]
        },
        {
            "id": "sherlock-ch1-s4",
            "chapter_id": "sherlock-ch1",
            "order": 4,
            "japanese_kanji": "私たちはベーカー街221Bで一緒に住むことにしました。",
            "japanese_hiragana": "わたしたちはべーかーがいにひゃくにじゅういちびーでいっしょにすむことにしました。",
            "japanese_katakana": "ワタシタチハベーカーガイニヒャクニジュウイチビーデイッショニスムコトニシマシタ。",
            "japanese_romaji": "Watashitachi wa Beekaa gai 221B de issho ni sumu koto ni shimashita.",
            "english": "We decided to live together at 221B Baker Street.",
            "words": [
                {"word": "一緒に", "reading": "いっしょに", "romaji": "issho ni", "meaning": "together"},
                {"word": "住む", "reading": "すむ", "romaji": "sumu", "meaning": "to live, reside"}
            ]
        }
    ]
    
    # Pride and Prejudice chapters
    pride_chapters = [
        {
            "id": "pride-ch1",
            "book_id": "pride-prejudice",
            "chapter_number": 1,
            "title": "A Single Man in Possession",
            "title_jp": "独身の男性"
        },
        {
            "id": "pride-ch2",
            "book_id": "pride-prejudice",
            "chapter_number": 2,
            "title": "Mr. Bingley's Visit",
            "title_jp": "ビングリー氏の訪問"
        }
    ]
    
    pride_sentences_ch1 = [
        {
            "id": "pride-ch1-s1",
            "chapter_id": "pride-ch1",
            "order": 1,
            "japanese_kanji": "裕福な独身男性は妻を必要としているというのは、世間一般に認められた真理です。",
            "japanese_hiragana": "ゆうふくなどくしんだんせいはつまをひつようとしているというのは、せけんいっぱんにみとめられたしんりです。",
            "japanese_katakana": "ユウフクナドクシンダンセイハツマヲヒツヨウトシテイルトイウノハ、セケンイッパンニミトメラレタシンリデス。",
            "japanese_romaji": "Yuufuku na dokushin dansei wa tsuma wo hitsuyou to shite iru to iu no wa, seken ippan ni mitomerareta shinri desu.",
            "english": "It is a truth universally acknowledged that a single man in possession of a good fortune must be in want of a wife.",
            "words": [
                {"word": "裕福", "reading": "ゆうふく", "romaji": "yuufuku", "meaning": "wealthy"},
                {"word": "独身", "reading": "どくしん", "romaji": "dokushin", "meaning": "single, unmarried"},
                {"word": "男性", "reading": "だんせい", "romaji": "dansei", "meaning": "man, male"},
                {"word": "妻", "reading": "つま", "romaji": "tsuma", "meaning": "wife"},
                {"word": "必要", "reading": "ひつよう", "romaji": "hitsuyou", "meaning": "necessary"},
                {"word": "真理", "reading": "しんり", "romaji": "shinri", "meaning": "truth"}
            ]
        },
        {
            "id": "pride-ch1-s2",
            "chapter_id": "pride-ch1",
            "order": 2,
            "japanese_kanji": "「ねえ、ベネットさん」と彼の妻が言いました。",
            "japanese_hiragana": "「ねえ、べねっとさん」とかれのつまがいいました。",
            "japanese_katakana": "「ネエ、ベネットサン」トカレノツマガイイマシタ。",
            "japanese_romaji": "\"Nee, Benetto-san\" to kare no tsuma ga iimashita.",
            "english": "\"My dear Mr. Bennet,\" said his wife.",
            "words": [
                {"word": "言う", "reading": "いう", "romaji": "iu", "meaning": "to say"}
            ]
        },
        {
            "id": "pride-ch1-s3",
            "chapter_id": "pride-ch1",
            "order": 3,
            "japanese_kanji": "「ネザーフィールドがついに借り手を見つけたと聞きましたか？」",
            "japanese_hiragana": "「ねざーふぃーるどがついにかりてをみつけたとききましたか？」",
            "japanese_katakana": "「ネザーフィールドガツイニカリテヲミツケタトキキマシタカ？」",
            "japanese_romaji": "\"Nezaafiirudo ga tsuini karite wo mitsuketa to kikimashita ka?\"",
            "english": "\"Have you heard that Netherfield Park is let at last?\"",
            "words": [
                {"word": "ついに", "reading": "ついに", "romaji": "tsuini", "meaning": "finally, at last"},
                {"word": "借り手", "reading": "かりて", "romaji": "karite", "meaning": "renter, tenant"},
                {"word": "見つける", "reading": "みつける", "romaji": "mitsukeru", "meaning": "to find"},
                {"word": "聞く", "reading": "きく", "romaji": "kiku", "meaning": "to hear, listen"}
            ]
        },
        {
            "id": "pride-ch1-s4",
            "chapter_id": "pride-ch1",
            "order": 4,
            "japanese_kanji": "ベネット氏は新聞を読みながら、妻の話を聞いていないふりをしました。",
            "japanese_hiragana": "べねっとしはしんぶんをよみながら、つまのはなしをきいていないふりをしました。",
            "japanese_katakana": "ベネットシハシンブンヲヨミナガラ、ツマノハナシヲキイテイナイフリヲシマシタ。",
            "japanese_romaji": "Benetto-shi wa shinbun wo yomi nagara, tsuma no hanashi wo kiite inai furi wo shimashita.",
            "english": "Mr. Bennet pretended not to listen to his wife while reading his newspaper.",
            "words": [
                {"word": "新聞", "reading": "しんぶん", "romaji": "shinbun", "meaning": "newspaper"},
                {"word": "話", "reading": "はなし", "romaji": "hanashi", "meaning": "talk, story"},
                {"word": "ふり", "reading": "ふり", "romaji": "furi", "meaning": "pretense"}
            ]
        }
    ]
    
    # Anna Karenina chapters
    anna_chapters = [
        {
            "id": "anna-ch1",
            "book_id": "anna-karenina",
            "chapter_number": 1,
            "title": "Happy and Unhappy Families",
            "title_jp": "幸福と不幸な家族"
        },
        {
            "id": "anna-ch2",
            "book_id": "anna-karenina",
            "chapter_number": 2,
            "title": "The Oblonskys",
            "title_jp": "オブロンスキー家"
        }
    ]
    
    anna_sentences_ch1 = [
        {
            "id": "anna-ch1-s1",
            "chapter_id": "anna-ch1",
            "order": 1,
            "japanese_kanji": "幸福な家庭はどれも似ているが、不幸な家庭はそれぞれ異なる不幸を抱えている。",
            "japanese_hiragana": "こうふくなかていはどれもにているが、ふこうなかていはそれぞれことなるふこうをかかえている。",
            "japanese_katakana": "コウフクナカテイハドレモニテイルガ、フコウナカテイハソレゾレコトナルフコウヲカカエテイル。",
            "japanese_romaji": "Koufuku na katei wa dore mo nite iru ga, fukou na katei wa sorezore kotonaru fukou wo kakaete iru.",
            "english": "Happy families are all alike; every unhappy family is unhappy in its own way.",
            "words": [
                {"word": "幸福", "reading": "こうふく", "romaji": "koufuku", "meaning": "happiness"},
                {"word": "家庭", "reading": "かてい", "romaji": "katei", "meaning": "family, household"},
                {"word": "似ている", "reading": "にている", "romaji": "nite iru", "meaning": "to be similar"},
                {"word": "不幸", "reading": "ふこう", "romaji": "fukou", "meaning": "unhappiness, misfortune"},
                {"word": "異なる", "reading": "ことなる", "romaji": "kotonaru", "meaning": "to differ"},
                {"word": "抱える", "reading": "かかえる", "romaji": "kakaeru", "meaning": "to hold, carry"}
            ]
        },
        {
            "id": "anna-ch1-s2",
            "chapter_id": "anna-ch1",
            "order": 2,
            "japanese_kanji": "オブロンスキー家では、すべてが混乱していました。",
            "japanese_hiragana": "おぶろんすきーけでは、すべてがこんらんしていました。",
            "japanese_katakana": "オブロンスキーケデハ、スベテガコンランシテイマシタ。",
            "japanese_romaji": "Oburonskii-ke de wa, subete ga konran shite imashita.",
            "english": "Everything was in confusion in the Oblonskys' house.",
            "words": [
                {"word": "すべて", "reading": "すべて", "romaji": "subete", "meaning": "everything, all"},
                {"word": "混乱", "reading": "こんらん", "romaji": "konran", "meaning": "confusion, disorder"},
                {"word": "家", "reading": "いえ", "romaji": "ie", "meaning": "house, family"}
            ]
        },
        {
            "id": "anna-ch1-s3",
            "chapter_id": "anna-ch1",
            "order": 3,
            "japanese_kanji": "妻は夫が元家庭教師と関係を持っていたことを知ってしまいました。",
            "japanese_hiragana": "つまはおっとがもときょういくしゃとかんけいをもっていたことをしってしまいました。",
            "japanese_katakana": "ツマハオットガモトカテイキョウシトカンケイヲモッテイタコトヲシッテシマイマシタ。",
            "japanese_romaji": "Tsuma wa otto ga moto kateikyoushi to kankei wo motte ita koto wo shitte shimaimashita.",
            "english": "The wife had discovered that her husband was having an affair with the former governess.",
            "words": [
                {"word": "夫", "reading": "おっと", "romaji": "otto", "meaning": "husband"},
                {"word": "家庭教師", "reading": "かていきょうし", "romaji": "kateikyoushi", "meaning": "governess, tutor"},
                {"word": "関係", "reading": "かんけい", "romaji": "kankei", "meaning": "relationship, affair"},
                {"word": "知る", "reading": "しる", "romaji": "shiru", "meaning": "to know, find out"}
            ]
        }
    ]
    
    # Insert all chapters
    all_chapters = alice_chapters + sherlock_chapters + pride_chapters + anna_chapters
    await db.chapters.insert_many(all_chapters)
    
    # Insert all sentences
    all_sentences = alice_sentences_ch1 + alice_sentences_ch2 + sherlock_sentences_ch1 + pride_sentences_ch1 + anna_sentences_ch1
    await db.sentences.insert_many(all_sentences)
    
    # Seed basic dictionary entries
    dictionary_entries = [
        {"word": "本", "reading": "ほん", "romaji": "hon", "meanings": ["book"], "parts_of_speech": ["noun"]},
        {"word": "読む", "reading": "よむ", "romaji": "yomu", "meanings": ["to read"], "parts_of_speech": ["verb"]},
        {"word": "書く", "reading": "かく", "romaji": "kaku", "meanings": ["to write"], "parts_of_speech": ["verb"]},
        {"word": "見る", "reading": "みる", "romaji": "miru", "meanings": ["to see", "to look"], "parts_of_speech": ["verb"]},
        {"word": "聞く", "reading": "きく", "romaji": "kiku", "meanings": ["to hear", "to listen", "to ask"], "parts_of_speech": ["verb"]},
    ]
    await db.dictionary.insert_many(dictionary_entries)
    
    return {"message": "Database seeded successfully", "books": len(books_data), "chapters": len(all_chapters), "sentences": len(all_sentences)}

# ========================
# ROOT ENDPOINT
# ========================

@api_router.get("/")
async def root():
    return {"message": "Japanese Reading App API", "version": "1.0.0"}

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
