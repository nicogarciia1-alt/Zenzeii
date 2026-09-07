# Zenzeii Literary Knowledge System
## Document 1 — Conceptual Model

**Author**: specialist (per COO brief, 2026-08-04)
**Status**: 🔒 FROZEN — approved by Chief Librarian (Professor Sato), 2026-08-04. This is the constitution: every node/relationship added in Document 2, Document 3, and all future catalog engineering is judged against the principles in this document. Do not edit to "polish" — only a genuine correction of fact, or a new decision by Nico/Sato through the same review process that approved it, may amend it. Extend via new documents, not by reopening this one.
**Depends on**: nothing (database-agnostic by design)
**Feeds into**: Document 2 (Database & API Specification), Document 3 (Metadata & Taxonomy Standard)

---

## 0. How to read this document

This document defines *what exists and what connects to what* — never how it is stored. No collection names, no indexes, no endpoint shapes. That is Document 2's job. This document should read the same whether the underlying store is MongoDB, Neo4j, or index cards. Where an existing Zenzeii collection already embodies a concept described here (e.g. `books`), it is named for orientation only — not as a storage decision.

**A note on the name.** Internally, engineers will keep saying "the graph" — that's an accurate description of the implementation, and this document uses the word freely when discussing edges and traversal. But the product is not a graph; the product is **knowledge**. A librarian doesn't think in nodes and edges — they think in "what is this, what is it about, who is it for, where does it belong." The graph is how we *build* that. The knowledge is what a reader *experiences*. Hence the document title.

---

## 1. Core Principle

> **The relationship model is the product. The database is only the implementation.**

A book is not an isolated document with tag arrays bolted on. A book exists because it is woven into a web of authors, themes, moods, settings, other books, and readers. That web — not any single book record — is what makes Zenzeii's library smarter with every addition instead of just bigger.

Two consequences follow directly, and govern every section below:

1. **Everything reusable is a Node.** "Melancholic" is not a string that gets copy-pasted onto forty books. It is one Mood node that forty Book nodes each point to. Renaming, translating, or enriching it happens once.
2. **Everything that connects two things is an Edge**, not a field. An edge has a type, a direction, and — critically — its own metadata (how confident are we, who/what asserted it, when). A field on a document can't carry that; an edge can.

