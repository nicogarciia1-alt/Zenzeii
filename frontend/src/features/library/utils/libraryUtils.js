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
