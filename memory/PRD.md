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
- `/app/backend/services/translation.py` - AI translation using emergentintegrations

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

## What's Been Implemented (Jan 2026)

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
- Background book import with AI translation
- Sentence-level text splitting
- Pagination for large chapters (50 sentences per page)
- File upload support for .txt files
- Import progress tracking and status

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
- POST `/api/books/import` - Start book import
- GET `/api/books/available/list` - List predefined books
- GET `/api/books/search/gutenberg?query=` - Search Gutenberg

### Vocabulary
- GET/POST `/api/vocabulary` - CRUD operations
- GET `/api/vocabulary/review` - Get words for review
- POST `/api/vocabulary/review` - Submit flashcard answer

### Progress
- GET/POST `/api/progress` - Reading progress
- GET/POST `/api/bookmarks` - Bookmarks

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- None

### P1 - High Priority
- Word extraction for clickable words in reader
- Reading statistics dashboard enhancements
- Export/import vocabulary feature

### P2 - Medium Priority
- Social features (share progress)
- Leaderboards
- Reading goals and streaks

## Next Tasks
1. Import additional books (Pride and Prejudice, Sherlock Holmes, Anna Karenina, Moby Dick)
2. Enhance word-level click detection in reader
3. Add vocabulary export to Anki format
4. Implement reading streak tracking
