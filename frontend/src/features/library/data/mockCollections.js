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
  { id: 'rainy_day', name: 'Rainy Day', name_jp: '雨の日', emoji: '🌧', book_count: 28, image_url: null },
  { id: 'quiet_evening', name: 'Quiet Evening', name_jp: '静かな夜', emoji: '🌙', book_count: 32, image_url: null },
  { id: 'cozy_warm', name: 'Cozy & Warm', name_jp: '温かい', emoji: '☕', book_count: 41, image_url: null },
  { id: 'reflective', name: 'Reflective', name_jp: '内省的', emoji: '🍃', book_count: 37, image_url: null },
  { id: 'mysterious', name: 'Mysterious', name_jp: '神秘的', emoji: '👁', book_count: 29, image_url: null },
  { id: 'funny', name: 'Funny', name_jp: '面白い', emoji: '😄', book_count: 23, image_url: null },
];

/**
 * `slug` maps each card to its real /bookshelves/:slug route (see
 * backend/scripts/seed_shelves.py for the seeded `shelves` documents
 * these must match). 'tokyo-stories' and 'kyoto-and-tradition' have
 * real books; the other four are seeded as empty shelves (book_ids: [])
 * — ShelfDetailPage renders them with a "No books found" grid rather
 * than a 404, until Sato's ingestion data lands for each.
 */
export const DISCOVER_JAPAN_SHELVES = [
  { id: 'tokyo_stories', slug: 'tokyo-stories', name: 'Tokyo Stories', name_jp: '東京の物語', book_count: 35, image_url: '/assets/discover-japan/tokyo-stories.png' },
  { id: 'kyoto_tradition', slug: 'kyoto-and-tradition', name: 'Kyoto & Tradition', name_jp: '京都と伝統', book_count: 42, image_url: '/assets/discover-japan/kyoto-tradition.png' },
  { id: 'countryside_life', slug: 'countryside-life', name: 'Countryside Life', name_jp: '田舎暮らし', book_count: 31, image_url: '/assets/discover-japan/countryside-life.png' },
  { id: 'edo_period', slug: 'edo-period', name: 'Edo Period', name_jp: '江戸時代', book_count: 28, image_url: '/assets/discover-japan/edo-period.png' },
  { id: 'tea_ceremony', slug: 'tea-ceremony', name: 'Tea Ceremony', name_jp: '茶道', book_count: 18, image_url: '/assets/discover-japan/tea-ceremony.png' },
  { id: 'samurai_history', slug: 'samurai-and-history', name: 'Samurai & History', name_jp: '侍と歴史', book_count: 26, image_url: '/assets/discover-japan/samurai-history.png' },
];
