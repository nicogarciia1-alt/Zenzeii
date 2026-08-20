/**
 * @fileoverview Shared utility functions for the Library feature.
 * Pure functions only — no API calls, no side effects.
 */

/** Rough constant for estimateReadingHours() — see its docstring. */
const PAGES_PER_HOUR_ESTIMATE = 40;

/**
 * Rough reading-time estimate derived from a book's page count.
 *
 * There is no `estimated_read_time` field anywhere in the real backend
 * schema (backend/models/catalog_models.py) — this is a deliberately
 * approximate client-side estimate for the reading-time metadata badge,
 * not a value that should ever be sent to or expected from the API.
 * The 40 pages/hour constant is tuned for an intermediate-level Japanese
 * reader (this is a language-learning app), not native reading speed.
 *
 * @param {number|null|undefined} pageCount
 * @returns {number|null} Estimated hours, rounded to the nearest whole
 *   hour (minimum 1 if pageCount is positive), or null if pageCount is
 *   missing or non-positive.
 */
export function estimateReadingHours(pageCount) {
  if (!pageCount || pageCount <= 0) return null;
  return Math.max(1, Math.round(pageCount / PAGES_PER_HOUR_ESTIMATE));
}

/**
 * Formats a rating/review count for compact display.
 * Examples: 1200 -> "1.2k", 847 -> "847", 999 -> "999", 1000 -> "1.0k".
 *
 * @param {number} count
 * @returns {string}
 */
export function formatRatingCount(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

/**
 * Resolves an array of taxonomy entity IDs (e.g. book.genre_ids,
 * book.theme_ids) to their display names, in the order given.
 *
 * Silently drops any ID with no matching entity — a stale reference on a
 * book document (entity renamed/removed since) degrades to omitting that
 * one tag rather than showing a raw, meaningless ID slug to the reader.
 *
 * @param {string[]} ids
 * @param {{id: string, name: string}[]} entities - e.g. useTaxonomy().genres
 * @returns {string[]}
 */
export function resolveEntityNames(ids, entities) {
  if (!ids?.length || !entities?.length) return [];
  const byId = new Map(entities.map((entity) => [entity.id, entity.name]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * Deterministic FNV-1a string hash. Extracted here in Phase 4 from
 * BookCoverArt.jsx (its original, sole caller) once FeelingCard needed
 * the exact same hash — same algorithm, unchanged, just relocated so two
 * components can share one implementation instead of each carrying its
 * own copy.
 *
 * Not the simplest possible hash (a djb2-style `hash*31+char` was tried
 * first, in BookCoverArt, and rejected): verified empirically against
 * the 10 real seeded book IDs and it collapsed badly — 6 of 10 IDs share
 * the exact "aozora-" prefix, and that hash's poor mixing at small
 * moduli put 6 of them on the same color. FNV-1a spreads meaningfully
 * better on the same real data (verified: 4 distinct colors instead of
 * 3, largest cluster 4 books instead of 6).
 *
 * When deriving two independent values from one input (e.g. a color AND
 * a decorative glyph), hash different transforms of the input (e.g.
 * forward vs. reversed string) rather than the same hash with two small
 * moduli — moduli 8 and 4 would make one fully determined by the other,
 * since 4 divides 8.
 *
 * @param {string} str
 * @returns {number} Unsigned 32-bit hash.
 */
export function fnv1aHash(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
