# YomuMaster - Crash Recovery & Aozora Fix (March 2026)

## Issue Resolved
- API crashed due to Pydantic validation errors on missing `description_jp` field
- Aozora Bunko imports were failing due to incorrect encoding/URL handling

## Fixes Applied

### 1. Robust Error Handling
- `safe_book_response()` function with all field defaults
- API filters out failed/cancelled imports
- Optional Pydantic fields with proper defaults

### 2. Aozora Bunko Import
- Fixed Shift-JIS encoding (decode from bytes, not text)
- Correct URL format: `/cards/{author_id}/{file_path}`
- HTML extraction removes ruby annotations

## Database
- **Type:** MongoDB (local)
- **URL:** `mongodb://localhost:27017`
- **Database:** `test_database`
- **Status:** ✅ Data intact after crash recovery

## Current State
- 5 English books (Project Gutenberg) - completed
- 1 Japanese book (羅生門/Rashomon) - preparing for translation

## Translation Direction
- **English source (Gutenberg):** English → Japanese (kanji, hiragana, katakana, romaji)
- **Japanese source (Aozora):** Japanese → English + hiragana/katakana/romaji via pykakasi
