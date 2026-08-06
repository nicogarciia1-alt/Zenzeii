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

/**
 * Configuration for the 6 primary FilterBar chips (Phase 3). `icon` is a
 * lucide-react export name, resolved to a component by FilterBar — kept
 * as a string here so this file stays plain data, no JSX/React import.
 * `optionsSource` of 'static' means the chip's options come from the
 * *_OPTIONS constants below; 'genres'/'themes'/'moods' means they're
 * mapped from mockTaxonomy.js in Phase 3, and from useTaxonomy() in
 * Phase 6 — same FilterOption[] shape either way.
 */
export const FILTER_BAR_CHIPS = [
  { id: 'genre', label: 'Genre', icon: 'BookOpen', optionsSource: 'genres' },
  { id: 'difficulty', label: 'Difficulty', icon: 'BarChart2', optionsSource: 'static' },
  { id: 'jlpt', label: 'JLPT Level', icon: 'Languages', optionsSource: 'static' },
  { id: 'length', label: 'Length', icon: 'Clock', optionsSource: 'static' },
  { id: 'theme', label: 'Theme', icon: 'Leaf', optionsSource: 'themes' },
  { id: 'mood', label: 'Mood', icon: 'Smile', optionsSource: 'moods' },
];

/**
 * Static filter option lists for the Difficulty/JLPT/Length FilterChips.
 * Derived from the *_LABELS maps above rather than duplicating the same
 * label text a second time — one source of truth, so the badge text used
 * in BookInfoBlock (Phase 2) and these dropdown options can never drift
 * apart.
 */
export const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_LABELS).map(([value, label]) => ({ value, label }));
export const JLPT_OPTIONS = Object.entries(JLPT_LABELS).map(([value, label]) => ({ value, label }));
export const LENGTH_OPTIONS = Object.entries(LENGTH_LABELS).map(([value, label]) => ({ value, label }));
