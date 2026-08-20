/**
 * @fileoverview JSDoc type definitions for the Zenzeii Library catalog.
 * These types document the shape of data flowing through components and
 * hooks. They are not enforced at runtime — they exist for developer
 * clarity and IDE support. Mirrors backend/models/catalog_models.py
 * (BookCatalogItem, GenreResponse, MoodResponse, CulturalConceptResponse,
 * TaxonomyResponse, CatalogListResponse) — keep in sync with that file.
 */

/**
 * @typedef {Object} BookCatalogItem
 * @property {string} id
 * @property {string} title_jp
 * @property {string} title_en
 * @property {string|null} title_romaji
 * @property {string} author_name
 * @property {string|null} author_name_jp
 * @property {string|null} cover_image
 * @property {string[]} genre_ids
 * @property {'beginner'|'intermediate'|'advanced'|'native'} difficulty
 * @property {'N5'|'N4'|'N3'|'N2'|'N1'|null} jlpt_level
 * @property {'ja'|'ja_en'|'en'} language
 * @property {'short'|'medium'|'long'|null} length_category
 * @property {number|null} page_count
 * @property {'free'|'buy'|'upload'} availability
 * @property {number|null} publication_year
 * @property {number} rating_avg
 * @property {number} rating_count
 * @property {number} popularity_score
 * @property {string|null} import_status
 * @property {boolean} is_on_shelf
 * @property {string[]} mood_ids
 * @property {string[]} theme_ids
 * @property {string[]} setting_ids
 * @property {string[]} period_ids
 * @property {string[]} cultural_concept_ids
 * @property {Object[]} award_ids
 * @property {string[]} adaptation_types
 */

/**
 * @typedef {Object} BookCatalogDetail
 * Full shape returned by GET /api/catalog/{bookId}, used by the book
 * detail page. Extends BookCatalogItem with fields not needed in list/card
 * view — mirrors backend/models/catalog_models.py BookCatalogDetail exactly.
 * @property {string|null} description_short
 * @property {string|null} description_long
 * @property {boolean|null} has_translation
 * @property {string|null} featured_quote
 * @property {string|null} featured_quote_source
 * @property {string|null} aozora_id
 * @property {string|null} aozora_url
 * @property {string|null} gutenberg_id
 * @property {string|null} buy_link
 * @property {boolean} upload_allowed
 * @property {string|null} original_publisher
 * @property {'public_domain'|'copyrighted'|'unknown'} copyright_status
 * @property {number} save_count
 * @property {boolean} is_marked
 * @property {number|null} my_rating - The current user's own 1-5 rating, if any
 * @property {string[]} theme_ids
 * @property {string[]} mood_ids
 * @property {string[]} setting_ids
 * @property {string[]} period_ids
 * @property {string[]} cultural_concept_ids
 * @property {Object[]} award_ids
 * @property {string[]} adaptation_types
 */

/**
 * @typedef {Object} CatalogListResponse
 * @property {number} total
 * @property {number} page
 * @property {number} limit
 * @property {number} pages
 * @property {string} sort
 * @property {Object} filters_applied
 * @property {BookCatalogItem[]} books
 */

/**
 * @typedef {Object} Genre
 * @property {string} id
 * @property {string} name
 * @property {string} name_jp
 * @property {string} description
 * @property {number} sort_order
 */

/**
 * @typedef {Object} Mood
 * @property {string} id
 * @property {string} name
 * @property {string} name_jp
 * @property {string} description
 */

/**
 * @typedef {Object} CulturalConcept
 * @property {string} id
 * @property {string} name
 * @property {string} name_jp
 * @property {string} romaji
 * @property {string} description_short
 */

/**
 * @typedef {Object} TaxonomyResponse
 * Note: genres are NOT included here — GET /api/catalog/taxonomy covers
 * Layer 2 only. Genres (Layer 1) come from the separate GET /api/catalog/genres
 * endpoint. Matches backend/models/catalog_models.py TaxonomyResponse exactly.
 * @property {Object[]} themes
 * @property {Mood[]} moods
 * @property {Object[]} settings
 * @property {Object[]} historical_periods
 * @property {CulturalConcept[]} cultural_concepts
 * @property {Object[]} awards
 * @property {Object[]} adaptation_types
 */

/**
 * @typedef {Object} FilterOption
 * Used by FilterDropdown (Phase 3) — a single selectable value inside a
 * filter chip's dropdown. Genre/Theme/Mood options are mapped from their
 * respective taxonomy entities (Genre/Object[themes]/Mood above);
 * Difficulty/JLPT/Length options come from libraryConstants.js's static
 * *_OPTIONS arrays.
 * @property {string} value - The filter value (matches API parameter value)
 * @property {string} label - Human-readable display label
 * @property {string} [labelJp] - Optional Japanese label
 * @property {number} [count] - Optional book count (Phase 6+, absent in Phase 3)
 */

export {};
