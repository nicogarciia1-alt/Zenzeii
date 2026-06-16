# api-contracts.md — Backend API Contracts

All endpoints live under `/api`. Auth-required endpoints expect `Authorization: Bearer <jwt>` header.

**last_verified**: 2026-06-16 by backend-engineer (audiobook mode endpoints added)

---

## Auth

### POST /api/auth/register
**Auth**: none
**Body**: `{ email, password, username }`
**Response**: `TokenResponse` — `{ access_token, token_type, user: UserResponse }`
**Errors**: 400 (email taken / not verified)

### POST /api/auth/login
**Auth**: none
**Body**: `{ email, password }`
**Response**: `TokenResponse`
**Errors**: 401 (invalid credentials), 403 (email not verified)

### GET /api/auth/me
**Auth**: required
**Response**: `UserResponse`

`UserResponse` shape (as of Block 1+2):
```json
{
  "id": "uuid",
  "email": "...",
  "username": "...",
  "created_at": "ISO8601",
  "vocabulary_count": 0,
  "books_read": 0,
  "total_words_read": 0,
  "streak": 0,
  "last_read_date": null,
  "email_verified": false,
  "subscription_tier": "free",
  "subscription_status": "none",
  "stripe_customer_id": null,
  "stripe_subscription_id": null,
  "subscribed_at": null,
  "ai_messages_today": 0,
  "ai_messages_date": null
}
```

### PATCH /api/auth/profile
**Auth**: required
**Body**: `{ username?, password? }`
**Response**: `{ message }`

### POST /api/auth/forgot-password
**Auth**: none
**Body**: `{ email }`
**Response**: `{ message }` (always 200, even if email not found — avoids enumeration)

### POST /api/auth/reset-password
**Auth**: none
**Body**: `{ token, new_password }`
**Response**: `{ message }`
**Errors**: 400 (invalid/expired token)

### GET /api/auth/verify-email?token=...
**Auth**: none
**Response**: `{ message }`
**Errors**: 400 (invalid/expired token)

---

## Payments

### POST /api/payments/create-checkout-session
**Auth**: required
**Body**: `{ "tier": "premium" | "founding_member" }`
**Response**: `{ "checkout_url": "https://checkout.stripe.com/..." }`

**Success flow**: frontend redirects user to `checkout_url`. After payment, Stripe redirects to `https://zenzeii.com/payment-success?session_id={id}`.

**Cancel flow**: Stripe redirects to `https://zenzeii.com/payment-canceled`.

**Errors**:

| Status | Condition | `detail` value |
|---|---|---|
| 400 | `tier` is not `"premium"` or `"founding_member"` | `"Invalid tier. Must be 'premium' or 'founding_member'."` |
| 400 | User already has `subscription_tier` of `"premium"` or `"founding_member"` | `"Already subscribed. You already have an active plan."` |
| 409 | `tier == "founding_member"` and `spots_remaining == 0` | `"Founding member spots are sold out."` |
| 503 | `STRIPE_SECRET_KEY` not configured (deployment error) | `"Payment system not available."` |
| 500 | Stripe API call failed | `"Payment session could not be created. Please try again."` |

**Notes for frontend-engineer (Block 4)**:
- On 409: show "Sold out" state on the founding-member CTA — no retry useful
- On 400 "Already subscribed": this shouldn't normally be reachable if you gate the button on `subscription_tier`, but handle gracefully
- On 500: show generic retry message
- The `checkout_url` is a full Stripe-hosted URL — do `window.location.href = checkout_url` (not router navigation)

---

### POST /api/webhooks/stripe
**Auth**: none (signature-verified — `stripe-signature` header checked against `STRIPE_WEBHOOK_SECRET`)
**Body**: raw bytes (Stripe event payload — do NOT parse as JSON before passing to signature verifier)
**Response**: `{ "status": "ok" }` or `{ "status": "already_processed" }` on successful handling

**Always returns 200** for any event we don't explicitly handle (logged as "unhandled event type").

**Errors**:

| Status | Condition |
|---|---|
| 400 | Invalid or missing Stripe signature |
| 500 | Handler threw an unexpected exception (dedupe record NOT written — Stripe will retry) |

**Events handled**:

