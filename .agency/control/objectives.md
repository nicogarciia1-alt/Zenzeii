# control/objectives.md

**Owner**: coo
**Last updated**: 2026-06-13

---

## Active objectives

*(Empty — Nico and COO will define these together. Add items here as they are agreed.)*

---

## Parked / not started — known structural debt (candidates for future objectives)

These are not assigned or scheduled. They are recorded so COO and Nico can make informed decisions about what to tackle.

### HIGH PRIORITY (structural risk)

| Item | What it is | Why it matters |
|------|-----------|---------------|
| Split `server.py` into `routes/` | `server.py` is 2,100+ lines — all models, auth helpers, and every route in one file | Hard to navigate, easy to cause merge conflicts, impossible to assign ownership cleanly to different sessions |
| Extract frontend custom hooks | Reader/HomePage logic is long; hooks like `useBookImport`, `useTranslation`, `useReader` would clarify ownership | ReaderPage.jsx is 1,088 lines |

### MEDIUM PRIORITY (quality/reliability)

| Item | What it is | Why it matters |
|------|-----------|---------------|
| Verify `translation_worker.py` production behavior | Worker is launched via subprocess in lifespan; unknown if it survives Railway restarts gracefully | Translation could silently fail without anyone noticing |
| Confirm `start_worker.sh` is dead code | File references `/root/.venv/bin/python` and `/var/log/supervisor/` — neither exist in Dockerfile | Orphaned file causes confusion about how the worker actually starts |
| CORS hardcoded origins | Three origins hardcoded in server.py | Any new Vercel preview URL requires a code change + deploy |
| `import_history` pruning | No evidence of old records being removed | Could grow unbounded; rate limiting accuracy degrades over time |

### LOW PRIORITY (documentation / tech debt)

| Item | What it is | Why it matters |
|------|-----------|---------------|
| Delete or archive `memory/PRD.md`, `memory/CHANGELOG.md` | Stale pre-Railway docs | Confusing to anyone who reads them |
| `EMERGENT_LLM_KEY` purpose | Set as env var, only sets a display flag — does not drive translation | Misleading name; may be legacy from a different system |
| `test_result.md` cleanup | Template file from a previous testing session | Not a real test result; confusing |
