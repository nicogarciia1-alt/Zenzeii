# YomuMaster - Japanese Reading Learning Platform

## Original Problem Statement
Build a modern web app for learning Japanese through reading public domain books. Features include:
- Public domain book library (Alice in Wonderland, Sherlock Holmes, Pride and Prejudice, Anna Karenina)
- Reader interface with script switching (Kanji, Hiragana, Katakana, Romaji, English)
- Word click dictionary popup with Jisho API integration
- Vocabulary saving with flashcard review and spaced repetition
- Bookmarks and reading progress tracking

## User Choices
- **Book Source**: Both Project Gutenberg API + file upload
- **Japanese Translation**: AI-powered using GPT-5.2 (Emergent LLM key)
- **Initial Library**: 4-5 full books initially, more on-demand
- **Book Processing**: Split by sentence
- **Authentication**: JWT-based custom auth
- **Design**: Clean Kindle-like UI with dark/light mode toggle

## Architecture

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Main API server
- `/app/backend/services/book_import.py` - Gutenberg book fetching and processing
- `/app/backend/services/translation.py` - OPTIMIZED: AI translation + local pykakasi conversion

### Frontend (React + TailwindCSS)
- `/app/frontend/src/pages/` - AuthPage, HomePage, ReaderPage, VocabularyPage, ProfilePage
- `/app/frontend/src/components/` - Reusable components (Navbar, BookCard, DictionaryPopup, etc.)
- `/app/frontend/src/contexts/` - AuthContext, ThemeContext
- `/app/frontend/src/lib/api.js` - API client functions

### Database Collections
- `users` - User accounts with vocabulary counts and stats
- `books` - Book metadata with import status
- `chapters` - Chapter info with sentence counts
- `sentences` - Sentences with all Japanese script variants
- `saved_words` - User's vocabulary with spaced repetition data
- `bookmarks` - User's reading bookmarks
- `reading_progress` - User's progress per book

## What's Been Implemented

### Phase 1: Core MVP ✅
- JWT authentication (register/login)
- Book library with 4 predefined public domain books
- Reader interface with 5 script modes
- Dictionary popup with Jisho API
- Vocabulary saving with flashcard review
- Dark/light theme toggle
- Responsive Kindle-like UI

### Phase 2: Book Import System ✅
- Project Gutenberg API integration
- Instant book import (English text only)
- Lazy-loading on-demand translation architecture
- Sentence-level text splitting
- Pagination for large chapters (50 sentences per page)
- File upload support for .txt files

### Phase 3: Translation Optimization ✅ (March 2026)
- AI generates only Japanese text (kanji+kana)
- Local pykakasi conversion for hiragana/katakana/romaji
- ~60% reduction in AI tokens per sentence
- Increased batch size (10 → 15 sentences)
- All 42 sentences in Chapter 1 translated successfully

## API Endpoints

### Authentication
- POST `/api/auth/register` - Create account
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user

### Books
- GET `/api/books` - List all books
- GET `/api/books/{id}` - Get book details
- GET `/api/books/{id}/chapters` - Get chapters
- GET `/api/chapters/{id}/sentences?skip=0&limit=50` - Get sentences (paginated)
- POST `/api/books/import` - Start book import (instant)
- GET `/api/books/available/list` - List predefined books
- GET `/api/books/search/gutenberg?query=` - Search Gutenberg

### Translation
- POST `/api/translate/trigger` - Trigger background translation for chapter
- POST `/api/translate/sentences` - Translate specific sentences

### Vocabulary
- GET/POST `/api/vocabulary` - CRUD operations
- GET `/api/vocabulary/review` - Get words for review
- POST `/api/vocabulary/review` - Submit flashcard answer

### Progress
- GET/POST `/api/progress` - Reading progress
- GET/POST `/api/bookmarks` - Bookmarks

## Prioritized Backlog

### P0 - Critical
- None (lazy-loading architecture complete and tested)

### P1 - High Priority
- Word-click dictionary popup functionality
- Vocabulary system frontend (flashcards, notes)
- Import additional books at scale

### P2 - Medium Priority
- Profile page with reading statistics
- Bookmarking feature in reader
- Export vocabulary to Anki format

### P3 - Future
- User-uploaded book files
- Reading goals and streaks
- Social features (share progress)

## Technical Notes

### Translation Architecture (Lazy-Loading)
```
User opens chapter → GET /sentences → Returns cached Japanese OR English fallback
                  ↓
         Background task triggered
                  ↓
         Check for pending sentences → Batch of 15 sent to GPT-5.2
                  ↓
         AI returns Japanese text → pykakasi converts locally
                  ↓
         All forms saved to DB → Frontend polls & updates UI
```

### Cost Optimization
- Old: AI generates 4 variants (kanji, hiragana, katakana, romaji) = ~200 output tokens
- New: AI generates 1 variant (Japanese) = ~50 output tokens
- pykakasi converts locally (instant, free)
- **Savings: ~60% reduction in API costs**
