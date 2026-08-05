/**
 * @fileoverview Mock shelf collections for Phase 4 (FeelingShelf, BookShelf).
 *
 * Unlike mockCatalog.js and mockTaxonomy.js, these are NOT backed by any
 * existing backend collection or seed script — there is no /api/catalog
 * endpoint or MongoDB collection for curated "shelf" groupings today
 * (verified: no collections/shelves concept exists anywhere in
 * backend/routers/catalog.py, backend/services/catalog_service.py, or
 * either seed script). This data is illustrative only, describing what a
 * future curation layer could look like. Do not treat these ids as real
 * API identifiers — there is nothing to fetch them from yet.
 */

export const FEELING_SHELVES = [
  { id: 'rainy_day', name: 'Rainy Day', name_jp: '雨の日', emoji: '🌧', book_count: 28 },
  { id: 'quiet_evening', name: 'Quiet Evening', name_jp: '静かな夜', emoji: '🌙', book_count: 32 },
  { id: 'cozy_warm', name: 'Cozy & Warm', name_jp: '温かい', emoji: '☕', book_count: 41 },
  { id: 'reflective', name: 'Reflective', name_jp: '内省的', emoji: '🍃', book_count: 37 },
  { id: 'mysterious', name: 'Mysterious', name_jp: '神秘的', emoji: '👁', book_count: 29 },
  { id: 'funny', name: 'Funny', name_jp: '面白い', emoji: '😄', book_count: 23 },
];

export const DISCOVER_JAPAN_SHELVES = [
  { id: 'tokyo_stories', name: 'Tokyo Stories', book_count: 35 },
  { id: 'kyoto_tradition', name: 'Kyoto & Tradition', book_count: 42 },
  { id: 'countryside_life', name: 'Countryside Life', book_count: 31 },
  { id: 'edo_period', name: 'Edo Period', book_count: 28 },
  { id: 'tea_ceremony', name: 'Tea Ceremony', book_count: 18 },
  { id: 'samurai_history', name: 'Samurai & History', book_count: 26 },
];
