# YomuMaster - Japanese Reading Learning Platform

## Features Implemented (March 2026)

### Core Features
- JWT authentication
- Multi-source book library (Project Gutenberg, Aozora Bunko)
- Reader with 5 script modes (Kanji, Hiragana, Katakana, Romaji, English)
- Secondary reading layer (Furigana, English, Kanji below main text)
- Dictionary popup with Jisho API
- Vocabulary saving with flashcards
- Dark/light theme

### Book Import System
- **Sources:**
  - Project Gutenberg (English classics)
  - Aozora Bunko 青空文庫 (Japanese literature)
- Source selector with language badges
- Import rate limit: 3 books/hour/user
- Cancel import with cleanup
- Prioritize import queue position

### Translation Architecture
- Background worker process (translation_worker.py)
- Lazy-loading on-demand translation
- Cost-optimized: AI generates Japanese only, pykakasi converts locally
- ~60% token reduction vs full AI generation
- Translation direction based on source language:
  - English books → Japanese (kanji, hiragana, katakana, romaji)
  - Japanese books → English

### Database Schema
- `books`: id, title, title_jp, author, book_language, source, import_status
- `chapters`: id, book_id, chapter_number, title
- `sentences`: id, chapter_id, order, english, kanji_text, hiragana_text, katakana_text, romaji_text, source_language, translation_status
- `import_history`: user_id, book_id, timestamp (for rate limiting)

### API Endpoints
- GET `/api/books/sources` - List available sources
- GET `/api/books/available/list` - List books by source
- POST `/api/books/import` - Start import with source
- POST `/api/books/cancel` - Cancel import
- POST `/api/books/prioritize` - Prioritize import
- GET `/api/chapters/{id}/sentences` - Instant response from cache

### Starting Services
```bash
# Backend (auto-started by supervisor)
sudo supervisorctl restart backend

# Translation worker (background)
cd /app/backend && nohup python translation_worker.py &
```

## File Structure
```
/app/
├── backend/
│   ├── server.py              # FastAPI endpoints
│   ├── translation_worker.py  # Background translation
│   ├── services/
│   │   ├── book_import.py     # Multi-source import
│   │   └── translation.py     # AI translation + pykakasi
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── HomePage.jsx   # Library with source selector
    │   │   └── ReaderPage.jsx # Reader with secondary layer
    │   └── lib/api.js         # API client functions
```
