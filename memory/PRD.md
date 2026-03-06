# YomuMaster - Japanese Reading Learning Platform

## Original Problem Statement
Build a modern web app for learning Japanese through reading public domain books.

## Architecture (Updated March 2026)

### Background Worker Architecture
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Web Server    │────▶│    MongoDB       │◀────│   Worker    │
│   (FastAPI)     │     │   (Database)     │     │ (Translator)│
└─────────────────┘     └──────────────────┘     └─────────────┘
        │                       │                       │
   Instant API              Cache Layer           Background
   Responses               Translations            Processing
```

- **Web Server**: Handles API requests instantly, never performs translations
- **Worker**: Separate process that polls for translation jobs
- **Database**: Caches all translations for instant retrieval

### Key Files
- `/app/backend/server.py` - Main FastAPI server
- `/app/backend/translation_worker.py` - Background translation worker
- `/app/backend/services/translation.py` - Translation logic with pykakasi
- `/app/frontend/src/pages/ReaderPage.jsx` - Reader with secondary layers

## What's Been Implemented

### Phase 1: Core MVP ✅
- JWT authentication
- Book library with public domain books
- Reader interface with 5 script modes
- Dictionary popup, vocabulary saving
- Dark/light theme toggle

### Phase 2: Lazy-Loading Translation ✅
- Instant book import (English only)
- On-demand translation via background worker
- Cost-optimized: AI generates Japanese, pykakasi converts locally
- ~60% token reduction

### Phase 3: Performance Optimization ✅ (March 2026)
- Background worker architecture (translation_worker.py)
- API response time: ~100ms (instant)
- Limited concurrency (2 batches max)
- "Preparing..." status for new books
- Secondary reading layer (Furigana, English, Kanji)

## API Endpoints
- GET `/api/chapters/{id}/sentences` - Instant from cache
- POST `/api/translate/trigger` - Flags chapter for worker
- POST `/api/books/import` - Instant import, worker translates
- GET `/api/books/{id}/status` - Check import/translation progress

## Starting the Worker
```bash
cd /app/backend && nohup python translation_worker.py &
```

## Prioritized Backlog

### P1 - High Priority
- Word-click dictionary (Jisho API)
- Vocabulary system (flashcards, notes)

### P2 - Medium Priority
- Profile page with reading stats
- Bookmarking feature

### P3 - Future
- User-uploaded book files
- Anki export
