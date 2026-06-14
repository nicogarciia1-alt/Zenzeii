# db-schema.md — MongoDB Collections

**last_verified**: 2026-06-14 by backend-engineer (Block 1 Stripe foundation)

---

## users

Primary user document. Stored in the `users` collection.

| Field | Type | Default | Notes |
|---|---|---|---|
| `id` | str (UUID4) | required | Application-level ID (not `_id`) |
| `email` | str | required | Unique index |
| `username` | str | required | |
| `password` | str | required | bcrypt hash |
| `created_at` | str (ISO8601) | required | |
| `email_verified` | bool | `false` | Must be true before login allowed |
| `vocabulary_count` | int | `0` | Denormalized counter |
| `books_read` | int | `0` | |
| `total_words_read` | int | `0` | |
| `streak` | int | `0` | |
| `last_read_date` | str\|null | `null` | ISO date "YYYY-MM-DD" |
| `subscription_tier` | str | `"free"` | `"free"` \| `"premium"` \| `"founding_member"` |
| `subscription_status` | str | `"none"` | `"none"` \| `"active"` \| `"canceled"` \| `"past_due"` |
| `stripe_customer_id` | str\|null | `null` | Set on first checkout |
| `stripe_subscription_id` | str\|null | `null` | Set for recurring subscriptions; null for one-time |
| `subscribed_at` | datetime\|null | `null` | Timestamp of subscription creation |
| `ai_messages_today` | int | `0` | Free-tier daily AI cap counter (logic in future block) |
| `ai_messages_date` | str\|null | `null` | "YYYY-MM-DD" — used to detect day rollover for cap reset |

**Indexes**: `(id, unique)`, `(email, unique)`

**Notes on subscription_status semantics**: `"canceled"` does NOT mean immediate loss of access. User retains benefits until `subscribed_at + billing_period` passes, then tier reverts to `"free"`. The access-gating logic (future block) must read both `subscription_tier` and `subscription_status` together.

**Pydantic model**: `UserResponse` in `server.py` — uses `ConfigDict(extra="ignore")`. Fields with defaults are populated from defaults for existing user documents that lack the field (Pydantic v2 behavior, confirmed).

---

## books

Global book catalog. Not per-user.

| Field | Type | Notes |
|---|---|---|
| `id` | str | e.g. `"gutenberg-1342"`, `"aozora-kokoro"` |
| `title` | str | |
| `title_jp` | str\|null | |
| `title_en` | str\|null | For Japanese-source books |
| `author` | str | |
| `author_jp` | str\|null | |
| `author_en` | str\|null | |
| `cover_image` | str\|null | URL |
| `description` | str | |
| `description_jp` | str | |
| `total_chapters` | int | |
| `difficulty` | str | `"beginner"` \| `"intermediate"` \| `"advanced"` |
| `genre` | str | |
| `import_status` | str | `"preparing"` \| `"importing"` \| `"completed"` \| `"failed"` \| `"cancelled"` |
| `sentences_count` | int | |
| `book_language` | str | `"en"` \| `"ja"` |
| `source` | str | `"gutenberg"` \| `"aozora"` \| `"upload"` |

**Indexes**: `(id, unique)`

---

## chapters

| Field | Type | Notes |
|---|---|---|
| `id` | str | UUID |
| `book_id` | str | FK → books.id |
| `chapter_number` | int | |
| `title` | str | |
| `title_jp` | str\|null | |
| `sentences_count` | int | |
| `translation_requested` | bool | Worker flag |
| `last_accessed` | str\|null | ISO8601 |

**Indexes**: `(book_id, chapter_number)`, `(translation_requested)`

---

## sentences

**Critical**: DB field names differ from API response names. See transform note below.

| DB field | API field (SentenceResponse) | Notes |
|---|---|---|
| `id` | `id` | |
| `chapter_id` | `chapter_id` | |
| `book_id` | — | Not in response |
| `order` | `order` | |
| `english` | `english` | Primary for EN-source books |
| `kanji_text` | `japanese_kanji` | Mapped by `transform_sentence_for_frontend()` |
| `hiragana_text` | `japanese_hiragana` | |
| `katakana_text` | `japanese_katakana` | |
| `romaji_text` | `japanese_romaji` | |
| `japanese_original` | `japanese_kanji` | JP-source books only; takes priority over `kanji_text` |
| `translation_status` | `translation_status` | `"pending"` \| `"completed"` |
| `source_language` | `source_language` | `"en"` \| `"ja"` |
| `words` | `words` | Token list |

**Indexes**: `(chapter_id, order)`, `(book_id, translation_status)`, `(chapter_id, translation_status)`

---

## user_shelves

Per-user book ownership.

| Field | Type |
|---|---|
| `id` | str (UUID4) |
| `user_id` | str |
| `book_id` | str |
| `added_at` | str (ISO8601) |

**Indexes**: `(user_id, book_id, unique)`, `(user_id)`

---

## reading_progress

| Field | Type |
|---|---|
| `id` | str (UUID4) |
| `user_id` | str |
| `book_id` | str |
| `chapter_id` | str |
| `sentence_id` | str |
| `last_read` | str (ISO8601) |
| `words_read` | int |

**Indexes**: `(user_id, book_id, unique)`, `(user_id)`

---

## saved_words

| Field | Type | Notes |
|---|---|---|
| `id` | str (UUID4) | |
| `user_id` | str | |
| `word` | str | |
| `type` | str | `"word"` \| `"kanji"` |
| `reading` | str | |
| `romaji` | str | |
| `meanings` | list[str] | |
| `parts_of_speech` | list[str] | |
| `example_sentence` | str\|null | |
| `example_translation` | str\|null | |
| `notes` | str | |
| `mastery_level` | int | 0–5 |
| `next_review` | str (ISO8601) | Spaced repetition |
| `times_reviewed` | int | |
| `created_at` | str (ISO8601) | |
| `kanji_form` | str\|null | |
| `hiragana_form` | str\|null | |
| `katakana_form` | str\|null | |
| `romaji_form` | str\|null | |

---

## bookmarks

| Field | Type |
|---|---|
| `id` | str (UUID4) |
| `user_id` | str |
| `book_id` | str |
| `chapter_id` | str |
| `sentence_id` | str |
| `name` | str |
| `created_at` | str (ISO8601) |

---

## password_resets

| Field | Type |
|---|---|
| `token` | str |
| `user_id` | str |
| `email` | str |
| `expires_at` | str (ISO8601) |
| `used` | bool |

**Indexes**: `(token)`

---

## email_verifications

| Field | Type |
|---|---|
| `token` | str |
| `user_id` | str |
| `email` | str |
| `expires_at` | str (ISO8601) |
| `used` | bool |

**Indexes**: `(token)`

---

## import_history

Rate limiting for book imports (3/hour per user).

| Field | Type |
|---|---|
| `user_id` | str |
| `book_id` | str |
| `timestamp` | str (ISO8601) |

---

## app_config

Global application configuration. Single-document per config key.

| `_id` | Fields | Notes |
|---|---|---|
| `"founding_member"` | `total_spots: int`, `spots_remaining: int` | Initialized at app startup via `$setOnInsert` in `lifespan`. Initial values: `total_spots=15, spots_remaining=15`. |

**Write contract**: `spots_remaining` must only be decremented atomically on confirmed Stripe payment, with a guard against going below zero. Decrement logic is NOT yet implemented (Block 2/3). The `$setOnInsert` in lifespan is idempotent — it will not overwrite an existing document.

**Consumer**: Frontend "X spots left" display (Block 4) will read from this document via a backend endpoint (to be added in Block 2/3).
