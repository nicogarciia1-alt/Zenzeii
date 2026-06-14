# Tech Stack — Verified 2026-06-13

All information here is verified from direct code inspection. Treat this as accurate as of the date above; re-verify if anything seems stale.

## Backend

| Item | Value |
|------|-------|
| Language | Python 3.12 |
| Framework | FastAPI 0.110.1 |
| ASGI server | Uvicorn 0.25.0 |
| Database client | Motor 3.3.1 (async) + PyMongo 4.5.0 |
| Auth | PyJWT + bcrypt |
| Japanese processing | pykakasi, jaconv, fugashi, unidic-lite |
| Translation | deep-translator (Google, no key), OpenAI gpt-4o-mini (if key present) |
| Email | Resend |
| PDF generation | reportlab |
| Deployment | Railway (Dockerfile-based) |

**Entry point**: `backend/server.py` (2,104 lines — single file, all routes + models)
**Services**: `backend/services/translation.py`, `backend/services/book_import.py`
**Background worker**: `backend/translation_worker.py` — started by FastAPI lifespan via `subprocess.Popen(sys.executable, ...)`, not by any shell script

## Frontend

| Item | Value |
|------|-------|
| Framework | React (Create React App / Webpack, not Vite) |
| Styling | Tailwind CSS + shadcn/ui components |
| HTTP client | Axios (via `frontend/src/lib/api.js`) |
| Deployment | Vercel |

**Structure**:
```
frontend/src/
├── pages/          HomePage, ReaderPage, VocabularyPage, AuthPage, ProfilePage,
│                   ZenzeiiLibraryPage, ResetPasswordPage, VerifyEmailPage, PrivacyPolicyPage
├── components/
│   ├── reader/     DictionaryPopup, ZenzeiiChat, ReaderCustomizationPanel,
│   │               ScriptToggle, SecondaryScriptToggle, HighlightedText
│   ├── books/      BookCard, GeneratedBookCover
│   ├── layout/     Navbar, Layout
│   └── ui/         shadcn/ui components (accordion, button, card, dialog, etc.)
├── contexts/       AuthContext.js, ThemeContext.js
├── hooks/          use-toast.js
└── lib/            api.js, utils.js, vocabHighlight.js
```

## Database

| Item | Value |
|------|-------|
| Engine | MongoDB Atlas |
| Client env var | `MONGO_URL` (not MONGODB_URL — see note below) |
| DB name env var | `DB_NAME` (defaults to `"zenzeii"`) |

> **Note**: The old `memory/CHANGELOG.md` and `memory/PRD.md` reference `mongodb://localhost:27017` and `DB_NAME=test_database` — those are pre-Railway and stale. The production database is MongoDB Atlas, connection via `MONGO_URL`.

## Environment variables (names only — never values)

| Name | Used by | Purpose |
|------|---------|---------|
| `MONGO_URL` | backend | MongoDB Atlas connection string |
| `DB_NAME` | backend | Database name (defaults to `zenzeii`) |
| `JWT_SECRET` | backend | JWT signing secret |
| `OPENAI_API_KEY` | backend | GPT-4o-mini for translation (optional, falls back to Google Translate if absent) |
| `RESEND_API_KEY` | backend | Transactional email (verification, password reset) |
| `FRONTEND_URL` | backend | Used in email links (defaults to `https://zenzeii-ci1x.vercel.app`) |
| `EMERGENT_LLM_KEY` | backend | Sets `TRANSLATION_ENABLED` flag (used in status endpoint) |
| `REACT_APP_BACKEND_URL` | frontend | Backend API base URL (e.g. `https://your-app.railway.app`) |

## Deployment URLs (check with Nico for current values)

| Service | Platform | Note |
|---------|----------|------|
| Frontend | Vercel | Custom domain: `zenzeii.com`, `www.zenzeii.com` |
| Backend | Railway | URL injected as `REACT_APP_BACKEND_URL` in Vercel env |
| Database | MongoDB Atlas | URL in Railway env as `MONGO_URL` |

## CORS (hardcoded in server.py)

```python
allow_origins=[
    "https://zenzeii.com",
    "https://www.zenzeii.com",
    "https://zenzeii-ci1x.vercel.app",
]
```

Adding a new Vercel preview URL requires a code change + redeploy.

## API prefix

All business routes are prefixed `/api` (via `APIRouter(prefix="/api")`).
Health check: `GET /health` (no prefix).
Ping: `GET /ping` (no prefix).