| Event | Effect |
|---|---|
| `checkout.session.completed` | Updates user: `subscription_tier`, `subscription_status: "active"`, `stripe_customer_id`, `stripe_subscription_id` (if subscription mode), `subscribed_at` |
| `checkout.session.expired` | If `tier == "founding_member"`: increments `app_config.founding_member.spots_remaining` by 1 (bounded by `total_spots`) |
| `customer.subscription.updated` | Sets `subscription_status: "canceled"` (if `cancel_at_period_end: true`) or `"active"` (if reversed). Does NOT change `subscription_tier` — access continues until period end. |
| `customer.subscription.deleted` | Sets `subscription_tier: "free"`, `subscription_status: "none"`, clears `stripe_subscription_id` |

**Idempotency**: each event is deduplicated by `event.id` stored in the `stripe_events` collection. Re-delivered events return 200 immediately without re-processing.

**Not called by frontend** — this is a Stripe → backend server-to-server call.

---

## Books

### GET /api/books
**Auth**: required
**Response**: `BookResponse[]` — books on the user's shelf

### GET /api/books/available/list
**Auth**: required
**Query**: `?source=gutenberg|aozora` (optional)
**Response**: available book list with `is_imported` flag

### GET /api/books/{book_id}
**Auth**: none
**Response**: `BookResponse`

### GET /api/books/{book_id}/chapters
**Auth**: none
**Response**: `ChapterResponse[]`

### GET /api/books/{book_id}/status
**Auth**: none
**Response**: `{ book_id, status, total_sentences, translated_sentences, total_chapters }`

### POST /api/books/import
**Auth**: required
**Body**: `{ book_key?, gutenberg_id?, title?, author?, source?, priority? }`
**Response**: `{ message, book_id, status }`
**Errors**: 429 (hourly import limit hit)

### POST /api/books/cancel
**Auth**: required
**Body**: `{ book_id }`

### DELETE /api/books/{book_id}
**Auth**: required

### POST /api/books/upload
**Auth**: required
**Form**: file (txt), title, author query params

### POST /api/books/{book_id}/send-to-kindle
**Auth**: required
**Body**: `{ recipient_email }`

---

## Chapters / Sentences

### GET /api/chapters/{chapter_id}
**Auth**: none

### GET /api/chapters/{chapter_id}/sentences
**Auth**: none
**Query**: `?skip=0&limit=50`
**Response**: `SentenceResponse[]`

`SentenceResponse` field names (API, not DB):
`id, chapter_id, order, english, japanese_kanji, japanese_hiragana, japanese_katakana, japanese_romaji, translation_status, source_language, words`

### GET /api/chapters/{chapter_id}/sentences/count
**Auth**: none
**Response**: `{ count, translated, chapter_id }`

---

## Translation

### POST /api/translate/trigger
**Auth**: none
**Body**: `{ chapter_id, start_position? }`

### GET /api/translate/text?q=...
**Auth**: none
**Response**: `{ japanese, hiragana, romaji, ... }`

---

## Vocabulary

### GET /api/vocabulary
**Auth**: required
**Response**: `SavedWordResponse[]`

### POST /api/vocabulary
**Auth**: required
**Body**: `SaveWordRequest`
**Errors**: 400 (word already saved)

`SaveWordRequest` shape:
```json
{
  "word": "...",
  "reading": "...",
  "romaji": "...",
  "meanings": ["..."],
  "parts_of_speech": ["..."],
  "example_sentence": null,
  "example_translation": null,
  "notes": "",
  "type": "word",
  "category": "verb"
}
```
`category`: optional, `"verb" | "noun" | "adjective" | "particle" | "expression" | "other" | null`. Defaults to `null` (treated as `"other"` in UI). Omit entirely for kanji saves — category is not used for `type: "kanji"`. Values are auto-assigned from MeCab UniDic `feature[0]` via `posToCategory()` in the frontend; not user-selected.

