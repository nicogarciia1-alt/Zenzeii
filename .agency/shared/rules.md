# Operating Rules — All Roles

These rules apply to every Claude session regardless of role. Follow them throughout a session; do not override them based on convenience or perceived urgency.

---

## 1. Never rewrite working code

Only add or fix the specific thing requested. Do not refactor surrounding code, rename variables, restructure files, or "clean up while you're in there" unless that is the explicit task. If you notice something worth cleaning up, note it in your park doc; do not do it unilaterally.

## 2. One change at a time, test after each

Make one logical change. Verify it works (or confirm with Nico). Then move to the next. Do not stack multiple fixes in a single commit without testing each in sequence.

## 3. Show the plan before committing

For any non-trivial change, write out what you intend to do before doing it. Wait for Nico to confirm. A "non-trivial change" is anything that: touches more than one file, modifies a route or DB query, changes a Pydantic model, or has any risk of breaking a deployed feature.

## 4. Diagnose before fixing

Read the error. Read the relevant code. Form a hypothesis about the root cause. State it explicitly. Only then write a fix. Do not guess-and-apply.

## 5. Never stack multiple fixes

If you're not sure which of three things is causing a bug, fix one, test, then fix the next. Applying three changes at once makes it impossible to know what worked.

## 6. git push origin main after every commit

After every commit: `git push origin main`. Do not let commits accumulate locally.

## 7. Read deploy logs before guessing

If a deployed feature is broken, check Railway logs (backend) or Vercel build/function logs (frontend) before hypothesising. Real error messages beat guesses.

## 8. Treat control/state.md as ground truth — but verify

`control/state.md` is the best available summary of what is built. But it can lag behind code. Before acting on a claim in state.md, verify it against the actual source file if anything seems off. If you find state.md is wrong, correct it as part of your session.

## 9. Park doc instructions (end-of-session required)

At the end of every session, write a park doc:
- **Path**: `jobs/<your-role>/park/YYYYMMDD_HHMM-park.md`
- **Contents**: what you did, what you found, what's unresolved, any risks you noticed, what the next session should know
- **Also**: append one line to `control/activity_log.md`

Do not end a session without writing the park doc.

## 10. Message naming convention

When leaving a message in another role's inbox:
`messages/inbox/<role>/YYYYMMDD_HHMM-[YourJobID]-[U|N]-[R|X]-[Topic].txt`
- `U` = urgent, `N` = normal
- `R` = requires response, `X` = no response needed

## 11. Project context ownership

Each project under `projects/` has a `context/current.txt` file with `owner: <job-id>` at the top. Only the owning role writes to that file. Other roles read it but do not modify it unless they take ownership.

## 12. Coding standards v1

**Naming conventions**:
- Python: `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_CASE` for module-level constants
- JavaScript/React: `camelCase` for variables/functions, `PascalCase` for components
- MongoDB collection names: plural, `snake_case` (e.g., `reading_progress`, `user_shelves`)

**No dead code**: Do not leave commented-out code, unused imports, or `TODO: remove this` blocks in committed code.

**API contract change process**: If you change a route path, request shape, or response shape, you must:
1. Update `on-demand/api-contracts.md`
2. Leave a message in `messages/inbox/frontend-engineer/` (if backend changes) or `messages/inbox/backend-engineer/` (if frontend needs a new field)
3. Note the change in `control/dependencies.md`

**Secrets handling**: Never print, log, or commit secret values. Use only the env var *names* in documentation. If you need to confirm a value with Nico, ask out-of-band (yes/no questions only in-session).
