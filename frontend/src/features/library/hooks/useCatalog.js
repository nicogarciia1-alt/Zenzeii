/**
 * @fileoverview Hook for fetching and filtering the Library book catalog.
 *
 * Manages the complete catalog state: active filters, sort order,
 * pagination, loading, and error states. Fetches from GET /api/catalog
 * whenever filters, sort, or page changes.
 *
 * Filter state is scalar (one selected value per filter, or null) for
 * every Layer 1 filter — q, genre, difficulty, jlpt, length, language,
 * availability, year_from, year_to, theme, mood — matching FilterChip's
 * existing single-select UI exactly.
 *
 * The five Layer 2 filters exposed only through MoreFiltersPanel
 * (Phase 8) — setting, period, concept, award, adaptation — are array
 * state instead: multiple values OR'd together, matching FilterPill's
 * checkbox UI and the repeated-param OR-logic the backend already
 * supports. theme/mood stay scalar and out of that panel entirely —
 * they already have a single-select home in the primary FilterBar chips,
 * and giving them a second, differently-shaped entry point would put two
 * UIs writing incompatible value types into the same filter key.
 *
 * Used by: LibraryPage (passed down to FilterBar and CatalogGrid)
 */
import { useEffect, useState } from 'react';
import { fetchCatalog } from '../services/catalogApi';
import { SEARCH_DEBOUNCE_MS, SORT_OPTIONS, SECONDARY_FILTERS } from '../constants/libraryConstants';

const DEFAULT_SORT = SORT_OPTIONS[0].value; // 'popular'

/** Layer 2 filters — array/toggle state, selected via MoreFiltersPanel checkboxes. */
const ARRAY_FILTER_IDS = SECONDARY_FILTERS;

const DEFAULT_FILTERS = {
  q: null,
  genre: null,
  difficulty: null,
  jlpt: null,
  length: null,
  language: null,
  availability: null,
  year_from: null,
  year_to: null,
  theme: null,
  mood: null,
  setting: [],
  period: [],
  concept: [],
  award: [],
  adaptation: [],
};

/**
 * @param {Object} [initialParams] - Optional initial filter/sort values
 * @returns {{
 *   books: import('../types/catalogTypes').BookCatalogItem[],
 *   total: number,
 *   pages: number,
 *   page: number,
 *   loading: boolean,
 *   error: string|null,
 *   filters: Object,
 *   setFilter: function,
 *   clearFilter: function,
 *   clearAllFilters: function,
 *   sort: string,
 *   setSort: function,
 *   setPage: function,
 *   hasActiveFilters: boolean,
 * }}
 */
export function useCatalog(initialParams = {}) {
  const [filters, setFiltersState] = useState({ ...DEFAULT_FILTERS, ...initialParams });
  const [sort, setSortState] = useState(initialParams.sort ?? DEFAULT_SORT);
  const [page, setPage] = useState(initialParams.page ?? 1);

  const [debouncedQ, setDebouncedQ] = useState(filters.q);
  const [result, setResult] = useState({ books: [], total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debounce only the text search — every other filter fires immediately.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCatalog({
      q: debouncedQ,
      genre: filters.genre,
      difficulty: filters.difficulty,
      jlpt: filters.jlpt,
      length: filters.length,
      language: filters.language,
      availability: filters.availability,
      year_from: filters.year_from,
      year_to: filters.year_to,
      theme: filters.theme,
      mood: filters.mood,
      setting: filters.setting,
      period: filters.period,
      concept: filters.concept,
      award: filters.award,
      adaptation: filters.adaptation,
      sort,
      page,
    })
      .then((data) => {
        if (cancelled) return;
        setResult({ books: data.books, total: data.total, pages: data.pages });
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Deliberately not touching `result` here — the last successful
        // books/total/pages stay on screen instead of flashing empty.
        setError('Could not load books. Please try again.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedQ,
    filters.genre,
    filters.difficulty,
    filters.jlpt,
    filters.length,
    filters.language,
    filters.availability,
    filters.year_from,
    filters.year_to,
    filters.theme,
    filters.mood,
    filters.setting,
    filters.period,
    filters.concept,
    filters.award,
    filters.adaptation,
    sort,
    page,
  ]);

  const setFilter = (filterId, value) => {
    setFiltersState((prev) => {
      if (ARRAY_FILTER_IDS.includes(filterId)) {
        // Layer 2 filters are OR'd sets — `value` is the single option
        // being toggled, not a replacement array (FilterPill/FilterSection
        // only ever pass one value at a time).
        const current = prev[filterId];
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [filterId]: next };
      }
      return { ...prev, [filterId]: value };
    });
    setPage(1);
  };

  const clearFilter = (filterId) => {
    setFiltersState((prev) => ({ ...prev, [filterId]: DEFAULT_FILTERS[filterId] }));
    setPage(1);
  };

  const clearAllFilters = () => {
    setFiltersState(DEFAULT_FILTERS);
    setPage(1);
  };

  const setSort = (newSort) => {
    setSortState(newSort);
    setPage(1);
  };

  const hasActiveFilters = Object.entries(filters).some(([filterId, v]) =>
    ARRAY_FILTER_IDS.includes(filterId) ? v.length > 0 : v !== null
  );

  return {
    books: result.books,
    total: result.total,
    pages: result.pages,
    page,
    loading,
    error,
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    sort,
    setSort,
    setPage,
    hasActiveFilters,
  };
}
