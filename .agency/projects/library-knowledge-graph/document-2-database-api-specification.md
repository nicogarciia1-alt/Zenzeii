# Zenzeii Literary Knowledge System
## Document 2 — Database & API Specification

**Author**: specialist
**Status**: Draft for COO/Nico review
**Governed by**: [`document-1-conceptual-model.md`](./document-1-conceptual-model.md) — 🔒 frozen constitution. Every decision below is a direct implementation of a Document 1 principle; where this document departs from a literal reading of Document 1, the departure and its reasoning are called out explicitly, never silent.
**Grounded in**: direct inspection of `backend/server.py`, `backend/services/book_import.py`, and existing index definitions (2026-08-04) — not assumption.

---

## 0. What this document is for

Document 1 defined Nodes and Edges without naming a database. This document names one: MongoDB, per the approved storage-shape decision (typed node collections + one universal `relationships` collection — Document 1 §9, `brief.md`). Everything here is additive to what's already running — no existing collection is renamed, no existing route's contract breaks, per working rule 1.

---

## 1. Node Storage: Typed Collections, One Per Node Type

Confirmed by reading the live code rather than assumed: `books` already has a stable, prefix-based id scheme (`aozora-*`, `gutenberg-*`, `upload-*`) with a unique index, and an `import_status` field that already distinguishes lifecycle states (`not_started` → `preparing`/`importing` → `completed`/`failed`). This collection is the working proof that Document 1's "typed collection = node type" model isn't hypothetical — it's already how `books` behaves. Every new node type gets the same treatment.

### 1.1 Id scheme (extends the existing convention)

Every new node type gets a human-readable, prefix-based id, matching how `books` already works — not a raw UUID. Format: `{type_prefix}-{slug}`.

| Node type (Doc 1 §2) | Collection | Id prefix | Example id |
|---|---|---|---|
| Book | `books` (existing, extended) | *(unchanged: `aozora-`, `gutenberg-`, `upload-`)* | `aozora-kokoro` |
| Series | `series` | `series-` | `series-rurouni-kenshin` |
| Adaptation | `adaptations` | `adaptation-` | `adaptation-kitchen-1997-film` |
| Author | `authors` | `author-` | `author-natsume-soseki` |
| Translator | `translators` | `translator-` | `translator-jay-rubin` |
| Illustrator | `illustrators` | `illustrator-` | `illustrator-...` |
| Publisher | `publishers` | `publisher-` | `publisher-shinchosha` |
| Genre / Subgenre | `genres` / `subgenres` | `genre-` / `subgenre-` | `genre-literary-fiction` |
| Theme | `themes` | `theme-` | `theme-impermanence` |
| Mood | `moods` | `mood-` | `mood-melancholic` |
| Cultural Concept | `cultural_concepts` | `concept-` | `concept-mono-no-aware` |
| Setting/Location | `locations` | `location-` | `location-kyoto` |
| Country | `countries` | `country-` | `country-japan` |
| Historical Period | `historical_periods` | `period-` | `period-meiji` |
| Season | `seasons` | `season-` | `season-autumn` |
| Award | `awards` | `award-` | `award-akutagawa-prize` |
| Audience | `audiences` | `audience-` | `audience-young-adult` |
| Difficulty Level | `difficulty_levels` | `difficulty-` | `difficulty-intermediate` |
| Language | `languages` | `language-` | `language-ja` |
| Reading Collection | `reading_collections` | `collection-` | `collection-rainy-day-in-japan` |
| Tag | `tags` | `tag-` | `tag-cats` |

`users` already exists and is untouched — its role as a node (Doc 1 §2.7) is expressed entirely through edges pointing *at* it, not through any schema change to the `users` collection itself.

### 1.2 Universal fields (Document 1 §2.0 — every node collection carries these)

```
id            string, unique-indexed        e.g. "theme-impermanence"
status        enum, indexed                 Draft | Verified | Curated | Deprecated | Hidden
aliases       array<string>, text-indexed   alternate names/scripts resolving to this node
created_at    ISODate
updated_at    ISODate
```

Every collection listed in §1.1 gets `db.<collection>.create_index([("id", 1)], unique=True)` and `db.<collection>.create_index([("status", 1)])`, mirroring the existing `db.books.create_index([("id", 1)], unique=True)` pattern exactly. `aliases` gets a text index on collections where alias search matters most at launch (`books`, `authors`, `themes`, `moods`, `cultural_concepts` — the rest can be added the same way on demand, per working rule 2, one change at a time).

