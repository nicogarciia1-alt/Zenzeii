/**
 * @fileoverview Hook for fetching and filtering the Library book catalog.
 *
 * Manages the complete catalog state: active filters, sort order,
 * pagination, loading, and error states. Fetches from GET /api/catalog
 * whenever filters, sort, or page changes.
 *
 * Filter state is scalar (one selected value per filter, or null),
 * matching FilterChip's existing single-select UI exactly — not the
 * array/toggle model a multi-select UI would need. The real backend
 * does support repeated params for OR-logic multi-select (verified
 * directly against production), but exposing that is a future UI
 * decision (e.g. checkboxes in Phase 8's MoreFiltersPanel), not
 * something this phase should force into the already-shipped chips.
 *
 * Used by: LibraryPage (passed down to FilterBar and CatalogGrid)
 */
import { useEffect, useState } from 'react';
import { fetchCatalog } from '../services/catalogApi';
import { SEARCH_DEBOUNCE_MS, SORT_OPTIONS } from '../constants/libraryConstants';

const DEFAULT_SORT = SORT_OPTIONS[0].value; // 'popular'

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
  setting: null,
  period: null,
  concept: null,
  award: null,
  adaptation: null,
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
    setFiltersState((prev) => ({ ...prev, [filterId]: value }));
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

  const hasActiveFilters = Object.values(filters).some((v) => v !== null);

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
