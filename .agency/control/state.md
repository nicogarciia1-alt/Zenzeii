# control/state.md — Verified Project State

**Last verified**: 2026-06-13 by setup session (claude-sonnet-4-6)
**Source**: Direct inspection of current codebase

> This file supersedes `memory/PRD.md` and `memory/CHANGELOG.md` as the authoritative description of what is actually built.
> Those files are stale (they reference a pre-Railway local MongoDB setup and pre-restructuring state) — do not use them as reference. See "Stale Documents" section below.

---

## What is actually built and deployed

### Authentication
- Register, login, logout (JWT, 24-hour expiry)
- Email verification (token stored in `email_verifications` collection, sent via Resend)
- Forgot password / reset password flow (token in `password_resets`)
- Profile update (username, email patch)

### Book Library
- Books are **global** (not per-user). The `books` collection is shared.
- Per-user library tracked via `user_shelves` collection (user_id + book_id)
- Book sources: Project Gutenberg (English classics), Aozora Bunko (Japanese literature)
- Predefined book list (`GUTENBERG_BOOKS`, `AOZORA_BOOKS` in `services/book_import.py`)
- Gutenberg search (Gutenberg API), Aozora search (local filter)
- Book import with rate limiting: 3 imports per hour per user
- Cancel import, prioritize import queue position
- File upload (txt/epub) — `POST /api/books/upload`
- Delete book (removes from shelf, conditionally cleans global book)
- Send-to-Kindle (generates PDF via reportlab, emails via Resend)
- Book status polling (`GET /api/books/{book_id}/status`)

### Reader
- Sentence-based reading with lazy translation loading
- 5 script modes: Kanji (漢字), Hiragana (ひらがな), Katakana (カタカナ), Romaji, English
- Secondary script layer (furigana, English, or Kanji below primary)
- Vocabulary highlighting in reader
- Dictionary popup (Jisho API via `/api/dictionary/{word}`)
- AI word explanation (`POST /api/ai/explain`)
- ZenzeiiChat — AI chat about the text (`POST /api/ai/chat`)
- Text-to-speech (`POST /api/tts`) — OpenAI TTS
- Reader customization panel (font size, theme, etc.)
- Chapter navigation (previous/next, dropdown selector)
- Bookmarks (save/delete sentence positions)
- Reading progress (per user, per book — last sentence + words read)

### Vocabulary
- Save words from dictionary popup
- Flashcard review with spaced repetition (mastery_level, next_review, times_reviewed)
- Update notes, mastery level
- Vocabulary page with review queue

### Translation System
- Background worker: `translation_worker.py`, launched at startup by `server.py` lifespan via `subprocess.Popen(sys.executable, ...)` — **not** via `start_worker.sh`
- English books → Japanese: GPT-4o-mini if `OPENAI_API_KEY` set, else Google Translate (deep-translator)
- Japanese books (Aozora) → pykakasi for readings + GPT-4o-mini or Google Translate for English
- pykakasi always runs locally to generate hiragana, katakana, romaji from kanji
- On-demand translation trigger: `POST /api/translate/trigger`
- Direct sentence translation: `POST /api/translate/sentences`
- Text translation (single string): `GET /api/translate/text`

### Stats
- `GET /api/stats` — vocabulary count, books read, total words read, streak, last_read_date

### Other
- Feedback submission (`POST /api/feedback`)
- Tokenization endpoint (`POST /api/tokenize`) — fugashi/unidic-lite
- Status endpoint (`GET /api/status`)

---

## DB Collections (indexes confirmed)

| Collection | Key fields | Notes |
|------------|-----------|-------|
| `books` | id, title, title_jp, author, book_language, source, import_status | Global, not per-user |
| `chapters` | id, book_id, chapter_number, title, title_jp, sentences_count | |
| `sentences` | id, chapter_id, book_id, order, english, kanji_text, hiragana_text, katakana_text, romaji_text, romaji_text, source_language, translation_status, words | See field-name note below |
| `user_shelves` | user_id, book_id, added_at | Per-user book ownership |
| `users` | id, email, username, password (hashed), email_verified, created_at, vocab stats | |
| `reading_progress` | user_id, book_id, chapter_id, sentence_id, last_read, words_read | Unique on (user_id, book_id) |
| `vocabulary` | user_id, word, reading, romaji, meanings, parts_of_speech, mastery_level, next_review, times_reviewed | |
| `bookmarks` | user_id, book_id, chapter_id, sentence_id, name | |
| `password_resets` | token, user_id, expiry | |
| `email_verifications` | token, user_id, email, expiry | |
| `import_history` | user_id, book_id, timestamp | Rate limiting (3/hr) |

---

## Critical: DB ↔ API field name mismatch (sentences)

MongoDB stores sentence fields as:
- `kanji_text`, `hiragana_text`, `katakana_text`, `romaji_text`
- `japanese_original` (Japanese-source books only)

`SentenceResponse` Pydantic model exposes:
- `japanese_kanji`, `japanese_hiragana`, `japanese_katakana`, `japanese_romaji`

The mapping is done by `transform_sentence_for_frontend()` in `server.py` (~line 422). **Any code that reads sentences from the API gets the `japanese_*` names. Any code that writes to or reads directly from MongoDB uses the `*_text` names.**

---

## Frontend pages and their primary API calls

| Page | Key routes used |
|------|----------------|
| `HomePage` | `GET /api/books`, shelf endpoints, book sources |
| `ReaderPage` | `GET /api/chapters/{id}/sentences`, translation trigger, AI explain, TTS |
| `VocabularyPage` | `GET /api/vocabulary`, flashcard review |
| `AuthPage` | Register, login |
| `ProfilePage` | `GET /api/auth/me`, stats, bookmarks |
| `ZenzeiiLibraryPage` | Available books list, import |

---

## Stale documents — do not use as reference

| File | Why it's stale |
|------|---------------|
| `memory/PRD.md` | Dated March 7 2026. References `mongodb://localhost:27017` and `DB_NAME=test_database` (pre-Railway). Describes features accurately but infrastructure info is wrong. |
| `memory/CHANGELOG.md` | Pre-Railway. References local MongoDB and `test_database`. Infrastructure info is entirely wrong. |
| `test_result.md` | A testing protocol template from a previous automated testing framework session. Not a real test report. |

---

## Not yet verified

The following items could not be confirmed from code inspection alone:

| Item | What's unclear |
|------|---------------|
| `DB_NAME` in production | server.py defaults to `"zenzeii"` but the actual Railway env var value is unknown. Confirm with Nico. |
| `CORS_ORIGINS` completeness | Hardcoded to `zenzeii.com`, `www.zenzeii.com`, `zenzeii-ci1x.vercel.app`. If there are other active Vercel preview URLs being used, they would be blocked. |
| `translation_worker.py` in production | The worker is launched via `subprocess.Popen` in the lifespan context. Whether Railway keeps it alive long-term and how it behaves under Railway restarts is unconfirmed. `start_worker.sh` is **not** used — it references `/root/.venv/bin/python` and `/var/log/supervisor/` which do not exist in the `python:3.12-slim` Dockerfile. |
| `EMERGENT_LLM_KEY` | Used only to set `TRANSLATION_ENABLED` flag (displayed in `/api/status`). Does not drive translation — `OPENAI_API_KEY` does. Purpose is unclear; may be legacy. |
| Aozora Bunko live import | Known to have had issues historically (Shift-JIS encoding). Current working state in production unconfirmed. |
| `import_history` collection | Used for rate limiting. Whether old records are ever pruned is not clear from code. |
