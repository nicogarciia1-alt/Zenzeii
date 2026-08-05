/**
 * @fileoverview Hook for the book import flow.
 * Manages: trigger import → poll status → completed/failed states.
 * Used by ImportFlow component.
 *
 * @returns {{
 *   importBook: (book: import('../types/catalogTypes').BookCatalogItem) => Promise<void>,
 *   importStatus: 'idle'|'importing'|'completed'|'failed',
 *   isImporting: boolean,
 *   error: Error|null,
 *   reset: () => void,
 * }}
 */
export function useImport() {
  // Phase 0: no logic yet.
  // Phase 10: wires the existing importBook (frontend/src/lib/api.js) +
  // status polling (matching HomePage.jsx's existing poll pattern) through
  // this state.
}
