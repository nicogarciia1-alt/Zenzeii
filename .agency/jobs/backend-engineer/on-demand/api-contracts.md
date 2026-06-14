# api-contracts.md — Backend API Contracts

All endpoints live under `/api`. Auth-required endpoints expect `Authorization: Bearer <jwt>` header.

**last_verified**: 2026-06-14 by backend-engineer (Block 2 Stripe checkout)

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
