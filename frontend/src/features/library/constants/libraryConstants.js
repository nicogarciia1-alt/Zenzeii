/**
 * @fileoverview Constants for the Zenzeii Library feature.
 * All magic strings, labels, and configuration live here.
 */

/** Sort options for the catalog */
export const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'year', label: 'Publication Year' },
  { value: 'title', label: 'Title A-Z' },
];

/** Difficulty display labels */
export const DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  native: 'Native',
};

/** JLPT display labels */
export const JLPT_LABELS = {
  N5: 'N5 — Beginner',
  N4: 'N4 — Elementary',
  N3: 'N3 — Intermediate',
  N2: 'N2 — Upper Intermediate',
  N1: 'N1 — Advanced',
};

/** Length display labels */
export const LENGTH_LABELS = {
  short: 'Short (under 100 pages)',
  medium: 'Medium (100-300 pages)',
  long: 'Long (300+ pages)',
};

/** Availability display labels */
export const AVAILABILITY_LABELS = {
  free: 'Free to Read',
  buy: 'Available to Buy',
  upload: 'Upload Your Own',
};

/** Default pagination */
export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 48;

/** Debounce delay for search input (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Filter bar primary filters — shown without "More Filters" */
export const PRIMARY_FILTERS = ['genre', 'difficulty', 'jlpt', 'length', 'theme', 'mood'];

/** Filter bar secondary filters — shown inside "More Filters" panel */
export const SECONDARY_FILTERS = ['setting', 'period', 'concept', 'award', 'adaptation'];
