# .agency — Zenzeii Multi-Thread Operating System

This directory is a coordination layer for multiple Claude sessions working on the Zenzeii codebase. It contains **only markdown/text files** and has zero effect on the running application.

## What this is

Each Claude session is assigned a **job role** (coo, backend-engineer, frontend-engineer, database-engineer, security-engineer, specialist). Each role reads a small, defined set of files at session start so it understands what it owns, the current verified state of the project, and any pending messages.

## How to start a session

Paste the contents of the relevant file from `init-prompts/` as your first message to Claude.

```
init-prompts/
├── coo.md
├── backend-engineer.md
├── frontend-engineer.md
├── database-engineer.md
├── security-engineer.md
└── specialist.md
```

## File tiers (what each role reads)

| Tier | Files | Who reads it |
|------|-------|--------------|
| 1 — Shared | `shared/identity.md`, `shared/tech_stack.md`, `shared/rules.md`, `shared/glossary.md` | Every role, every session |
| 2 — Control | `control/state.md`, `control/objectives.md` | Every role, every session |
| 3 — On-demand | `on-demand/api-contracts.md`, `on-demand/db-schema.md`, `on-demand/deployment.md` | Loaded when relevant to the task |
| 4 — Job-local | `jobs/<role>/role.md`, `jobs/<role>/park/`, `messages/inbox/<role>/` | Each role reads only its own |

## Directory map

```
.agency/
├── README.md                   ← you are here
├── shared/                     ← Tier 1: loaded by every role
│   ├── identity.md
│   ├── tech_stack.md
│   ├── rules.md
│   └── glossary.md
├── control/                    ← Tier 2: COO-owned, ground truth
│   ├── state.md
│   ├── objectives.md
│   ├── decisions.md
│   ├── dependencies.md
│   └── activity_log.md
├── init-prompts/               ← ready-to-paste session starters
│   ├── coo.md
│   ├── backend-engineer.md
│   ├── frontend-engineer.md
│   ├── database-engineer.md
│   ├── security-engineer.md
│   └── specialist.md
├── jobs/                       ← Tier 4: one folder per role
│   ├── _template/
│   ├── coo/
│   ├── backend-engineer/
│   ├── frontend-engineer/
│   ├── database-engineer/
│   ├── security-engineer/
│   └── specialist/
├── on-demand/                  ← Tier 3: reference docs
│   ├── api-contracts.md
│   ├── db-schema.md
│   └── deployment.md
├── projects/                   ← active project folders
│   └── _template/
└── messages/                   ← async inter-role messaging
    ├── inbox/<role>/
    ├── outbox/<role>/
    └── history/<role>/
```

## Key conventions

- **Park docs**: end-of-session summaries saved to `jobs/<role>/park/YYYYMMDD_HHMM-park.md`
- **Messages**: `YYYYMMDD_HHMM-[SenderJobID]-[U|N]-[R|X]-[Topic].txt` (U=urgent, N=normal, R=requires response, X=no response needed)
- `control/state.md` is ground truth for what is actually built — always verify against code before trusting it
- `control/activity_log.md` is append-only; one line per session
