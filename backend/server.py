from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
import sys
import logging
import subprocess
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import asyncio
import secrets

# Import services
from services.book_import import (
    fetch_gutenberg_text,
    fetch_aozora_text,
    clean_gutenberg_text,
    clean_aozora_text,
    split_into_chapters,
    split_into_sentences,
    search_gutenberg,
    search_aozora,
    GUTENBERG_BOOKS,
    AOZORA_BOOKS,
    BOOK_SOURCES,
    BOOK_COVERS,
    get_book_cover,
    detect_language,
    get_all_available_books
)
from services.translation import (
    translate_title_simple,
    translate_author_simple
)

# Import rate limiting constants
IMPORT_LIMIT_PER_HOUR = 3
IMPORT_LIMIT_WINDOW_HOURS = 1

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# MongoDB — initialized inside lifespan (requires running event loop in Python 3.12+)
client = None
db = None

# Global variable to track worker process
worker_process = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager: initializes MongoDB and starts the translation worker.
    Motor client is created here (inside async context) to avoid Python 3.12 event loop issues.
    """
    global client, db, worker_process

    # Init MongoDB inside async context (required for Motor on Python 3.12+)
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'zenzeii')
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    logger.info(f"MongoDB client created for DB: {db_name}")

    # Startup: Launch translation worker
    try:
        worker_script = ROOT_DIR / 'translation_worker.py'
        if worker_script.exists():
            logger.info("Starting translation worker...")
            worker_process = subprocess.Popen(
                [sys.executable, str(worker_script)],
                cwd=str(ROOT_DIR),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            logger.info(f"Translation worker started (PID: {worker_process.pid})")
        else:
            logger.warning(f"Translation worker script not found: {worker_script}")
    except Exception as e:
        logger.error(f"Failed to start translation worker: {e}")

    yield  # App is running

    # Shutdown: Stop translation worker
    if worker_process:
        try:
            logger.info("Stopping translation worker...")
            worker_process.terminate()
            worker_process.wait(timeout=5)
            logger.info("Translation worker stopped")
        except Exception as e:
            logger.warning(f"Error stopping worker: {e}")
            try:
                worker_process.kill()
            except:
                pass

    # Close MongoDB connection
    if client:
        client.close()

# Create the main app with lifespan
app = FastAPI(title="Zenzeii API", lifespan=lifespan)

# CORS - temporarily open to all origins to confirm CORS is/isn't the issue
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}

@app.get("/ping")
async def ping():
    return {"ping": "pong"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global exception handler to prevent crashes
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)[:200]}
    )

# Translation availability flag
TRANSLATION_ENABLED = bool(os.environ.get('EMERGENT_LLM_KEY'))

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
    title_jp: Optional[str] = None
    title_en: Optional[str] = None
    author: str
    author_jp: Optional[str] = None
    author_en: Optional[str] = None
    cover_image: Optional[str] = None
    description: Optional[str] = None
    description_jp: Optional[str] = None
    total_chapters: int = 0
    difficulty: Optional[str] = "intermediate"
    genre: Optional[str] = "literature"
    import_status: str = "completed"
    sentences_count: int = 0
    book_language: Optional[str] = "en"
    source: Optional[str] = "gutenberg"

class ChapterResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    book_id: str
    chapter_number: int
    title: str
    title_jp: Optional[str] = None
    sentences_count: int = 0

class SentenceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    chapter_id: str
    order: int
    english: Optional[str] = None
    japanese_kanji: Optional[str] = None
    japanese_hiragana: Optional[str] = None
    japanese_katakana: Optional[str] = None
    japanese_romaji: Optional[str] = None
    translation_status: str = "pending"
    words: List[Dict[str, Any]] = []
    source_language: Optional[str] = "en"

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
    source: Optional[str] = "gutenberg"  # gutenberg, aozora, etc.
    priority: Optional[int] = 0  # Higher = more priority

class SendToKindleRequest(BaseModel):
    recipient_email: str

class GutenbergSearchResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    gutenberg_id: int
    title: str
    author: str
    language: Optional[str] = "en"
    languages: Optional[List[str]] = None
    download_count: int = 0
    source: Optional[str] = "gutenberg"

class CancelImportRequest(BaseModel):
    book_id: str

class PrioritizeImportRequest(BaseModel):
    book_id: str

class BookSourcesResponse(BaseModel):
    sources: List[Dict[str, str]]

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
    """
    Transform database sentence to frontend format with fallbacks.
    Handles both English-source and Japanese-source books.
    """
    source_lang = sentence.get("source_language", "en")
    english = sentence.get("english", "")
    # For Japanese source books, japanese_original contains the actual text
    # kanji_text may be empty or contain processing artifacts
    kanji = sentence.get("kanji_text", "")
    japanese_original = sentence.get("japanese_original", "")
    
    if source_lang == "ja":
        # Japanese source: japanese_original is the primary text
        # Use it directly, falling back to kanji_text only if needed
        primary_japanese = japanese_original or kanji
        return {
            "id": sentence.get("id"),
            "chapter_id": sentence.get("chapter_id"),
            "order": sentence.get("order", 0),
            "english": english or "(English translation pending)",
            "japanese_kanji": primary_japanese,  # This is the original text
            "japanese_hiragana": sentence.get("hiragana_text") or "",
            "japanese_katakana": sentence.get("katakana_text") or "",
            "japanese_romaji": sentence.get("romaji_text") or "",
            "translation_status": sentence.get("translation_status", "pending"),
            "source_language": "ja",
            "words": sentence.get("words", [])
        }
    else:
        # English source: English is primary, Japanese may be pending
        return {
            "id": sentence.get("id"),
            "chapter_id": sentence.get("chapter_id"),
            "order": sentence.get("order", 0),
            "english": english,
            "japanese_kanji": kanji or english,  # Fallback to English if no translation
            "japanese_hiragana": sentence.get("hiragana_text") or "",
            "japanese_katakana": sentence.get("katakana_text") or "",
            "japanese_romaji": sentence.get("romaji_text") or english.lower() if english else "",
            "translation_status": sentence.get("translation_status", "pending"),
            "source_language": "en",
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

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    user = await db.users.find_one({"email": request.email})
    if not user:
        return {"message": "If this email exists, a reset link has been sent."}
    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.password_resets.insert_one({
        "token": reset_token,
        "user_id": user["id"],
        "email": request.email,
        "expires_at": expiry.isoformat(),
        "used": False
    })
    RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://zenzeii-ci1x.vercel.app")
    if RESEND_API_KEY:
        import resend
        resend.api_key = RESEND_API_KEY
        reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        resend.Emails.send({
            "from": "Zenzeii <onboarding@resend.dev>",
            "to": request.email,
            "subject": "Reset your Zenzeii password",
            "html": f"""
            <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px; background: #f5efe0;">
                <h1 style="font-size: 28px; color: #3d2b1f; margin-bottom: 8px;">禅々 Zenzeii</h1>
                <p style="color: #3d2b1f; font-size: 16px;">You requested a password reset.</p>
                <p style="color: #3d2b1f; font-size: 16px;">Click the link below to set a new password. This link expires in 1 hour.</p>
                <a href="{reset_url}" style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #B5294E; color: white; text-decoration: none; font-size: 16px;">Reset Password</a>
                <p style="color: #888; font-size: 13px;">If you did not request this, ignore this email.</p>
            </div>
            """
        })
    return {"message": "If this email exists, a reset link has been sent."}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    now = datetime.now(timezone.utc).isoformat()
    reset_doc = await db.password_resets.find_one({
        "token": request.token,
        "used": False
    })
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if reset_doc["expires_at"] < now:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    await db.users.update_one(
        {"id": reset_doc["user_id"]},
        {"$set": {"password": hash_password(request.new_password)}}
    )
    await db.password_resets.update_one(
        {"token": request.token},
        {"$set": {"used": True}}
    )
    return {"message": "Password reset successfully"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

class UpdateProfileRequest(BaseModel):
    username: str = None
    password: str = None

@api_router.patch("/auth/profile")
async def update_profile(request: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    updates = {}
    if request.username:
        updates["username"] = request.username
    if request.password:
        if len(request.password) < 6:
            raise HTTPException(status_code=400, detail="Password too short")
        updates["password"] = hash_password(request.password)
    if not updates:
        return {"message": "Nothing to update"}
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": updates}
    )
    return {"message": "Profile updated successfully"}

class FeedbackRequest(BaseModel):
    message: str
    user_email: str = ""
    username: str = ""

@api_router.post("/feedback")
async def submit_feedback(request: FeedbackRequest, current_user: dict = Depends(get_current_user)):
    RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
    if RESEND_API_KEY:
        import resend
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": "Zenzeii <onboarding@resend.dev>",
            "to": "nicogarciia1@gmail.com",
            "subject": f"Zenzeii Feedback from {request.username or request.user_email}",
            "html": f"""
            <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 40px; background: #f5efe0;">
                <h1 style="font-size: 24px; color: #3d2b1f;">禅々 Zenzeii — User Feedback</h1>
                <p style="color: #3d2b1f;"><strong>From:</strong> {request.username} ({request.user_email})</p>
                <p style="color: #3d2b1f;"><strong>Message:</strong></p>
                <p style="color: #3d2b1f; background: #ede5db; padding: 16px;">{request.message}</p>
            </div>
            """
        })
    return {"message": "Feedback received"}

# ========================
# SYSTEM STATUS ENDPOINT
# ========================

@api_router.get("/status")
async def get_system_status():
    """System health check - shows translation availability and stats"""
    try:
        book_count = await db.books.count_documents({"import_status": "completed"})
        sentence_count = await db.sentences.count_documents({})
        translated_count = await db.sentences.count_documents({"translation_status": "completed"})
        
        return {
            "status": "healthy",
            "version": "1.0.0-beta",
            "translation_enabled": TRANSLATION_ENABLED,
            "database": "connected",
            "stats": {
                "books": book_count,
                "sentences": sentence_count,
                "translated": translated_count
            }
        }
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e),
            "translation_enabled": TRANSLATION_ENABLED
        }

# ========================
# BOOKS ENDPOINTS
# ========================

# Note: Specific routes must come BEFORE parameterized routes

def safe_book_response(book: dict) -> dict:
    """
    Safely transform a book document to response format.
    Handles missing fields gracefully to prevent crashes.
    """
    return {
        "id": book.get("id", ""),
        "title": book.get("title", "Unknown"),
        "title_jp": book.get("title_jp"),
        "title_en": book.get("title_en"),
        "author": book.get("author", "Unknown"),
        "author_jp": book.get("author_jp"),
        "author_en": book.get("author_en"),
        "cover_image": book.get("cover_image", BOOK_COVERS.get("default")),
        "description": book.get("description", ""),
        "description_jp": book.get("description_jp", ""),
        "total_chapters": book.get("total_chapters", 0),
        "difficulty": book.get("difficulty", "intermediate"),
        "genre": book.get("genre", "literature"),
        "import_status": book.get("import_status", "completed"),
        "sentences_count": book.get("sentences_count", 0),
        "book_language": book.get("book_language", "en"),
        "source": book.get("source", "gutenberg")
    }

@api_router.get("/books/sources")
async def get_book_sources():
    """Get all available book sources"""
    sources = []
    for key, info in BOOK_SOURCES.items():
        sources.append({
            "id": key,
            "name": info["name"],
            "description": info["description"],
            "language": info["language"]
        })
    return {"sources": sources}

@api_router.get("/books/available/list")
async def get_available_books(source: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all available books, optionally filtered by source"""
    available = []
    user_prefix = current_user["id"][:8]

    # Gutenberg books (English)
    if source is None or source == "gutenberg":
        for key, info in GUTENBERG_BOOKS.items():
            existing = await db.books.find_one({"id": f"{user_prefix}-{key}"})
            available.append({
                "book_key": key,
                "title": info["title"],
                "author": info["author"],
                "gutenberg_id": info.get("gutenberg_id"),
                "genre": info["genre"],
                "difficulty": info["difficulty"],
                "source": "gutenberg",
                "language": "en",
                "is_imported": existing is not None,
                "import_status": existing.get("import_status", "not_started") if existing else "not_started"
            })

    # Aozora books (Japanese)
    if source is None or source == "aozora":
        for key, info in AOZORA_BOOKS.items():
            existing = await db.books.find_one({"id": f"{user_prefix}-{key}"})
            available.append({
                "book_key": key,
                "title": info["title"],
                "title_en": info.get("title_en"),
                "author": info["author"],
                "author_en": info.get("author_en"),
                "aozora_id": info.get("aozora_id"),
                "genre": info["genre"],
                "difficulty": info["difficulty"],
                "source": "aozora",
                "language": "ja",
                "is_imported": existing is not None,
                "import_status": existing.get("import_status", "not_started") if existing else "not_started"
            })

    return available

