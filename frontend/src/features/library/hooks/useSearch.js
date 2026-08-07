/**
 * @fileoverview Hook for debounced Library search.
 *
 * Manages the search input value locally and propagates debounced
 * queries to the catalog via the onSearch callback — typically
 * catalog.setFilter('q', value) from useCatalog. This hook does not
 * fetch anything itself; search is just the `q` filter on the existing
 * catalog listing (see catalogApi.fetchCatalog), so useCatalog already
 * owns the request/response/loading/error cycle for it.
 *
 * Debounce delay: SEARCH_DEBOUNCE_MS (300ms) from libraryConstants.
 * Clearing the query (backspace to empty, or clearQuery) fires onSearch
 * immediately, bypassing the debounce — clearing should feel instant.
 *
 * After a debounced search actually fires, the catalog section scrolls
 * into view so results (which render below the fold, under the hero)
 * are immediately visible without the user having to scroll manually.
 * This does not happen on an immediate clear, and never fires on every
 * keystroke — only once the debounce window elapses.
 *
 * Used by: LibraryPage, which wires onSearch to catalog.setFilter('q', ...)
 * and passes the returned state down to SearchBar via HeroContent.
 *
 * @param {function} onSearch - Called with the debounced query string, or
 *   null when the search is cleared.
 * @returns {{
 *   query: string,
 *   setQuery: function,
 *   clearQuery: function,
 *   isSearching: boolean,
 * }}
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { SEARCH_DEBOUNCE_MS } from '../constants/libraryConstants';

const CATALOG_SECTION_ID = 'library-catalog-section';

export function useSearch(onSearch) {
  const [query, setQueryState] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef(null);

  const setQuery = useCallback(
    (value) => {
      setQueryState(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value || !value.trim()) {
        setIsSearching(false);
        onSearch(null);
        return;
      }

      setIsSearching(true);
      debounceRef.current = setTimeout(() => {
        onSearch(value.trim());
        setIsSearching(false);
        document.getElementById(CATALOG_SECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, SEARCH_DEBOUNCE_MS);
    },
    [onSearch]
  );

  const clearQuery = useCallback(() => {
    setQuery('');
  }, [setQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { query, setQuery, clearQuery, isSearching };
}
