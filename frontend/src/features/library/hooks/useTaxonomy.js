/**
 * @fileoverview Hook for fetching all Library taxonomy entities.
 *
 * Fetches genres (GET /api/catalog/genres) and all Layer 2 taxonomy
 * (GET /api/catalog/taxonomy) in parallel on first mount. The resolved
 * data is cached in a module-level variable for the session — a second
 * mount returns synchronously with no network request. The in-flight
 * promise is also cached (not just the resolved value), so multiple
 * components mounting around the same time before the first fetch
 * resolves share one network request instead of firing duplicates.
 *
 * Field names are renamed from the raw API response to match this
 * hook's own documented shape: the real /api/catalog/taxonomy response
 * uses historical_periods/cultural_concepts/adaptation_types, but this
 * hook exposes them as periods/concepts/adaptations.
 *
 * Used by: FilterBar (genres + Layer 2 filter options)
 */
import { useEffect, useMemo, useState } from 'react';
import { fetchGenres, fetchTaxonomy } from '../services/catalogApi';

const EMPTY_DATA = {
  genres: [],
  themes: [],
  moods: [],
  settings: [],
  periods: [],
  concepts: [],
  awards: [],
  adaptations: [],
};

/** Resolved { genres, themes, moods, ... } once loaded, or null before the first successful fetch. */
let cachedData = null;
/** Shared in-flight promise — dedupes concurrent fetches from multiple mounted consumers. */
let inFlightPromise = null;

function loadTaxonomy() {
  if (cachedData) return Promise.resolve(cachedData);
  if (inFlightPromise) return inFlightPromise;

  inFlightPromise = Promise.all([fetchGenres(), fetchTaxonomy()])
    .then(([genres, taxonomy]) => {
      cachedData = {
        genres,
        themes: taxonomy.themes,
        moods: taxonomy.moods,
        settings: taxonomy.settings,
        periods: taxonomy.historical_periods,
        concepts: taxonomy.cultural_concepts,
        awards: taxonomy.awards,
        adaptations: taxonomy.adaptation_types,
      };
      inFlightPromise = null;
      return cachedData;
    })
    .catch((err) => {
      inFlightPromise = null;
      throw err;
    });

  return inFlightPromise;
}

/**
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
 *   error: string|null,
 * }}
 */
export function useTaxonomy() {
  const [data, setData] = useState(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadTaxonomy()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load filter options. Please try again.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Without this, spreading into a new object literal on every render would
  // hand FilterBar a new `taxonomy` reference on every LibraryPage
  // re-render (e.g. every search keystroke) even when the underlying
  // taxonomy data hasn't changed — defeating any memoization downstream
  // and forcing FilterBar's option lists to recompute for no reason.
  return useMemo(() => ({ ...(data ?? EMPTY_DATA), loading, error }), [data, loading, error]);
}
