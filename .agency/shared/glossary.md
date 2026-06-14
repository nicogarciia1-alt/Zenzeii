# Glossary

## Job IDs and ownership

| Job ID | What it owns |
|--------|-------------|
| `coo` | `control/` directory, `objectives.md`, `decisions.md`, `state.md`, `activity_log.md`, `dependencies.md`. Translates Nico's goals into tasks. Does NOT write app code. |
| `backend-engineer` | `backend/` — `server.py`, `services/`, `translation_worker.py` |
| `frontend-engineer` | `frontend/src/` — all pages, components, contexts, hooks, lib |
| `database-engineer` | MongoDB schema, indexes, migrations. Cross-cuts backend; consults before destructive DB operations. |
| `security-engineer` | Auth flows, CORS config, secrets hygiene, rate limiting, dependency vulnerabilities. Findings go to relevant engineer's inbox — does not make direct changes to auth/CORS code. |
| `specialist` | General-purpose. Scope defined per assignment by COO. |

## Key terms

**job**: A Claude session operating under a specific role. The role defines what it reads, what it owns, and how it behaves.

**park doc**: An end-of-session summary written by a job to `jobs/<role>/park/YYYYMMDD_HHMM-park.md`. Contains what was done, what was found, what's unresolved, and what the next session should know.

**inbox**: `messages/inbox/<role>/` — messages left by other roles for this role to read. Check at session start.

**outbox**: `messages/outbox/<role>/` — messages this role has sent. Kept for reference.

**history**: `messages/history/<role>/` — archived messages (moved here after actioned).

**project**: A scoped piece of work tracked under `projects/<project-name>/`. Has a `brief.md` (scope, success criteria) and a `context/current.txt` (owned by one job at a time).

**on-demand doc**: A Tier 3 reference file under `on-demand/` — loaded when relevant to a task, not necessarily every session.

**tiers**: The four loading tiers (see README.md). Tier 1 = always, Tier 2 = always, Tier 3 = on-demand, Tier 4 = job-local.

## Naming conventions (summary)

**Park doc filename**: `YYYYMMDD_HHMM-park.md`
Example: `20260613_1430-park.md`

**Message filename**: `YYYYMMDD_HHMM-[SenderJobID]-[U|N]-[R|X]-[Topic].txt`
- `U` = urgent, `N` = normal priority
- `R` = requires response, `X` = no response needed
Example: `20260613_1445-backend-engineer-N-R-SentenceAPIChange.txt`

**Project folder**: short kebab-case slug, e.g. `server-split`, `vocab-review-fix`

## Key project-specific terms

**`transform_sentence_for_frontend()`**: The function in `server.py` (~line 422) that maps DB field names (`kanji_text`, `hiragana_text`, `romaji_text`, `katakana_text`) to API response field names (`japanese_kanji`, `japanese_hiragana`, `japanese_romaji`, `japanese_katakana`). This is the critical translation layer between DB and frontend.

**source_language**: A field on each sentence (`"en"` or `"ja"`). English-source books store original text in `english`, Japanese-source books (Aozora) store original text in `japanese_original`.

**translation_status**: Per-sentence field: `"pending"` | `"completed"` | `"failed"`. The background worker processes `"pending"` sentences.

**user_shelves**: The collection that tracks which users have added which books (many-to-many). Books are now global (not per-user); `user_shelves` is the per-user relationship.
