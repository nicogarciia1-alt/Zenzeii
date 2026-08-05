/**
 * @fileoverview Hook for fetching all taxonomy entities.
 * Fetches once on mount and caches for the session.
 * Used by FilterBar and MoreFiltersPanel.
 *
 * @returns {{
 *   genres: import('../types/catalogTypes').Genre[],
 *   themes: Object[],
 *   moods: import('../types/catalogTypes').Mood[],
 *   settings: Object[],
 *   periods: Object[],
 *   concepts: import('../types/catalogTypes').CulturalConcept[],
 *   awards: Object[],
 *   adaptations: Object[],
 *   loading: boolean,
 *   error: Error|null,
 * }}
 */
export function useTaxonomy() {
  // Phase 0: no logic yet.
  // Phase 6: wires catalogApi.fetchGenres + catalogApi.fetchTaxonomy through
  // this state, fetched once and cached for the session.
}
