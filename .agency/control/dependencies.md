# control/dependencies.md — Cross-Job Contracts

This file tracks contracts between jobs — things that, if changed by one job, require the other job to update their code.

Format per entry:
- **Contract**: what the contract is
- **Owner**: who owns the producing side
- **Consumer**: who consumes it
- **Last verified**: date of last check
- **Notes**: anything important

---

## Sentence field names (DB ↔ API ↔ Frontend)

**Contract**: DB stores sentence script fields as `kanji_text`, `hiragana_text`, `katakana_text`, `romaji_text`. The API (via `transform_sentence_for_frontend()` in `server.py` ~line 422) maps these to `japanese_kanji`, `japanese_hiragana`, `japanese_katakana`, `japanese_romaji` in `SentenceResponse`. Frontend reads `japanese_*` names.

**Owner**: backend-engineer (owns the transform function)
**Consumer**: frontend-engineer (reads `japanese_*` names), database-engineer (writes `*_text` names)
**Last verified**: 2026-06-13
**Notes**: This is the most critical naming contract in the codebase. If backend-engineer renames fields in `SentenceResponse` or changes `transform_sentence_for_frontend()`, frontend-engineer must be notified immediately. If database-engineer changes the DB field names (e.g., as part of a migration), backend-engineer must update the transform.

---

## Auth / email verification flow

**Contract**: Backend issues JWT on register/login. Frontend stores token and sends as Bearer header. Email verification uses a token in `email_verifications` collection; link is `{FRONTEND_URL}/verify-email?token={token}`. Password reset uses `password_resets` collection; link is `{FRONTEND_URL}/reset-password?token={token}`.

**Owner**: backend-engineer
**Consumer**: frontend-engineer (VerifyEmailPage, ResetPasswordPage)
**Last verified**: 2026-06-13
**Notes**: `FRONTEND_URL` env var controls the link base. Default is `https://zenzeii-ci1x.vercel.app`. If the domain changes, this env var must be updated in Railway.

---

## API base URL / CORS

**Contract**: Frontend calls `${process.env.REACT_APP_BACKEND_URL}/api` for all business routes. Backend allows CORS from hardcoded list: `zenzeii.com`, `www.zenzeii.com`, `zenzeii-ci1x.vercel.app`.

**Owner**: backend-engineer (CORS config in server.py), frontend-engineer (REACT_APP_BACKEND_URL in Vercel env)
**Consumer**: both
**Last verified**: 2026-06-13
**Notes**: Adding a new Vercel preview URL to CORS requires a backend code change + Railway redeploy. This should be discussed with coo before any new Vercel environments are created.

---

## Book import rate limiting

**Contract**: Backend enforces 3 book imports per hour per user using the `import_history` collection. Frontend should display appropriate messaging.

**Owner**: backend-engineer
**Consumer**: frontend-engineer (import UI on HomePage/ZenzeiiLibraryPage)
**Last verified**: 2026-06-13
**Notes**: The rate limit constants `IMPORT_LIMIT_PER_HOUR = 3` and `IMPORT_LIMIT_WINDOW_HOURS = 1` are defined at the top of `server.py`. If changed, frontend copy may need updating.

---

## Subscription fields on user object

**Contract**: `UserResponse` now includes 7 subscription fields (added Block 1). All have safe defaults so existing users unaffected. Full contract (which fields gate what features) will be finalized in Blocks 2–4. Frontend should not build gating logic against these until the Block 4 brief is delivered.

**Owner**: backend-engineer
**Consumer**: frontend-engineer (subscription gating, tier display — Blocks 4–5)
**Last verified**: 2026-06-14
**Notes**: Fields: `subscription_tier` ("free"|"premium"|"founding_member"), `subscription_status` ("none"|"active"|"canceled"|"past_due"), `stripe_customer_id`, `stripe_subscription_id`, `subscribed_at`, `ai_messages_today`, `ai_messages_date`. No gating logic implemented yet.

---

## app_config.founding_member (spot counter)

**Contract**: A single document in the `app_config` collection with `_id: "founding_member"`, `total_spots: 15`, `spots_remaining: 15`. This is the authoritative counter for founding member availability. The frontend "X spots left" display (Block 4) reads from this via a backend endpoint (not yet built).

**Owner**: backend-engineer (document initialization + decrement endpoint, Block 2/3)
**Consumer**: frontend-engineer (founding member CTA, Block 4)
**Last verified**: 2026-06-14
**Notes**: Document is created idempotently at app startup (lifespan). Decrement must be atomic with a floor-of-zero guard — race-condition concern flagged for COO review before Block 2/3 implementation.

---

## Translation worker / sentence status

**Contract**: Sentences start with `translation_status: "pending"`. The background worker (`translation_worker.py`) processes them and sets `translation_status: "completed"`. Frontend polls via `GET /api/books/{book_id}/status` to track progress and displays "Translating X/Y" UI.

**Owner**: backend-engineer (worker + status endpoint), database-engineer (sentence schema)
**Consumer**: frontend-engineer (ReaderPage, translation status display)
**Last verified**: 2026-06-13
**Notes**: The worker is launched via `subprocess.Popen` in the FastAPI lifespan. Whether it reliably stays alive across Railway restarts is unverified (flagged in control/state.md).
