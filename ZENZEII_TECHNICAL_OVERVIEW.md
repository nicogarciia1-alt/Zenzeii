# Zenzeii (YomuMaster) — Technical & Product Overview

## What It Is
Zenzeii is a Japanese-reading/e-reader application that helps learners read real Japanese books with built-in translation, vocabulary tracking, and audio narration. It ships as three products sharing one backend:
- **Web app** (React) — the primary reader and library experience
- **Mobile app** (React Native / Expo, iOS + Android) — same features, native shell, in-app purchases via RevenueCat
- **Backend API** (FastAPI + MongoDB) — auth, book library, translation pipeline, audio, payments

## Core Features
- E-book import and reading (EPUB parsing via `ebooklib`/`BeautifulSoup`)
- Japanese-to-English translation with furigana/romaji support (`pykakasi`, `fugashi`, `deep-translator`, OpenAI as an enhancement layer)
- Lazy/chunked translation worker so large books translate incrementally instead of blocking
- Vocabulary tracking per user
- AI reading assistant chat (Zenzeii Chat)
- Audio narration (ElevenLabs) with usage-limited free/premium tiers
- Subscriptions & payments: Stripe (web) and RevenueCat (mobile IAP)
- Email flows (verification, password reset) via Resend
- PDF export (ReportLab)

## Stack
| Layer | Technology |
|---|---|
| Backend | FastAPI, Motor (async MongoDB driver), PyJWT + bcrypt auth |
| Frontend | React 19, Radix UI + Tailwind (shadcn-style component system), React Router |
| Mobile | Expo/React Native 0.81, Expo Router-style navigation, RevenueCat |
| Data | MongoDB |
| Infra | Dockerfile + Railway (`railway.toml`) for backend deploy; Vercel for frontend |

## Build Quality — Honest Assessment

**Strengths**
- Real, working product across three surfaces (web, iOS, Android) sharing one backend — not a prototype.
- Sensible tech choices: async Mongo driver, JWT auth, established UI primitives (Radix) rather than reinvented components.
- Background worker pattern for translation (`translation_worker.py`) avoids blocking API requests on slow, chunked translation jobs — a correct architectural call for this workload.
- Payments are integrated on both platforms with the platform-appropriate provider (Stripe web, RevenueCat/native IAP mobile), which is the correct way to handle Apple/Google IAP requirements.
- Some automated backend tests exist covering translation and chapter-parsing edge cases.

**Weaknesses / Technical Debt**
- **Backend is a monolith**: `server.py` is ~2,900 lines with 54+ routes in a single file (partially split via one `APIRouter`, but not organized into domain modules like `auth/`, `books/`, `payments/`). This is the single biggest structural issue — it works, but it's harder to test, review, and onboard a second engineer into than a routers-per-domain layout.
- Only ~4 backend test files exist for a system this size (auth, payments, and audio paths appear untested); test coverage is thin relative to the surface area.
- No visible CI config in the repo root — testing/linting appears to be run manually rather than gated automatically.
- Frontend has ESLint warnings suppressed to unblock CI builds (seen in recent commit history) rather than fixed — a shortcut that will accumulate debt.
- Some stray build/debug artifacts checked into the working tree (`checkout.json`, `login.json`, `backend/logs/`) suggesting light repo hygiene rather than a hard problem.

## Overall Verdict
This is a **functional, feature-complete product with a real monetization path already wired up** (subscriptions on web and mobile), not a demo. The architecture is standard and sound at the framework/infra level (FastAPI, Mongo, React, Expo — all defensible, widely-supported choices with no exotic or risky dependencies). The main gap for a buyer to weigh is **maintainability debt**: a single large backend file and thin test coverage mean near-term feature work will be slower than it should be until the API layer is modularized and test coverage is raised, but there is no architectural rewrite required — the fixes are incremental (splitting routes into routers, adding test coverage), not structural replacements.
