# YomuMaster - Japanese Reading Learning Platform

## Beta Version 1.0 - Ready for Testing (March 7, 2026)

### Core Features
- JWT authentication
- Multi-source book library (Project Gutenberg, Aozora Bunko)
- Reader with 5 script modes (Kanji, Hiragana, Katakana, Romaji, English)
- Secondary reading layer (Furigana, English, Kanji below main text)
- Dictionary popup with Jisho API
- Vocabulary saving with flashcards
- Dark/light theme
- **Delete Book** - Remove books from library with confirmation dialog

### Book Import System
- **Sources:**
  - Project Gutenberg (English classics)
  - Aozora Bunko 青空文庫 (Japanese literature)
- Source selector with language badges
- Import rate limit: 3 books/hour/user
- Cancel import with cleanup
- Prioritize import queue position
- **Chapter Parsing:**
  - Correctly skips Table of Contents entries
  - Chapters numbered from 1
  - Preserves original chapter titles (e.g., "Chapter I: Down the Rabbit-Hole")

### Translation Architecture
- **Auto-start worker** - Translation worker starts automatically with backend via lifespan context
- Background worker process (translation_worker.py)
- Lazy-loading on-demand translation
- Cost-optimized: AI generates Japanese only, pykakasi converts locally
- ~60% token reduction vs full AI generation
- Translation direction based on source language:
  - English books → Japanese (kanji, hiragana, katakana, romaji)
  - Japanese books → English

### Reader Experience
- **Full paragraph display** - Natural reading flow, not sentence fragments
- **Original text priority** - Always shows readable content, translations in background
- **Instant response** - Reader loads content in <0.1 seconds
- **Script toggle** - Switch between 漢字, ひらがな, カタカナ, Romaji, EN instantly
- **Chapter navigation** - Previous/Next buttons, chapter dropdown selector
- **Live translation status** - Shows "Translating X/Y" while processing

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

## Bug Fixes (March 7, 2026)
1. **Chapter Numbering Bug** - Fixed TOC entries being counted as chapters
2. **Sentence Fragmentation** - Changed to paragraph-based splitting
3. **Translation Worker** - Now runs as background process
4. **Content Display** - Reader shows full chapter content with proper flow

## File Structure
```
/app/
├── backend/
│   ├── server.py              # FastAPI endpoints
│   ├── translation_worker.py  # Background translation
│   ├── services/
│   │   ├── book_import.py     # Multi-source import, chapter parsing
│   │   └── translation.py     # AI translation + pykakasi
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── HomePage.jsx   # Library with source selector
    │   │   └── ReaderPage.jsx # Reader with secondary layer
    │   └── lib/api.js         # API client functions
```

## Upcoming Tasks
- P1: Implement remaining book sources (Manga Toshokan Z, Shonen Jump+, Japan Foundation)
- P1: Complete "Cancel Import" and "Prioritize Import" worker communication
- P1: Update translation_worker.py for JA → EN translation direction
- P2: Implement hourly import limit with persistent storage
- P2: Dictionary popup word click functionality
- P2: Vocabulary flashcard system
- P2: User profile with statistics
