/**
 * @fileoverview Hook for debounced catalog search.
 * Debounce delay: SEARCH_DEBOUNCE_MS (300ms), from libraryConstants.
 * Used by SearchBar component.
 *
 * @returns {{
 *   query: string,
 *   setQuery: (query: string) => void,
 *   results: import('../types/catalogTypes').BookCatalogItem[],
 *   loading: boolean,
 *   error: Error|null,
 * }}
 */
export function useSearch() {
  // Phase 0: no logic yet.
  // Phase 7: wires catalogApi.fetchCatalog({ q }) through debounced state.
}