@api_router.get("/books/search/gutenberg")
async def search_gutenberg_books(query: str = Query(..., min_length=2)):
    """Search Project Gutenberg - returns results without strict validation"""
    try:
        results = await search_gutenberg(query)
        return results
    except Exception as e:
        logger.error(f"Gutenberg search error: {e}")
        return []

@api_router.get("/books/search/aozora")
async def search_aozora_books(query: str = Query(..., min_length=1)):
    """Search Aozora Bunko books"""
    try:
        results = await search_aozora(query)
        return results
    except Exception as e:
        logger.error(f"Aozora search error: {e}")
        return []

@api_router.get("/books")
async def get_books(current_user: dict = Depends(get_current_user)):
    """
    Get all imported books.
    Uses safe transform to handle missing fields and prevent crashes.
    Only returns books with valid import_status (excludes 'failed').
    """
    try:
        books = await db.books.find(
            {"user_id": current_user["id"], "import_status": {"$nin": ["failed", "cancelled"]}},
            {"_id": 0}
        ).to_list(100)
        
        # Safe transform each book
        return [safe_book_response(b) for b in books]
    except Exception as e:
        logger.error(f"Error fetching books: {e}")
        return []

@api_router.get("/books/{book_id}")
async def get_book(book_id: str):
    """Get a single book by ID with safe transform"""
    book = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return safe_book_response(book)

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
    """
    Get sentences with pagination - INSTANT response from cache/database.
    Flags chapter for background worker to translate if needed.
    """
    sentences = await db.sentences.find(
        {"chapter_id": chapter_id},
        {"_id": 0}
    ).sort("order", 1).skip(skip).limit(limit).to_list(limit)
    
    # Transform for frontend
    result = [transform_sentence_for_frontend(s) for s in sentences]
    
    # Flag this chapter for translation by the background worker (non-blocking)
    # The worker will pick this up and translate pending sentences
    await db.chapters.update_one(
        {"id": chapter_id},
        {"$set": {"translation_requested": True, "last_accessed": datetime.now(timezone.utc).isoformat()}}
    )
    
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
async def trigger_translation(request: TranslateRequest):
    """
    Flag a chapter for translation by the background worker.
    Called by frontend when user starts reading.
    """
    # Verify chapter exists
    chapter = await db.chapters.find_one({"id": request.chapter_id})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    # Flag for worker to pick up
    await db.chapters.update_one(
        {"id": request.chapter_id},
        {"$set": {"translation_requested": True, "last_accessed": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Translation triggered", "chapter_id": request.chapter_id}

@api_router.post("/translate/sentences")
async def translate_specific_sentences(sentence_ids: List[str]):
    """
    Request translation for specific sentences.
    Flags chapters for background worker.
    """
    if len(sentence_ids) > 50:
        raise HTTPException(status_code=400, detail="Max 50 sentences per request")
    
    # Get chapter IDs for these sentences
    sentence_docs = await db.sentences.find(
        {"id": {"$in": sentence_ids}},
        {"_id": 0, "chapter_id": 1}
    ).to_list(len(sentence_ids))
    
    # Flag chapters for translation by worker
    chapter_ids = set(s["chapter_id"] for s in sentence_docs)
    for cid in chapter_ids:
        await db.chapters.update_one(
            {"id": cid},
            {"$set": {"translation_requested": True}}
        )
    
    # Return current state
    sentences = await db.sentences.find(
        {"id": {"$in": sentence_ids}},
        {"_id": 0}
    ).to_list(len(sentence_ids))
    
    return [transform_sentence_for_frontend(s) for s in sentences]


@api_router.get("/translate/text")
async def translate_text(q: str = Query(..., description="English text to translate")):
    """
    Translate English text to Japanese.
    Returns Japanese (kanji), hiragana, and romaji.
    """
    from services.translation import translate_to_japanese
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty")
    result = translate_to_japanese(q.strip())
    return result


# ========================
# BOOK IMPORT - Multi-source support
# ========================

async def check_import_limit(user_id: str) -> bool:
    """Check if user has exceeded hourly import limit"""
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=IMPORT_LIMIT_WINDOW_HOURS)).isoformat()
    recent_imports = await db.import_history.count_documents({
        "user_id": user_id,
        "timestamp": {"$gte": one_hour_ago}
    })
    return recent_imports < IMPORT_LIMIT_PER_HOUR

async def record_import(user_id: str, book_id: str):
    """Record an import for rate limiting"""
    await db.import_history.insert_one({
        "user_id": user_id,
        "book_id": book_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

@api_router.post("/books/import")
async def import_book(
    request: ImportBookRequest, 
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Import a book from various sources.
    Enforces rate limit of 3 books per hour per user.
    """
    # Check import limit
    if not await check_import_limit(current_user["id"]):
        raise HTTPException(
            status_code=429, 
            detail="You have reached the hourly import limit (3 books). Please try again later."
        )
    
    source = request.source or "gutenberg"
    
    if source == "gutenberg":
        if request.book_key and request.book_key in GUTENBERG_BOOKS:
            book_info = GUTENBERG_BOOKS[request.book_key]
            book_id = f"{current_user['id'][:8]}-{request.book_key}"
            gutenberg_id = book_info["gutenberg_id"]
            title = book_info["title"]
            author = book_info["author"]
            genre = book_info.get("genre", "literature")
            difficulty = book_info.get("difficulty", "intermediate")
            language = "en"
        elif request.gutenberg_id:
            book_id = f"{current_user['id'][:8]}-gutenberg-{request.gutenberg_id}"
            gutenberg_id = request.gutenberg_id
            title = request.title or f"Book {request.gutenberg_id}"
            author = request.author or "Unknown"
            genre = "literature"
            difficulty = "intermediate"
            language = "en"
        else:
            raise HTTPException(status_code=400, detail="Must provide book_key or gutenberg_id")
        
        existing = await db.books.find_one({"id": book_id})
        if existing and existing.get("import_status") == "completed":
            return {"message": "Book already imported", "book_id": book_id, "status": "completed"}
        
        await record_import(current_user["id"], book_id)
        background_tasks.add_task(
            process_book_import_gutenberg,
            book_id, gutenberg_id, title, author, genre, difficulty, language,
            request.priority or 0, current_user["id"]
        )

    elif source == "aozora":
        if request.book_key and request.book_key in AOZORA_BOOKS:
            book_info = AOZORA_BOOKS[request.book_key]
            book_id = f"{current_user['id'][:8]}-{request.book_key}"
            aozora_id = book_info["aozora_id"]
            file_path = book_info["file_path"]
            title = book_info["title"]
            author = book_info["author"]
            genre = book_info.get("genre", "literature")
            difficulty = book_info.get("difficulty", "intermediate")
            language = "ja"
        else:
            raise HTTPException(status_code=400, detail="Must provide valid book_key for Aozora")
        
        existing = await db.books.find_one({"id": book_id})
        if existing and existing.get("import_status") == "completed":
            return {"message": "Book already imported", "book_id": book_id, "status": "completed"}
        
        await record_import(current_user["id"], book_id)
        background_tasks.add_task(
            process_book_import_aozora,
            book_id, aozora_id, file_path, title, author, genre, difficulty, language,
            request.priority or 0, current_user["id"]
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unknown source: {source}")
    
    return {"message": "Book import started", "book_id": book_id, "status": "importing"}

@api_router.post("/books/cancel")
async def cancel_import(request: CancelImportRequest, current_user: dict = Depends(get_current_user)):
    """Cancel a book import and clean up partial data"""
    book = await db.books.find_one({"id": request.book_id})
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.get("import_status") == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel a completed import")
    
    await db.books.update_one({"id": request.book_id}, {"$set": {"import_status": "cancelled"}})
    await db.chapters.delete_many({"book_id": request.book_id})
    await db.sentences.delete_many({"book_id": request.book_id})
    await db.books.delete_one({"id": request.book_id})
    
    return {"message": "Import cancelled", "book_id": request.book_id}

@api_router.post("/books/prioritize")
async def prioritize_import(request: PrioritizeImportRequest, current_user: dict = Depends(get_current_user)):
    """Prioritize a book in the translation queue"""
    book = await db.books.find_one({"id": request.book_id})
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.get("import_status") == "completed":
        raise HTTPException(status_code=400, detail="Book is already completed")
    
    await db.books.update_one(
        {"id": request.book_id},
        {"$set": {"priority": 100, "prioritized_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Book prioritized", "book_id": request.book_id}


async def process_book_import_gutenberg(
    book_id: str,
    gutenberg_id: int,
    title: str,
    author: str,
    genre: str,
    difficulty: str,
    language: str = "en",
    priority: int = 0,
    user_id: str = ""
):
    """Import book from Project Gutenberg (English source)"""
    try:
        logger.info(f"Starting Gutenberg import for {book_id}")

        book_doc = {
            "id": book_id,
            "title": title,
            "title_jp": title,
            "author": author,
            "author_jp": author,
            "cover_image": get_book_cover(book_id),
            "description": f"A classic work by {author}",
            "total_chapters": 0,
            "difficulty": difficulty,
            "genre": genre,
            "import_status": "preparing",
            "sentences_count": 0,
            "source": "gutenberg",
            "book_language": language,  # Source language
            "gutenberg_id": gutenberg_id,
            "priority": priority,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
        }
        
        await db.books.update_one({"id": book_id}, {"$set": book_doc}, upsert=True)
        
        raw_text = await fetch_gutenberg_text(gutenberg_id)
        if not raw_text:
            await db.books.update_one(
                {"id": book_id},
                {"$set": {"import_status": "failed", "error": "Could not fetch from Gutenberg"}}
            )
            return
        
        clean_text = clean_gutenberg_text(raw_text)
        chapters = split_into_chapters(clean_text, book_id)
        
        logger.info(f"Found {len(chapters)} chapters")
        
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
            await db.chapters.update_one({"id": chapter['id']}, {"$set": chapter_doc}, upsert=True)
            
            # For English books: store English as primary, Japanese fields are null
            sentence_docs = []
            for i, sentence_text in enumerate(sentences):
                sentence_docs.append({
                    "id": f"{chapter['id']}-s{i+1}",
                    "chapter_id": chapter['id'],
                    "book_id": book_id,
                    "order": i + 1,
                    "english": sentence_text,
                    "kanji_text": None,
                    "hiragana_text": None,
                    "katakana_text": None,
                    "romaji_text": None,
                    "translation_status": "pending",
                    "source_language": "en"
                })
            
            if sentence_docs:
                await db.sentences.delete_many({"chapter_id": chapter['id']})
                await db.sentences.insert_many(sentence_docs)
                total_sentences += len(sentence_docs)
        
        try:
            if TRANSLATION_ENABLED:
                title_jp = await asyncio.wait_for(translate_title_simple(title), timeout=15)
                author_jp = await asyncio.wait_for(translate_author_simple(author), timeout=15)
            else:
                title_jp = title
                author_jp = author
        except Exception:
            title_jp = title
            author_jp = author
        
        # Mark as completed immediately - English text is readable
        # Japanese translations will happen in background
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
        
        logger.info(f"Gutenberg import complete: {book_id} - {len(chapters)} chapters, {total_sentences} sentences (ready to read)")
        
    except Exception as e:
        logger.error(f"Import failed for {book_id}: {e}", exc_info=True)
        await db.books.update_one(
            {"id": book_id},
            {"$set": {"import_status": "failed", "error": str(e)}}
        )


async def process_book_import_aozora(
    book_id: str,
    aozora_id: str,
    file_path: str,
    title: str,
    author: str,
    genre: str,
    difficulty: str,
    language: str = "ja",
    priority: int = 0,
    user_id: str = ""
):
    """Import book from Aozora Bunko (Japanese source)"""
    try:
        logger.info(f"Starting Aozora import for {book_id}")

        # Get English title/author from book info — strip user prefix to look up base key
        base_key = book_id.split("-", 1)[1] if "-" in book_id else book_id
        book_info = AOZORA_BOOKS.get(base_key, {})
        title_en = book_info.get("title_en", title)
        author_en = book_info.get("author_en", author)

        book_doc = {
            "id": book_id,
            "title": title,  # Japanese title
            "title_jp": title,
            "title_en": title_en,
            "author": author,  # Japanese author
            "author_jp": author,
            "author_en": author_en,
            "cover_image": get_book_cover(book_id),
            "description": f"{author}による作品",
            "description_jp": f"{title}は{author}による日本文学の名作です。",
            "total_chapters": 0,
            "difficulty": difficulty,
            "genre": genre,
            "import_status": "importing",
            "sentences_count": 0,
            "source": "aozora",
            "book_language": language,  # Source language is Japanese
            "aozora_id": aozora_id,
            "priority": priority,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
        }
        
        await db.books.update_one({"id": book_id}, {"$set": book_doc}, upsert=True)
        
        # Fetch text using new file_path format
        raw_text = await fetch_aozora_text(aozora_id, file_path)
        if not raw_text:
            logger.error(f"Failed to fetch Aozora text for {book_id}")
            await db.books.update_one(
                {"id": book_id},
                {"$set": {"import_status": "failed", "error": "Could not fetch from Aozora Bunko"}}
            )
            return
        
        clean_text = clean_aozora_text(raw_text)
        if not clean_text or len(clean_text) < 100:
            logger.error(f"Aozora text too short or empty for {book_id}")
            await db.books.update_one(
                {"id": book_id},
                {"$set": {"import_status": "failed", "error": "Text extraction failed"}}
            )
            return
        
        # Japanese books use 'ja' for chapter splitting patterns
        chapters = split_into_chapters(clean_text, book_id, source_language='ja')
        
        logger.info(f"Found {len(chapters)} chapters for {book_id}")
        
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
            await db.chapters.update_one({"id": chapter['id']}, {"$set": chapter_doc}, upsert=True)
            
            # For Japanese books: Japanese is primary, English needs translation
            sentence_docs = []
            for i, sentence_text in enumerate(sentences):
                sentence_docs.append({
                    "id": f"{chapter['id']}-s{i+1}",
                    "chapter_id": chapter['id'],
                    "book_id": book_id,
                    "order": i + 1,
                    "japanese_original": sentence_text,  # Japanese is the source
                    "kanji_text": sentence_text,
                    "english": None,  # Needs translation
                    "hiragana_text": None,  # Will be generated locally by worker
                    "katakana_text": None,
                    "romaji_text": None,
                    "translation_status": "pending",
                    "source_language": "ja"
                })
            
            if sentence_docs:
                await db.sentences.delete_many({"chapter_id": chapter['id']})
                await db.sentences.insert_many(sentence_docs)
                total_sentences += len(sentence_docs)
        
        # Japanese books are IMMEDIATELY readable - mark as completed
        # English translation will happen in background but book is usable now
        await db.books.update_one(
            {"id": book_id},
            {"$set": {
                "import_status": "completed",  # Japanese text is ready to read
                "total_chapters": len(chapters),
                "sentences_count": total_sentences
            }}
        )
        
        logger.info(f"Aozora import complete: {book_id} - {len(chapters)} chapters, {total_sentences} sentences (ready to read)")
        
    except Exception as e:
        logger.error(f"Aozora import failed for {book_id}: {e}", exc_info=True)
        await db.books.update_one(
            {"id": book_id},
            {"$set": {"import_status": "failed", "error": str(e)}}
        )


@api_router.post("/books/upload")
async def upload_book(
    file: UploadFile = File(...),
    title: str = Query(...),
    author: str = Query(...),
    background_tasks: BackgroundTasks = None,
    current_user: dict = Depends(get_current_user)
):
    """Upload a book file for instant import"""
    if not file.filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only .txt files supported")

    content = await file.read()
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        text = content.decode('latin-1')

    book_id = f"{current_user['id'][:8]}-upload-{str(uuid.uuid4())[:8]}"
    background_tasks.add_task(process_upload_fast, book_id, text, title, author, current_user["id"])

    return {"message": "Upload started", "book_id": book_id, "status": "importing"}


async def process_upload_fast(book_id: str, text: str, title: str, author: str, user_id: str = ""):
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
            "created_at": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
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

@api_router.post("/books/{book_id}/send-to-kindle")
async def send_to_kindle(
    book_id: str,
    request: SendToKindleRequest,
    current_user: dict = Depends(get_current_user)
):
    RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
    if not RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="Email service not configured")

    book = await db.books.find_one({"id": book_id})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    chapters = await db.chapters.find({"book_id": book_id}).sort("chapter_number", 1).to_list(None)

    html_parts = [f"""
    <html><body style="font-family: Georgia, serif; max-width: 680px; margin: 0 auto; padding: 40px;">
    <h1 style="font-size: 2rem;">{book.get('title', '')}</h1>
    <p style="color: #888;">{book.get('author', '')}</p>
    <hr/>
    """]

    for chapter in chapters:
        if chapter.get("title"):
            html_parts.append(f"<h2>{chapter['title']}</h2>")
        sentences = await db.sentences.find(
            {"chapter_id": chapter["id"]}
        ).sort("order", 1).to_list(None)
        for s in sentences:
            text = s.get("japanese_original") or s.get("kanji_text") or s.get("english", "")
            if text:
                html_parts.append(f"<p>{text}</p>")

    html_parts.append("""
    <p style="color: #aaa; font-size: 0.8rem; margin-top: 40px;">
    Sent from Zenzeii — your Japanese literary companion
    </p>
    </body></html>""")
    html_body = "".join(html_parts)

    try:
        import resend
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": "Zenzeii <onboarding@resend.dev>",
            "to": request.recipient_email,
            "subject": f"{book.get('title', 'Book')} — from your Zenzeii Library",
            "html": html_body,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

    return {"success": True, "message": "Book sent to your Kindle"}

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
# AI EXPLAIN
# ========================

class AIExplainRequest(BaseModel):
    word: str
    context_sentence: Optional[str] = None

@api_router.post("/ai/explain")
async def ai_explain_word(
    request: AIExplainRequest,
    current_user: dict = Depends(get_current_user)
):
    """Explain a Japanese word in context using GPT-4o-mini."""
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        raise HTTPException(status_code=503, detail="AI explanation not available")

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=openai_key)

        context_line = f"\nContext sentence: {request.context_sentence}" if request.context_sentence else ""
        prompt = (
            f"You are a Japanese language tutor helping an intermediate learner.\n\n"
            f"Word: {request.word}{context_line}\n\n"
            f"In 3-5 sentences explain:\n"
            f"- What this word means in this context\n"
            f"- Any nuance, register, or common-usage note worth knowing\n"
            f"- One closely related word or expression if useful\n\n"
            f"Be concise and practical."
        )

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=220,
            temperature=0.7,
        )

        return {"explanation": response.choices[0].message.content.strip()}
    except Exception as e:
        logger.error(f"AI explain error: {e}")
        raise HTTPException(status_code=500, detail="AI explanation failed")


class AIChatRequest(BaseModel):
    message: str
    book_title: str = ""
    current_sentence: str = ""
    chat_history: List[dict] = []

@api_router.post("/ai/chat")
async def ai_chat(
    request: AIChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Chat with Zenzeii, a scholarly Japanese literature companion."""
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        raise HTTPException(status_code=503, detail="AI not available")

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=openai_key)

        system_prompt = (
            "You are Zenzeii, a scholarly and serene literary companion specializing in "
            "Japanese language and literature. You speak with the quiet wisdom of a learned "
            "professor — never like a chatbot. You help readers discover meaning, cultural "
            "context, and literary depth in what they read. When users ask about books not "
            "yet in the Zenzeii library, gently guide them back to what is available and "
            "offer to explore themes or passages together. When you recommend Japanese "
            "classics, always give the Japanese title and kanji. Never use bullet points — "
            "write in elegant flowing prose. If the reader has a current sentence, weave it "
            "naturally into your response when relevant. "
            "If a user asks whether they can read a specific book in Zenzeii, "
            "encourage them warmly and let them know they can go to the Library "
            "page and click 'Add Books to Library' — they can search for any book, "
            "do a quick import, or upload their own file. Tell them you will be in "
            "their absolute disposition once they open it."
        )
        if request.book_title:
            system_prompt += f" The reader is currently reading: {request.book_title}."
        if request.current_sentence:
            system_prompt += f" Their current sentence is: {request.current_sentence}."

        messages = [{"role": "system", "content": system_prompt}]
        for msg in request.chat_history:
            if msg.get("role") in ("user", "assistant") and msg.get("content"):
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": request.message})

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )

        return {"reply": response.choices[0].message.content.strip()}
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail="AI chat failed")


class TTSRequest(BaseModel):
    text: str
    voice: str = "nova"

@api_router.post("/tts")
async def text_to_speech(request: TTSRequest, current_user: dict = Depends(get_current_user)):
    openai_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        raise HTTPException(status_code=503, detail="TTS not available")
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=openai_key)
        valid_voices = ["nova", "shimmer", "echo", "onyx", "fable", "alloy"]
        voice = request.voice if request.voice in valid_voices else "nova"
        response = await client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=request.text[:500]
        )
        audio_bytes = response.content
        from fastapi.responses import Response
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail="TTS failed")


# ========================
# ROOT
# ========================

@api_router.get("/")
async def root():
    return {"message": "Japanese Reading App API", "version": "3.0.0"}

app.include_router(api_router)

# Note: shutdown handled by lifespan context manager
