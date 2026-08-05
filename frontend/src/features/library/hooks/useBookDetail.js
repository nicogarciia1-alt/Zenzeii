/**
 * @fileoverview Hook for fetching a single book's full catalog detail.
 * Used by BookDetailModal.
 *
 * @param {string} bookId - Canonical book ID (e.g. "aozora-kokoro")
 * @returns {{
 *   book: import('../types/catalogTypes').BookCatalogItem|null,
 *   loading: boolean,
 *   error: Error|null,
 * }}
 */
export function useBookDetail(bookId) {
  // Phase 0: no logic yet.
  // Phase 9: wires catalogApi.fetchBookById through this state.
}
