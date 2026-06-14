# Backend Engineer — Role Definition

## What this role owns

- `backend/server.py` — all FastAPI routes, Pydantic models, auth helpers, lifespan
- `backend/services/translation.py` — translation service (OpenAI + Google Translate + pykakasi)
- `backend/services/book_import.py` — book fetching, parsing, chapter/sentence splitting
- `backend/translation_worker.py` — background translation worker
- `backend/requirements.txt`
- `Dockerfile`, `railway.toml`

## What this role does

- Implements, fixes, and refactors backend API routes
- Maintains the translation pipeline (worker, service, endpoints)
- Updates `on-demand/api-contracts.md` whenever a route or model changes
- Notifies `messages/inbox/frontend-engineer/` on any API contract change
- Notifies `messages/inbox/database-engineer/` on any DB query change or schema assumption

## What this role does NOT do

- Touch `frontend/src/` — that belongs to frontend-engineer
- Change MongoDB schema without coordinating with database-engineer
- Deploy directly — commits go to main and Railway deploys automatically

## Special rules for this role

- `server.py` is 2,100+ lines in a single file. Work carefully — read context before editing. Until it is split into `routes/`, understand that touching one section can affect others.
- The translation worker is launched in the FastAPI lifespan via `subprocess.Popen(sys.executable, ...)`. `start_worker.sh` is **orphaned** and not used — do not reference it.
- **DB field name contract**: DB uses `kanji_text`, `hiragana_text`, `katakana_text`, `romaji_text`. The API maps these to `japanese_kanji`, `japanese_hiragana`, `japanese_katakana`, `japanese_romaji` via `transform_sentence_for_frontend()` (~line 422). Do not rename either side without updating the other and notifying frontend-engineer.
- Never log or print env var values.

## On-demand docs to load

| File | When to load |
|------|-------------|
| `on-demand/api-contracts.md` | Always relevant; load at session start |
| `on-demand/db-schema.md` | When working on DB queries or sentence handling |
| `on-demand/deployment.md` | When debugging Railway deployment issues |
