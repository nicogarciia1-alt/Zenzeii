# Project: Zenzeii Literary Knowledge System

**Slug**: `library-knowledge-graph` (path kept stable; product name is "Zenzeii Literary Knowledge System" per Professor Sato, 2026-08-04 — "graph" is implementation vocabulary, not the product name)
**Owner (current)**: specialist
**Started**: 2026-08-04
**Status**: Document 1 🔒 frozen (constitution). Document 2 drafted, pending review.

## Scope

Replace the hardcoded book catalog (`AOZORA_BOOKS`/`GUTENBERG_BOOKS` dicts in `backend/services/book_import.py`, mirrored as a static array in `frontend/src/pages/ZenzeiiLibraryPage.jsx`) with a proper knowledge graph: books, authors, and every classification axis (genre, mood, theme, cultural concept, setting, period, audience, difficulty, season, award...) modeled as reusable nodes connected by typed, weighted, provenance-tagged relationships. Goal: a discovery engine that answers "what is this book / what is it about / who should read it / where does it belong" — not just a bigger catalog table.

## Deliverables (sequential, each reviewed before the next starts)

1. **Document 1 — Conceptual Model**: entities, relationships, taxonomy shape. Database-agnostic.
2. **Document 2 — Database & API Specification**: MongoDB collections, indexes, endpoint shapes, search/query design.
3. **Document 3 — Metadata & Taxonomy Standard**: the full controlled vocabulary (every allowed genre/mood/theme/... value).

## Key architectural principle (approved)

Per Professor Kenji Sato's memo (2026-08-04): **the relationship model is the product; MongoDB is only today's storage engine.** Every entity is conceptually a Node; every connection between entities is conceptually an Edge (`source_node → relationship_type → target_node`, carrying `weight`, `confidence`, `source`, `created_by`, timestamps, `notes`). This must hold regardless of what database stores it, so the graph can migrate to a dedicated graph engine later without redesigning the knowledge model. Confirmed direction: Option B ("graph-portable"), specifically Sato's Node/Edge formulation rather than a plain typed-arrays-on-book-document approach.

## Storage-shape decision — RESOLVED (approved by Professor Sato, 2026-08-04)

Typed node collections (`books`, and new `authors`, `themes`, `moods`, etc. — not a single polymorphic `nodes` collection), plus **one** universal, node-type-agnostic `relationships` collection carrying only `source_id`/`source_type`/`target_id`/`target_type`/`relationship_type`/`weight`/`confidence`/`ai_confidence`/`source`/`version`/timestamps/`notes`. Sato's explicit reasoning: Book and Author attribute sets are too different to force into one generic collection; the graph lives in the relationships, not in the storage. No migration of `books`/`saved_words`/`user_shelves` required — additive only, per working rule 1. This is now a settled input to Document 2, not an open question.

## Additions required by Chief Librarian review (2026-08-04) — incorporated into Document 1

- **Entity Status** (universal node lifecycle): `Draft` → `Verified` → `Curated` → `Deprecated` → `Hidden`. See Document 1 §2.0.
- **Universal alias system**: every named node type (not just classification nodes) resolves alternate names/scripts to one canonical node. See Document 1 §2.0.
- **Relationship `version` field**: increments on re-assertion, independent of `created_at`/`updated_at`. See Document 1 §3, §4.
- **`ai_confidence`** as a field distinct from `weight`: model's own certainty (0–100%) vs. the relationship's domain strength. See Document 1 §3, §4.
- **Provenance tiers revised** to four canonical values — `Human Curated`, `AI Generated`, `Imported`, `Community` — with mechanically-derived edges treated as an internal technical case, not a fifth editorial tier. See Document 1 §4.
- **Extensibility test** answered explicitly (anime, literary movements, festivals/prefectures, characters, user-created lists, future language verticals) — see Document 1 §11.
- **Terminology**: product referred to as "Zenzeii Literary Knowledge System" throughout; "graph" retained only as implementation vocabulary.

## Document 2 — flagged decision (new, not covered by Document 1 or Sato's review)

While grounding Document 2 against the actual live code, found that an earlier feasibility note (pre-dating this project) proposed a new `book_catalog` collection for pre-import book metadata. Reading `backend/server.py` directly: `books` already models exactly this lifecycle via its existing `import_status` field (`not_started`/`preparing`/`importing`/`completed`/`failed`) — there's no structural reason a `books` document can't exist before import starts. **Specification adopted in Document 2 §1.4: extend `books` (new `importable` bool + the universal node fields), do not fork a parallel collection.** This is additive and low-risk (new optional fields, no rename, no migration of existing rows beyond a status backfill — Document 2 §3), but it is a genuine data-model decision per working rule 6, so it's called out here rather than treated as settled. Flag if this should go back to Nico/Sato before Document 2 is approved.

Also worth your attention, not a decision so much as a behavior to sign off on: Document 2 §2.1 specifies that an `AI Generated` or `Imported` write can never silently overwrite an existing `Human Curated` edge — it's rejected outright, forcing an editor to explicitly override. This operationalizes the provenance model Sato approved; flagging because it's the kind of thing worth confirming matches intent before any enrichment job gets built against it.

## Constraints (from brief + working rules)

- Never rewrite working code; additive only.
- One change at a time, plan shown before implementation, nothing committed without review.
- Budget target: MongoDB M5 ($25/mo, 5GB) now, M10 ($57/mo) when needed.
- No copyrighted text stored — non-public-domain books get metadata + buy link only.
- Design philosophy (`shared/identity.md`) governs every UI/architecture call: literary, meditative, not gamified.

## Notes on source-of-truth drift found during grounding (2026-08-04)

`control/state.md`, `shared/identity.md`, and `shared/tech_stack.md` are all dated 2026-06-13 and are stale relative to the current codebase:
- `shared/identity.md` lists "subscription/monetisation infrastructure" under "what not to build" and states the phase is "restructuring, not new features" — but Stripe (web) and RevenueCat (mobile) subscriptions, audio narration with usage tiers, and EPUB import are already live in the working tree.
- `control/state.md` names the vocabulary collection `vocabulary` — verified against `backend/server.py` (grep, 2026-08-04): the live collection is `saved_words`, matching this brief, not state.md.
- No entry exists yet in `control/decisions.md` or `control/objectives.md` for this project or for the Option A/B graph-architecture decision.

This is COO-owned territory (`control/` and `shared/identity.md` are not in the specialist's write scope) — flagged here rather than edited directly.
