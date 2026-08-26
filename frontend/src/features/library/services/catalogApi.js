/**
 * @fileoverview Zenzeii Catalog API service layer.
 * All /api/catalog endpoint calls are centralized here. Components and
 * hooks never call axios/fetch directly.
 *
 * Uses process.env.REACT_APP_BACKEND_URL + axios, matching the existing
 * convention in frontend/src/lib/api.js exactly — including no
 * hardcoded fallback URL. A silent production fallback would mask a
 * misconfigured environment instead of surfacing it.
 */
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Build a URLSearchParams object from a catalog query params object.
 * Handles array values (repeatable params like genre[], theme[]) by
 * appending each element as a separate occurrence of the key, and
 * scalar values (a plain string, e.g. a single selected genre) by
 * appending them directly — the backend accepts both a single
 * occurrence and repeated occurrences of the same key identically.
 * @param {Object} params
 * @returns {URLSearchParams}
 */
function buildQueryParams(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, v));
    } else {
      searchParams.append(key, String(value));
    }
  });
  return searchParams;
}

/**
 * Fetch paginated catalog books with optional filters and sort.
 * @param {Object} params
 * @param {string} [params.q] - Full text search
 * @param {string[]} [params.genre] - Genre IDs
 * @param {string[]} [params.difficulty] - Difficulty values
 * @param {string[]} [params.jlpt] - JLPT levels
 * @param {string[]} [params.length] - Length categories
 * @param {string[]} [params.language] - Language values
 * @param {string[]} [params.availability] - Availability values
 * @param {number} [params.year_from] - Publication year range start
 * @param {number} [params.year_to] - Publication year range end
 * @param {string[]} [params.theme] - Theme IDs (Layer 2)
 * @param {string[]} [params.setting] - Setting IDs (Layer 2)
 * @param {string[]} [params.period] - Historical period IDs (Layer 2)
 * @param {string[]} [params.concept] - Cultural concept IDs (Layer 2)
 * @param {string[]} [params.award] - Award IDs (Layer 2)
 * @param {string[]} [params.adaptation] - Adaptation type IDs (Layer 2)
 * @param {string} [params.sort] - Sort option: popular|rating|recent|year|title
 * @param {number} [params.page] - Page number (default 1)
 * @param {number} [params.limit] - Results per page (default 24)
 * @returns {Promise<import('../types/catalogTypes').CatalogListResponse>}
 */
export async function fetchCatalog(params = {}) {
  const query = buildQueryParams(params);
  const response = await axios.get(`${API}/catalog?${query}`);
  return response.data;
}

/**
 * Fetch a single book's full catalog entry.
 * @param {string} bookId - Canonical book ID (e.g. "aozora-kokoro")
 * @returns {Promise<import('../types/catalogTypes').BookCatalogItem>}
 */
export async function fetchBookById(bookId) {
  const response = await axios.get(`${API}/catalog/${bookId}`);
  return response.data;
}

/**
 * Fetch all genres for the filter UI.
 * @returns {Promise<import('../types/catalogTypes').Genre[]>}
 */
export async function fetchGenres() {
  const response = await axios.get(`${API}/catalog/genres`);
  return response.data.genres;
}

/**
 * Fetch all Layer 2 taxonomy entities in one call.
 * @returns {Promise<import('../types/catalogTypes').TaxonomyResponse>}
 */
export async function fetchTaxonomy() {
  const response = await axios.get(`${API}/catalog/taxonomy`);
  return response.data;
}

/**
 * Fetch a single cultural concept's full detail.
 * @param {string} conceptId - Cultural concept ID (e.g. "concept_mono_no_aware")
 * @returns {Promise<import('../types/catalogTypes').CulturalConcept>}
 */
export async function fetchConceptDetail(conceptId) {
  const response = await axios.get(`${API}/catalog/concepts/${conceptId}`);
  return response.data;
}

/**
 * Toggle the current user's bookmark on a catalog book. Requires auth —
 * the Authorization header is set globally by AuthContext on login, same
 * as every other authenticated call in the app (see useImport.js).
 * @param {string} bookId
 * @returns {Promise<{marked: boolean}>}
 */
export async function markBook(bookId) {
  const response = await axios.post(`${API}/books/${bookId}/mark`);
  return response.data;
}

/**
 * Submit or update the current user's 1-5 rating for a catalog book.
 * @param {string} bookId
 * @param {number} rating - 1-5
 * @returns {Promise<{rating_avg: number, rating_count: number}>}
 */
export async function rateBook(bookId, rating) {
  const response = await axios.post(`${API}/books/${bookId}/rate`, { rating });
  return response.data;
}