### 1.3 Type-specific attributes

Each collection additionally carries the intrinsic attributes listed for its node type in Document 1 §2.1–§2.7, translated to concrete field names. These are straightforward 1:1 translations (e.g. Theme's "canonical name, Japanese term, short definition" → `name`, `name_jp`, `definition`) and are not repeated in full here to avoid this document drifting out of sync with Document 1 as the single source of truth for *what* the attributes are — Document 2 only fixes *how they're named and typed*. Document 3 will reference this section when it needs to know where a controlled-vocabulary value actually lives.

### 1.4 `books` is extended, not forked — a specific correction to an earlier assumption

An earlier feasibility note (from before this project's Document 1) proposed a new `book_catalog` collection to hold pre-import metadata, on the theory that `books` today only contains books that have started import. Having now read `server.py` directly: `books` documents are created at the moment import *starts* (`import_status: "preparing"`), and `GET /books/available/list` falls back to a synthetic `"not_started"` label only because no document exists yet for catalog-only entries. There is nothing structural stopping a `books` document from existing *before* any import is attempted — the `import_status` field already models exactly this lifecycle.

**Specification**: no `book_catalog` collection. Every catalog book — including the ~700–3,000 non-public-domain entries that will only ever carry metadata + a buy link and never get imported — gets a real `books` document from the moment it's added to the catalog, with `import_status: "not_started"` and a new boolean `importable` field (`false` for buy-link-only entries, `true` for Aozora/Gutenberg/public-domain sources). This is one collection doing one job for every book regardless of import state, which is exactly what Document 1 §1's node test asks for ("would more than one thing ever need to point at the same instance of this") — recommendations, shelf saves, and classification edges all need to reference a book whether or not its text has been imported yet, so it must be one identity from day one.

This is a genuine data-model decision (new field, new required document-creation-timing behavior), flagged per working rule 6 rather than treated as settled — but it is a direct, code-grounded consequence of Document 1's node principle, not a new fork requiring Sato's review. Proceeding on this basis; flag if wrong.

`books`-specific new fields, additive to the existing schema: `importable` (bool), `status` (the universal lifecycle field, §1.2 — retrofit note in §4), `aliases` (universal field, §1.2 — houses what `safe_book_response()` today calls `title`/`title_jp`/`title_en` variants plus romaji and any additional alternate titles).

---

## 2. The Relationships Collection

One collection, `relationships`, for every edge in the system, matching Document 1 §3/§4 field-for-field:

```
id                string, unique                "rel-<uuid4>"
source_type       string, indexed                e.g. "Book"
source_id         string, indexed                e.g. "aozora-kokoro"
target_type       string, indexed                e.g. "Theme"
target_id         string, indexed                e.g. "theme-isolation"
relationship_type string, indexed                e.g. "HAS_THEME"
weight            float, 0.0–1.0, default 1.0
confidence        enum                            Human Curated | AI Generated | Imported | Community
ai_confidence     float, 0–100, nullable           set only when confidence = AI Generated
source             string                          "editor:nico" | "model:gpt-4o-mini-v..." | "import:aozora"
version           int, default 1
notes             string, nullable
created_at        ISODate
updated_at        ISODate
```

**Indexes** (this is the collection the whole system's read performance depends on, so it gets four, not one):

```
db.relationships.create_index(
    [("source_type", 1), ("source_id", 1), ("target_type", 1), ("target_id", 1), ("relationship_type", 1)],
    unique=True
)
db.relationships.create_index([("source_type", 1), ("source_id", 1), ("relationship_type", 1)])
db.relationships.create_index([("target_type", 1), ("target_id", 1), ("relationship_type", 1)])
db.relationships.create_index([("relationship_type", 1), ("confidence", 1)])
```

The first index doubles as the duplicate-edge guard: the same `(source, target, relationship_type)` triple can only exist once — re-asserting it is an *update*, not a new document (see §2.1). The second and third are what make traversal in either direction ("this book's themes" vs. "all books with this theme") an indexed lookup instead of a collection scan, at any scale. The fourth supports moderation queries ("show me all AI-proposed edges awaiting review").

Per Document 1 §3: `relationships` never contains a `book_id` field, a `theme_id` field, or any type-specific column. It only ever knows `source_type`/`source_id`/`target_type`/`target_id`. This is enforced by never adding a type-specific field to this collection, full stop — the day someone proposes `book_id` as a convenience field here is the day the whole portability property Document 1 was built to protect quietly breaks.

### 2.1 Write-path rule: the confidence hierarchy is enforced, not just documented

Document 1 §4 draws a trust distinction between confidence tiers; Document 2 has to decide what happens when two different tiers disagree about the same edge. Specification:

- Writing an edge that doesn't exist yet: insert, `version = 1`.
- Writing an edge that exists with **the same or lower** trust tier (`Human Curated` > `Imported` > `AI Generated`/`Community`, treated as equal-lowest for now): update in place, `version += 1`, `updated_at` refreshed.
- Writing an edge that exists with a **higher** trust tier than the incoming write (e.g. an AI job re-proposing an edge an editor already hand-curated): **rejected**. The existing edge is untouched. The API returns a `409`-style conflict response so the caller (an enrichment job, typically) can log it as "superseded by curation" rather than silently overwriting editorial judgment.

This is the concrete mechanism behind Sato's "future Nico will thank present Nico" observation on provenance — without it, an overnight AI enrichment run could quietly downgrade curated data, and nobody would notice until search results got worse.

---

## 3. Migration & Rollout — Existing Data

Nothing is deleted or renamed. Two backfills, run once, each a standalone reversible script (per working rule 2 — one change, tested, before the next):

1. **Retrofit existing `books` documents** with the new universal fields: `status: "Verified"` (they're live and working — they don't start at `Draft`), `aliases: []` (populated later, not blocking), `importable: true` (they were already imported).
2. **Convert `AOZORA_BOOKS`/`GUTENBERG_BOOKS`'s flat `genre`/`difficulty` strings into real edges**: for each of the ~16 books currently hardcoded, create (or find-and-reuse) the matching Genre and Difficulty Level nodes, then write `HAS_GENRE`/`HAS_DIFFICULTY` edges with `confidence: "Imported"` (they were, until now, hardcoded facts, not editorial judgment — accurately labeled as such rather than backdated to `Human Curated`). This is also the proof-of-concept for every future bulk import.

The hardcoded dicts in `book_import.py` are not deleted in this same change — they become dead code only once §5's catalog endpoints are live and verified against them, at which point removing them is a separate, small, easy-to-review diff. Not doing both at once, per working rule 5.

---

## 4. API Endpoints

### 4.1 Catalog admin — one generic route family, not twenty near-identical ones

A hand-written route per node type (`/api/catalog/themes`, `/api/catalog/moods`, `/api/catalog/genres`, ×20) would be exactly the kind of repetition that becomes unmaintainable at this scale, and it's unnecessary: every node type shares the same shape of operation (create/list/get/update/status-transition) and only differs in which collection and which type-specific fields apply. One parameterized route family, backed by a small in-code registry:

```python
NODE_TYPE_REGISTRY = {
    "theme":      {"collection": "themes",      "id_prefix": "theme"},
    "mood":       {"collection": "moods",       "id_prefix": "mood"},
    "genre":      {"collection": "genres",      "id_prefix": "genre"},
    # ... one line per node type in §1.1, Book excluded (see below)
}
```

```
GET    /api/catalog/{node_type}                 list, paginated (§4.4), filterable by status
GET    /api/catalog/{node_type}/{id}             detail
POST   /api/catalog/{node_type}                  create — status defaults to "Draft"
PATCH  /api/catalog/{node_type}/{id}              update type-specific attributes
PATCH  /api/catalog/{node_type}/{id}/status       lifecycle transition (admin-only)
```

`{node_type}` not present in the registry → `404`, not a silent no-op. `Book` is deliberately **excluded** from this generic family — it already has its own, much richer route surface (`/api/books/...`, import pipeline, upload, etc.) and forcing it through the generic catalog CRUD would be the "special-case Book" mistake in reverse. Book's catalog-specific needs (editing its classification edges) go through §4.2 like every other node's relationships do.

### 4.2 Relationships

```
POST   /api/graph/relationships     create/upsert an edge — applies the confidence-hierarchy rule (§2.1)
GET    /api/graph/relationships     query params: source_type, source_id, target_type, target_id,
                                     relationship_type (any combination) — the one endpoint that answers
                                     both "what are this book's themes" and "what books have this theme"
DELETE /api/graph/relationships/{id}
```

### 4.3 Public discovery

```
GET    /api/books/available/list    UNCHANGED route and response shape. Internals swap: reads real
                                     books + resolved genre/difficulty edges instead of the hardcoded
                                     dicts. No frontend change required to keep working; the frontend
                                     rewrite already flagged in the original brief is a separate,
                                     later change that then adds the richer facets below.

POST   /api/library/search          the actual discovery engine (Document 1's "north star" query).
                                     Body: any combination of facet filters —
                                     { themes: [...], moods: [...], settings: [...], seasons: [...],
                                       difficulty: [...], audience: [...], length: {max_words: ...} }
                                     Returns paginated Book summaries. Query design: §5.

GET    /api/collections             list Reading Collections (curated + dynamic), summary view
GET    /api/collections/{id}/books  resolve membership — MEMBER_OF edges for curated, live filter
                                     evaluation for dynamic (Document 1 §6)
```

A new response shaper, `catalog_book_response()`, is added alongside — not instead of — the existing `safe_book_response()`. They serve different call sites: `safe_book_response()` is the reader-facing shape for a book already on a user's shelf (chapters, sentences_count, reading state); `catalog_book_response()` assembles a Book node's attributes *plus its resolved classification edges* (themes, moods, genres as expanded arrays, not ids) for browse/search/discovery contexts. Confirmed by reading `safe_book_response()` directly: it has no mechanism for edge data at all, so this isn't a fix to a bug, it's a genuinely separate concern — additive, per working rule 1.

### 4.4 Pagination

Catalog admin lists (§4.1) and small collections stay `skip`/`limit` — nobody is paginating through more than a few hundred Draft themes. `/api/library/search` and `/api/books/available/list`'s eventual replacement use an opaque cursor (`after=<base64(created_at,id)>`) instead: at 700 books today, growing to 3,000+, `skip`-based paging degrades and — more importantly — shifts results under the user as new books are added mid-scroll, which a cursor avoids by construction.

---

## 5. Search Query Design

At today's and the planned scale (hundreds to low thousands of books, not millions), the simplest correct approach beats an elaborate aggregation pipeline: **resolve each facet as an indexed set lookup against `relationships`, then intersect in application code.**

For `POST /api/library/search` with `{ moods: ["mood-reflective"], seasons: ["season-autumn"], themes: ["theme-memory"] }`:

1. For each facet, one indexed query against `relationships` using the `(target_type, target_id, relationship_type)` index — e.g. `find({target_type: "Mood", target_id: "mood-reflective", relationship_type: "HAS_MOOD"})`, projecting `source_id`. Fast: this is exactly the index built in §2.
2. Intersect (AND) or union (OR) the resulting `source_id` sets per the request's boolean structure — trivial set math at this scale, no join needed.
3. Fetch the final `books` documents by `{id: {$in: [...]}, status: "Verified"}` (or `Curated`), apply any non-graph filters (difficulty range, word count) as ordinary field filters, paginate per §4.4.

This is also what makes a **dynamic Reading Collection** (Document 1 §6) nothing more than a *stored* version of steps 1–3 — the same code path, with the filter definition read from the collection's `generation_rule` field instead of the request body.

If the graph later migrates to a dedicated graph engine (the entire reason Document 1 insists on the node/edge abstraction), this is the one section of Document 2 that gets rewritten — the query implementation changes, `POST /api/library/search`'s contract does not. That is the portability principle actually paying off, not just asserted.

---

## 6. What Document 2 Does Not Define

- The full enumerated controlled vocabulary (which Themes, Moods, etc. actually exist) → **Document 3**
- The admin UI for curators to create/edit nodes and edges → future, out of scope for these three documents
- The implementation of any AI enrichment job that *writes* `AI Generated` edges → future; this document only specifies the write-path contract (§2.1) such a job must honor
- Removal of `AOZORA_BOOKS`/`GUTENBERG_BOOKS` from `book_import.py` → a small follow-up change once §4.3 is verified working (§3)

---

## 7. Summary

Every section above is traceable to a specific Document 1 principle: typed collections because Book and Author attributes don't belong in one bag (§1); a single generic `relationships` collection because the edge mechanism must never know what a Book is (§2); a confidence hierarchy enforced at write time, not just described, because provenance that isn't enforced isn't provenance (§2.1); one generic catalog route family because repeating the same CRUD twenty times is the tag-array mistake wearing a different hat (§4.1); set-intersection search because the simplest correct implementation of "the graph generates the shelf" beats a clever one at this scale (§5). Nothing here contradicts the constitution — where a new decision was needed that Document 1 didn't already settle (§1.4, the `books`-not-`book_catalog` call), it's marked as exactly that, not smuggled in as if it were always obvious.
