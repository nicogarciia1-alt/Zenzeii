/**
 * @fileoverview Zenzeii Catalog API service layer.
 * All /api/catalog endpoint calls are centralized here. Components and
 * hooks never call axios/fetch directly.
 *
 * Uses process.env.REACT_APP_BACKEND_URL + axios, matching the existing
 * convention in frontend/src/lib/api.js — this app is built with
 * Create React App (react-scripts/craco), not Vite, so import.meta.env
 * is not available here.
 */
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
 * @param {string[]} [params.mood] - Mood IDs (Layer 2)
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
  // Phase 0: no call made yet.
  // Phase 6: axios.get(`${API}/catalog`, { params })
}

/**
 * Fetch a single book's full catalog entry.
 * @param {string} bookId - Canonical book ID (e.g. "aozora-kokoro")
 * @returns {Promise<import('../types/catalogTypes').BookCatalogItem>}
 */
export async function fetchBookById(bookId) {
  // Phase 0: no call made yet.
  // Phase 6: axios.get(`${API}/catalog/${bookId}`)
}

/**
 * Fetch all genres for the filter UI.
 * @returns {Promise<import('../types/catalogTypes').Genre[]>}
 */
export async function fetchGenres() {
  // Phase 0: no call made yet.
  // Phase 6: axios.get(`${API}/catalog/genres`)
}

/**
 * Fetch all Layer 2 taxonomy entities in one call.
 * @returns {Promise<import('../types/catalogTypes').TaxonomyResponse>}
 */
export async function fetchTaxonomy() {
  // Phase 0: no call made yet.
  // Phase 6: axios.get(`${API}/catalog/taxonomy`)
}

/**
 * Fetch a single cultural concept's full detail.
 * @param {string} conceptId - Cultural concept ID (e.g. "concept_mono_no_aware")
 * @returns {Promise<import('../types/catalogTypes').CulturalConcept>}
 */
export async function fetchConceptDetail(conceptId) {
  // Phase 0: no call made yet.
  // Phase 6: axios.get(`${API}/catalog/concepts/${conceptId}`)
}