The practical test for "should this be a Node?": *would more than one book ever need to point at the exact same instance of this thing?* If yes, it's a Node. If it's a fact that belongs to exactly one book and nothing else references it (e.g. a book's word count), it's a plain attribute on that book, not a node.

---

## 2. Node Catalog

Every node type below has: a **definition**, its **intrinsic attributes** (properties that live on the node itself, because they don't depend on any other node), and **illustrative instances**. Attributes that describe a *relationship to something else* are deliberately absent here — they appear in §3 as edges instead. This is the discipline that keeps the model from regressing into "tag arrays with extra steps."

### 2.0 Universal attributes — every node, regardless of type

Four things exist on every node type in this catalog, on top of whatever is type-specific:

- **`id`** — a stable, globally unique identity. Today's Book id scheme (`aozora-*`, `gutenberg-*`, `upload-*`) is one working example of this; every other node type needs the equivalent.
- **`status`** (the lifecycle) — `Draft` → `Verified` → `Curated` → `Deprecated` → `Hidden`. A node doesn't appear (or ranks lower) in discovery until it's `Verified`; `Curated` marks the ones an editor has personally reviewed and enriched, not just auto-imported; `Deprecated` and `Hidden` let bad or retired entries fall out of search without deleting the history attached to them. This is what makes automated import safe: a script can create a hundred `Draft` Author nodes overnight, and nothing reaches a reader until a human (or a trusted process) promotes them.
- **`aliases`** — every alternative name a node is known by, all resolving search to the same canonical node. `Book`'s existing "alternative titles" attribute (§2.1) *is* this mechanism, scoped to books; every other named node type gets the same capability. Example — the Author node for 夏目漱石 resolves searches for "Natsume Sōseki," "Soseki," "Sōseki Natsume," and "夏目漱石" to one node, not four.
- **`created_at` / `updated_at`** — standard provenance timestamps, independent of any edge's own timestamps.

These aren't repeated in every node's attribute list below to avoid restating them twenty times — they apply uniformly.

### 2.1 Content nodes

**Book**
The central node. One per distinct literary work (not per edition/printing).
- Intrinsic attributes: Japanese title, English title, romaji title, alternative titles (this node type's instance of the universal aliases mechanism, §2.0), subtitle, original publication year, ISBN(s), copyright/public-domain status, page count, estimated reading time, word count, reading direction, furigana available, audio available, translation available, short description, long description, "why read this", vocabulary difficulty index (word-frequency-by-JLPT-band — see §8), source identifiers (aozora_url, gutenberg_id), buy_link, upload_allowed.
- Everything about *who wrote it, what it's about, who it's for, and what it relates to* is an edge, not an attribute — that's what makes the graph queryable instead of just filterable.
- Instance: *Kitchen* (キッチン) by Banana Yoshimoto.

**Series**
A named sequence a Book may belong to (e.g. a trilogy).
- Attributes: name, description, planned/completed status.

**Adaptation**
A non-book work derived from a Book — a film, anime, drama, stage play.
- Attributes: title, adaptation type (film/anime/drama/stage/manga), release year, external link.
- Deliberately its own node type rather than a field on Book, because an adaptation can itself be discussed, rated, and connected to other adaptations (a film series, a shared director) independent of the source book.

### 2.2 Contributor nodes

**Author**, **Translator**, **Illustrator**, **Publisher**
- Attributes (Author): name (Japanese + romanized), gender, birth/death year, nationality, short biography.
- Attributes (Translator/Illustrator): name, notable works.
- Attributes (Publisher): name, country, founding year.
- These are separate node types, not one generic "Person" node, because a Publisher isn't a person and collapsing Author/Translator/Illustrator into one type would blur relationship semantics (see §3 — `WRITTEN_BY` vs `TRANSLATED_BY` targeting "the same kind of thing" is fine; the node types stay distinct because their attribute sets diverge and future features — author pages vs translator credits — need to query them independently).

### 2.3 Classification nodes (the taxonomy proper)

**Genre**, **Subgenre**, **Theme**, **Mood**, **Cultural Concept**
- Attributes: canonical name (English), Japanese term where relevant (e.g. 物の哀れ for "Mono no Aware"), short definition, aliases (synonyms that should resolve to this same node — see §5).
- These are the reusable vocabulary at the heart of the "everything reusable" principle. A book never stores the string `"melancholic"`; it holds an edge to the one Mood node named *Melancholic*.
- Illustrative Theme instances: Grief, Family, Impermanence, Coming of Age, Isolation, Nature, Memory.
- Illustrative Mood instances: Melancholic, Gentle, Whimsical, Reflective, Peaceful, Unsettling.
- Illustrative Cultural Concept instances: Mono no Aware, Wabi-Sabi, Giri, Everyday Japan, Yokai folklore.

### 2.4 Context nodes

**Setting/Location**, **Country**, **Historical Period**, **Season**, **Award**
- Attributes (Location): name, region, country (edge or attribute — see note below), is_fictional.
- Attributes (Historical Period): name (e.g. Meiji, Taisho, Showa, Heisei), start year, end year.
- Attributes (Season): name (Spring, Summer, Autumn, Winter) — a small, closed set; still modeled as nodes (not an enum on Book) because Seasons are also targets of Mood/Theme association independent of any book (a future "Seasonal Reading" collection needs to reason about Season on its own).
- Attributes (Award): name, awarding body, country, founding year.
- Note on Location→Country: whether "set in Kyoto" implies "set in Japan" automatically is a Document 2 query-design question (derived vs. explicit edge), not a Document 1 concern.

### 2.5 Audience & difficulty nodes

**Audience**, **Difficulty Level**, **Language**
- Attributes (Audience): name (Children, Young Adult, Adult, General).
- Attributes (Difficulty Level): name, corresponding JLPT band (N5–N1), description of what "Intermediate" means in Zenzeii's terms.
- Attributes (Language): name, ISO code. Exists as a node (not a Book field) because Translator/Publisher/Award relationships are all language-scoped and benefit from a shared reference.

### 2.6 Curation nodes

**Reading Collection**
A named, discoverable grouping of books — "Rainy Day in Japan," "Mono no Aware Starter Set." See §6 for the curated-vs-dynamic distinction; both kinds are the same node type, they differ only in how membership is determined.
- Attributes: name, description, cover treatment, curated_by (human editor) or generation_rule (if dynamic).

**Tag**
A catch-all, lower-ceremony node type for attributes that don't yet warrant a first-class category (Cats, Tea, Rain, Yokai, School Setting). Tags graduate to their own node type (e.g. a proper Cultural Concept) when the taxonomy team decides they need richer attributes or their own edge semantics. This is the release valve that keeps §5's controlled vocabulary from needing to anticipate every future facet on day one.

### 2.7 User-layer nodes

**User** already exists as Zenzeii's account entity. In graph terms it is a node like any other — the difference is that its edges (§3) are the ones that turn the catalog into a personalized experience: saved books, shelves, ratings, reviews, followed collections.

---

## 3. Relationship (Edge) Catalog

Every edge has the same universal shape, regardless of what it connects. This is the single most important discipline in the whole model: **the relationship mechanism itself must never special-case any node type, "Book" included.** An edge only ever knows four structural facts — where it comes from, where it goes, what kind of node each end is, and what kind of connection this is:

| Field | Meaning |
|---|---|
| `source_id` / `source_type` | the origin node's id and node type (e.g. a Book id, typed `Book`) |
| `target_id` / `target_type` | the destination node's id and node type |
| `relationship_type` | one of the typed verbs below, or a future one added to this catalog |
| `weight` | strength/relevance of *this connection*, 0.0–1.0 (e.g. how similar two books are, how central a theme is to the book) — optional, defaults to 1.0 for boolean relationships |
| `confidence` | the provenance tier — see §4 |
| `ai_confidence` | the asserting model's own certainty, 0–100%; populated only when `confidence = AI Generated` — distinct from `weight`, which is about the relationship's domain strength, not the model's self-reported certainty |
| `source` | specifically what asserted this (an editor's name, a model + version string, an import source name) |
| `version` | increments on every re-assertion of this edge — see §4 |
| `created_at` / `updated_at` | provenance timestamps |
| `notes` | free text, for editorial context |

Because `source_type`/`target_type` are explicit data, not hardcoded schema, adding a wholly new pairing the catalog didn't anticipate — say, `Author —INFLUENCED_BY→ Literary Movement`, the day Zenzeii adds Literary Movement as a node type — requires adding one new node type and, if needed, one new relationship type to this catalog. Nothing about the relationship storage itself changes. That portability is the entire point of the edge model.

### Catalog edges (Book → classification)

| Relationship | Source → Target | Direction | Cardinality |
|---|---|---|---|
| `HAS_GENRE` | Book → Genre | one-way | many-to-many |
| `HAS_SUBGENRE` | Book → Subgenre | one-way | many-to-many |
| `HAS_THEME` | Book → Theme | one-way | many-to-many |
| `HAS_MOOD` | Book → Mood | one-way | many-to-many |
| `HAS_CULTURAL_CONCEPT` | Book → Cultural Concept | one-way | many-to-many |
| `SET_IN` | Book → Setting/Location | one-way | many-to-many |
| `SET_IN_PERIOD` | Book → Historical Period | one-way | usually one, allows many |
| `EVOKES_SEASON` | Book → Season | one-way | many-to-many |
| `SUITABLE_FOR` | Book → Audience | one-way | many-to-many |
| `HAS_DIFFICULTY` | Book → Difficulty Level | one-way | one |
| `TAGGED` | Book → Tag | one-way | many-to-many |
| `WON` | Book → Award | one-way | many-to-many |
| `IN_LANGUAGE` | Book → Language | one-way | one (original), plus one per available translation |

### Contributor edges

| Relationship | Source → Target | Notes |
|---|---|---|
| `WRITTEN_BY` | Book → Author | usually one, allows co-authorship |
| `TRANSLATED_BY` | Book → Translator | one per target language |
| `ILLUSTRATED_BY` | Book → Illustrator | |
| `PUBLISHED_BY` | Book → Publisher | current publisher; historical publishers can coexist with a `notes` distinction |
| `PART_OF_SERIES` | Book → Series | carries `volume_number` in `notes`/a structured field |

### Relationship-engine edges (the actual recommendation layer — Layer 4 of the original brief)

| Relationship | Source → Target | Notes |
|---|---|---|
| `SIMILAR_TO` | Book → Book | symmetric in practice, stored one direction, `weight` = similarity strength, `confidence` distinguishes editorial pairing from AI-computed similarity |
| `INSPIRED_BY` | Book → Book | directional, historical/literary lineage |
| `ADAPTED_TO` | Book → Adaptation | |
| `RECOMMENDED_AFTER` | Book → Book | directional, "if they finished X, suggest Y" — distinct from `SIMILAR_TO`: similarity is about content, this is about reading-journey sequencing |
| `INFLUENCED` | Author → Author | literary lineage at the author level, independent of any single book pairing |

### Curation edges

| Relationship | Source → Target | Notes |
|---|---|---|
| `MEMBER_OF` | Book → Reading Collection | only used for **curated** collections (see §6); dynamic collections have no membership edges at all — membership is computed |

### User-layer edges

| Relationship | Source → Target | Notes |
|---|---|---|
| `SAVED` | User → Book | shelf/library add — maps to today's `user_shelves` |
| `RATED` | User → Book | carries a `value` (1–5) |
| `REVIEWED` | User → Book | carries review text |
| `FOLLOWS` | User → Reading Collection | |
| `READING` | User → Book | carries reading-progress state — conceptually an edge; whether it stays a dedicated fast-path collection (today's `reading_progress`) or becomes a literal edge is a Document 2 performance question, not a conceptual one |

A relationship type is **never** invented ad hoc per feature. New relationship types are proposed the same way new node types are: added to this catalog, reviewed, then used. This is what keeps the graph from drifting back into unstructured tag soup one feature at a time.

---

## 4. Provenance & Confidence Model

Every edge — not just AI-assisted ones — carries `confidence`, `source`, and `version`. This is not bureaucracy; it's what makes AI-assisted enrichment safe to turn on later without corrupting editorial trust, and what makes the knowledge safe to *revise* as understanding improves.

**`confidence` — four canonical tiers:**

- **`Human Curated`** — an editor (Nico, or a literary consultant like Professor Sato) explicitly asserted this relationship. Treated as ground truth in search ranking.
- **`AI Generated`** — proposed by a model (e.g. GPT-4o-mini reading the text and proposing `HAS_THEME → Loneliness`). Carries `ai_confidence` (the model's own certainty, e.g. 92%) in addition to `weight` (how strongly the theme applies, a separate, editorial-facing number). Surfaced in search but visually distinguishable from curated edges, and reviewable in bulk by an editor.
- **`Imported`** — came directly from a structured external source as-is (an Aozora/Gutenberg metadata field, an ISBN registry entry). Not a judgment call by anyone — a fact copied from elsewhere.
- **`Community`** — schema anticipates this even though nothing populates it yet: a future reader-submitted tag or correction, held to a lower trust tier than curated or imported until promoted.

A fifth, narrower case — **mechanically derived** edges (e.g. "set in Kyoto" plus "Kyoto is in Japan" producing a `SET_IN → Japan` edge nobody asserted directly) — is an internal query-optimization technique, not a fifth editorial tier. Document 2 will specify whether these are materialized as `Imported`-tagged edges with `source = "derived:location-hierarchy"` or computed at query time; either way, they never appear as a distinct option in an editor-facing confidence picker.

**`ai_confidence`** is deliberately a separate number from `weight`. `weight` says how strong the relationship *is* in the world (how central grief is to this book); `ai_confidence` says how sure the *model* is about its own claim. A model can be 95% confident about a weak, minor theme, or 40% confident about what turns out to be the book's central one — collapsing the two would lose exactly the information an editor needs to decide what to review first.

**`version`** increments every time an edge is re-asserted or its `weight`/`confidence` changes — not on every read. Themes get reinterpreted, similarity scores get recomputed as the catalog grows, AI proposals get superseded by better models. Without a version, a "why did this book's recommendations change" question has no answer; with it, migrations and audits are mechanical instead of forensic.

---

## 5. Controlled Vocabulary — Shape, Not Full List

This document defines the **categories** and the **rules for adding to them**. The exhaustive list of every valid value is Document 3's job. The rules that apply to every classification node type (Genre, Theme, Mood, Cultural Concept, Setting, Historical Period, Audience, Difficulty, Season):

1. **One canonical node per concept.** "Bittersweet" and "Melancholic" are not two Mood nodes unless a curator has decided they mean genuinely different things to a reader. If they're synonyms, one is the canonical node and the other is an alias on it.
2. **English canonical name, Japanese term as an attribute where the concept is culturally specific** (Cultural Concepts especially — Mono no Aware keeps its Japanese term as primary identity, with an English gloss, not the reverse).
3. **No node is created by a book-import flow on the fly.** New classification values go through the taxonomy standard (Document 3) first. This is what prevents the catalog from re-accumulating hardcoded, unsynced, one-off tags — the exact problem this project replaces.
4. **A Tag (§2.6) is the only exception** — it's the deliberately low-ceremony entry point for something worth marking before it's worth formalizing.

---

## 6. Dynamic Collections

A Reading Collection is one node type with two membership mechanisms:

- **Curated**: explicit `MEMBER_OF` edges, added by an editor one book at a time. Used when human judgment matters more than mechanical consistency (a "Nico's Picks" shelf).
- **Dynamic**: no membership edges at all. Membership is a stored *filter definition* — a boolean combination of edge-type + target-node conditions — evaluated at query time.

Example — "Rainy Day in Japan":
```
(HAS_MOOD → Rain) OR (HAS_MOOD → Reflective)
AND (EVOKES_SEASON → Autumn)
AND (HAS_MOOD → Cozy OR TAGGED → Cafe OR HAS_THEME → Memory)
```
Adding a new book that happens to satisfy this filter joins the collection automatically the moment its classification edges are added — no editor visits the collection page ever again. This is Layer 5 of the original vision, realized directly by the edge model: a dynamic collection is nothing more than a saved graph query.

---

## 7. Reading Completion Signals

Average chapter where readers stop, average session length, re-read frequency. These are **not** classification edges — no curator or AI ever "asserts" that a book has a stop-rate. They are computed, aggregated, anonymized statistics that live as attributes on Book (or a dedicated stats surface in Document 2), derived from existing reading-session data Zenzeii already has. They participate in search as *filters* ("books readers actually finish") the same way a Theme edge does, but they are not part of the taxonomy graph itself — this distinction matters so Document 2 doesn't try to model "80% completion rate" as a Node, which it isn't.

---

## 8. AI-Generated Content Fields (Future Layer)

Two categories, kept conceptually distinct even though both may be AI-produced:

- **AI content that describes one specific book and is not reusable** (AI summary, AI discussion questions, AI reading guide) — these are **attributes on the Book node**, not edges, because no other book would ever point at the same instance of "this book's discussion questions."
- **AI content that reuses existing taxonomy** (AI proposing `HAS_THEME → Loneliness` with `confidence = AI Generated`) — these are ordinary **edges**, using the exact same relationship types as human-curated ones, distinguished only by `confidence` and `source` per §4.

Schema anticipates both (empty initially) rather than bolting them on later, per the original brief.

Vocabulary difficulty index (word-frequency mapped to JLPT band, mentioned in §2.1) is a related but distinct concept: it's a computed property of the book's actual text (already tokenized by `fugashi`/`unidic-lite` today), not an AI judgment call — it belongs with the "computed, not asserted" attributes alongside §7's completion signals.

---

## 9. Relationship to the Existing Live Data Model

Nothing here requires renaming or migrating what's already running. Mapping for orientation:

| Existing (live today) | Graph-model role |
|---|---|
| `books` collection | Book node storage — already has a stable id scheme (`aozora-*`, `gutenberg-*`, `upload-*`) that works as a node identity |
| `saved_words` | unrelated — per-user vocabulary (words/kanji, not books); not part of this graph |
| `user_shelves` | today's `SAVED` edge (User → Book), pre-graph implementation |
| `reading_progress` | today's `READING` edge (User → Book), pre-graph implementation |
| `AOZORA_BOOKS` / `GUTENBERG_BOOKS` (hardcoded dicts in `services/book_import.py`) | the thing this project replaces — becomes real Book nodes plus their classification edges |
| `ZenzeiiLibraryPage.jsx` static array | frontend consumer, becomes an API client against the new catalog (already flagged in the original brief as needing a rewrite, not an extension) |

No existing collection is touched by Document 1. Document 2 will specify exactly how the new node/edge collections sit alongside these without disrupting them — consistent with working rule 1 (never rewrite working code).

---

## 10. What Document 1 Deliberately Does Not Define

- MongoDB collection names, field names, indexes → **Document 2**
- API endpoint shapes, pagination, search query syntax → **Document 2**
- The full enumerated value list for every classification node type → **Document 3**
- The exact MongoDB shape of typed node collections plus one universal `relationships` collection (approved direction, per §9 and `brief.md`) → **Document 2** writes the actual schema

---

## 11. Extensibility Test

Professor Sato's acceptance question for this model: *can every future feature of Zenzeii be represented by adding nodes and relationships, without redesigning the architecture?* Walking it through concretely, rather than asserting it:

- **Anime/film adaptations** — already covered: Adaptation node (§2.1), `ADAPTED_TO` edge. No change needed.
- **Literary movements** (e.g. "I-novel," Shōwa-era naturalism) — a new node type, connected via a new `PART_OF_MOVEMENT` edge (Book/Author → Literary Movement) and `INFLUENCED` edges between movements. Additive.
- **Festivals, prefectures, schools, cafes** — all instances of the existing Setting/Location node type (§2.4), or Tag (§2.6) if they don't yet warrant a full node. No new mechanism required.
- **Characters** (a recurring protagonist across a series, or a culturally significant literary figure like Botchan) — a new node type, connected via `APPEARS_IN` (Character → Book) and `SIMILAR_TO`-style edges between characters. Additive.
- **User-created lists** ("my favorite melancholy books") — already the same mechanism as curated Reading Collections (§2.6, §6), scoped to a user instead of an editor; `MEMBER_OF` edges, `owner` distinguishing user-created from editorial.
- **A future non-Japanese-literature vertical** (if Zenzeii ever expanded language scope) — Language is already a node (§2.5), not a hardcoded assumption; the taxonomy nodes (Theme, Mood, Cultural Concept) are language-agnostic by design.

In every case: a new node type, and/or a new relationship type, added to the catalogs in §2 and §3. The storage shape, the API shape, and the query engine described in Document 2 do not change to accommodate any of these. That is the test this document is built to pass — if a future feature ever required touching the relationship mechanism itself rather than just adding to its vocabulary, that would be the signal to redesign now rather than patch later. Nothing identified above requires that.

---

## 12. Summary

Four questions, four answers, all expressed the same way — a node with attributes, connected by typed, provenanced edges to other nodes:

1. **What is this book?** — the Book node's intrinsic attributes, plus its Contributor and Series edges.
2. **What is it about?** — its Theme, Mood, Cultural Concept, and Setting edges.
3. **Who should read it?** — its Audience, Difficulty, and Language edges.
4. **Where does it belong?** — its Genre/Subgenre edges, its Collection memberships (curated or dynamic), and its Similar/Inspired/Recommended-After edges to other books.

Books happen to be the largest node type today. The model does not know that, and never needs to — which is exactly the property that lets it grow into anime, films, literary movements, and everything else in Zenzeii's future without a redesign.