`SavedWordResponse` shape (as of vocabulary categories feature):
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "word": "...",
  "reading": "...",
  "romaji": "...",
  "meanings": ["..."],
  "parts_of_speech": ["..."],
  "example_sentence": null,
  "example_translation": null,
  "notes": "",
  "type": "word",
  "category": "verb",
  "mastery_level": 0,
  "next_review": "ISO8601",
  "times_reviewed": 0,
  "correct_count": 0,
  "incorrect_count": 0,
  "last_reviewed": null,
  "created_at": "ISO8601",
  "kanji_form": null,
  "hiragana_form": null,
  "katakana_form": null,
  "romaji_form": null
}
```
`correct_count`, `incorrect_count`, `last_reviewed`: stats placeholder fields — present in DB documents but not yet written by any endpoint. Reserved for a future stats pass.

### PUT /api/vocabulary/{word_id}
**Auth**: required
**Body**: `{ notes?, mastery_level? }`

### DELETE /api/vocabulary/{word_id}
**Auth**: required

### GET /api/vocabulary/review
**Auth**: required
**Response**: `SavedWordResponse[]` (due for review)

### POST /api/vocabulary/review
**Auth**: required
**Body**: `{ word_id, correct: bool }`

---

## Progress / Bookmarks / Stats

### GET /api/progress
### GET /api/progress/{book_id}
### POST /api/progress
**Auth**: required
**Body**: `ReadingProgressRequest`

### GET /api/bookmarks
### POST /api/bookmarks
### DELETE /api/bookmarks/{bookmark_id}
**Auth**: required

### GET /api/stats
**Auth**: required
**Response**: `{ vocabulary_count, books_in_progress, total_words_read, mastery_distribution }`

---

## Audio

### GET /api/audio/balance
**Auth**: required
**Response**: `{ "audio_minutes_balance": 23.5 }`

### POST /api/audio/purchase
**Auth**: required
**Body**: `{ "pack_id": "starter_10" | "standard_30" | "library_60" }`
**Response**: `{ "checkout_url": "https://checkout.stripe.com/..." }`

| Status | Condition |
|---|---|
| 400 | Invalid `pack_id` |
| 503 | `STRIPE_SECRET_KEY` or audio Price ID not configured |
| 500 | Stripe API failure |

Pack definitions (minutes / price):
- `starter_10` → 10 min / €1.99
- `standard_30` → 30 min / €4.99
- `library_60` → 60 min / €7.99

On successful payment, webhook fires `checkout.session.completed` with `metadata.purchase_type: "audio_pack"` → credits `audio_minutes_balance` and `audio_minutes_purchased` atomically via `$inc`.

### GET /api/audio/chapter/{chapter_id}
**Auth**: required
**Response**: `{ "url": "https://...", "duration_minutes": 8.3, "cached": true|false }`

**Cache hit** (`cached: true`): returns immediately, no balance deduction, no ElevenLabs call.

**Cache miss** (`cached: false`): generates via ElevenLabs, uploads to R2, caches result, deducts balance.

**Operation order on cache miss** (protects user):
1. Check cache
2. Check credentials available (503 if not)
3. Check balance sufficiency — 402 if insufficient, **but only after measuring real duration**
4. Generate audio (ElevenLabs)
5. Measure duration (mutagen)
6. Re-check balance against real duration — 402 if now insufficient
7. Upload to R2
8. Insert `audio_cache` document
9. Deduct balance (last — user already has audio)

| Status | Condition |
|---|---|
| 402 | Insufficient `audio_minutes_balance` |
| 404 | Chapter not found or has no sentences |
| 422 | Chapter has no Japanese text to narrate |
| 502 | ElevenLabs generation failed or R2 upload failed |
| 503 | ElevenLabs key, R2 credentials, or voice ID not configured |

---

## AI / Utility

### POST /api/ai/explain
**Auth**: required
**Body**: `{ word, context_sentence? }`
**Response**: `{ explanation }`

### POST /api/ai/chat
**Auth**: required
**Body**: `{ message, book_title?, current_sentence?, chat_history? }`
**Response**: `{ reply }`

### POST /api/tts
**Auth**: required
**Body**: `{ text, voice? }`
**Response**: audio/mpeg binary

### POST /api/tokenize
**Auth**: none
**Body**: `{ text }`
**Response**: `{ tokens: [{ surface, reading, pos }] }`

### GET /api/dictionary/{word}
**Auth**: none
**Response**: `WordDefinition`

### POST /api/feedback
**Auth**: required
**Body**: `{ message, user_email?, username? }`
