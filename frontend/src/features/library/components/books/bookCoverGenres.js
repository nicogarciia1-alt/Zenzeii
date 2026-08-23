/**
 * @fileoverview Genre-driven design system for BookCoverArt.
 *
 * Each genre_id maps to a fixed visual identity (palette, decorative
 * element, sidebar icon, texture intensity) — replacing the old
 * bookId-hash color assignment. GENRE_PRIORITY picks one genre when a
 * book has several; anything not in GENRE_DESIGNS (genre_memoir,
 * genre_contemporary, genre_anthology, or no genre_ids at all) falls
 * back to `default` — a distinct neutral design, not genre_novel's
 * literary-fiction palette. (The reference brief's own pseudocode
 * sketch defaulted to genre_novel, but its detailed design spec gives
 * memoir/contemporary/anthology a separate, fully-specified "elegant
 * neutral" look built around the old kanji-watermark decoration — that
 * fuller spec is what's implemented here.)
 */
export const GENRE_PRIORITY = [
  // Priority 1 — most specific
  'genre_horror',
  'genre_mystery',
  'genre_poetry',
  'genre_childrens',
  'genre_memoir',
  // Priority 2 — mid-level
  'genre_short_story',
  'genre_historical',
  'genre_romance',
  'genre_fantasy',
  'genre_essay',
  // Priority 3 — general
  'genre_novel',
  'genre_classic',
  'genre_contemporary',
  'genre_anthology',
];

/**
 * @param {string[]} [genreIds]
 * @returns {string} A key from GENRE_PRIORITY, or 'default' if none match.
 */
export function getPrimaryGenre(genreIds = []) {
  for (const genre of GENRE_PRIORITY) {
    if (genreIds.includes(genre)) return genre;
  }
  return 'default';
}

const LITERARY = {
  background: '#2C0D0D',
  sidebar: '#1A0808',
  title: '#E8D5C0',
  author: '#C4A882',
  accent: '#8B2020',
  romaji: '#8B6A50',
  textureOpacity: 0.15,
  decorative: 'cherryBlossomBranch',
  decorativeOpacity: 0.7,
  icon: 'sakura',
};

const NEUTRAL_DEFAULT = {
  background: '#1A1814',
  sidebar: '#111008',
  title: '#E8D5C0',
  author: '#B8A090',
  accent: '#C0392B',
  romaji: '#8A7A6A',
  textureOpacity: 0.1,
  decorative: 'kanjiWatermark',
  decorativeOpacity: 0.04,
  icon: 'book',
};

/**
 * @typedef {Object} GenreDesign
 * @property {string} background
 * @property {string} sidebar
 * @property {string} [sidebarBorder] - Thin accent line on the sidebar's outer edge, when the genre calls for one (mystery).
 * @property {string} title
 * @property {string} [titleAccent] - Secondary title color for genres that mix two title colors (children's).
 * @property {string} author
 * @property {string} accent
 * @property {string} romaji
 * @property {number} textureOpacity
 * @property {keyof typeof import('./bookCoverDecorations').DECORATIVE_ELEMENTS} decorative
 * @property {number} decorativeOpacity
 * @property {string} icon - Key into SidebarGenreIcon's glyph set.
 * @property {boolean} [cornerOrnaments] - Mystery's Art Deco gold corner brackets.
 * @property {string} [titleFont] - Extra font class for genres with a distinct type feel (children's).
 */

/** @type {Record<string, GenreDesign>} */
export const GENRE_DESIGNS = {
  genre_novel: LITERARY,
  genre_classic: LITERARY,

  genre_historical: {
    background: '#1C0F08',
    sidebar: '#0F0804',
    title: '#D4A855',
    author: '#C4956A',
    accent: '#8B1A1A',
    romaji: '#9A7A55',
    textureOpacity: 0.2,
    decorative: 'inkWashHorizon',
    decorativeOpacity: 0.5,
    icon: 'crossedSwords',
  },

  genre_mystery: {
    background: '#0A0A0A',
    sidebar: '#111111',
    sidebarBorder: '#D4AF37',
    title: '#D4AF37',
    author: '#B8960C',
    accent: '#C41E1E',
    romaji: '#8A7A40',
    textureOpacity: 0.1,
    decorative: 'inkSplatterBottom',
    decorativeOpacity: 0.6,
    icon: 'magnifyingGlass',
    cornerOrnaments: true,
  },

  genre_horror: {
    background: '#050505',
    sidebar: '#0A0A0A',
    title: '#C8B89A',
    author: '#8A7A6A',
    accent: '#6B1515',
    romaji: '#6A5A4A',
    textureOpacity: 0.25,
    decorative: 'inkSplatterAbstract',
    decorativeOpacity: 0.4,
    icon: 'flame',
  },

  genre_childrens: {
    background: '#F5EDD6',
    sidebar: '#3A6B3A',
    title: '#2D5A1B',
    titleAccent: '#C4571A',
    author: '#5A3A1A',
    accent: '#C4571A',
    romaji: '#5A7A3A',
    textureOpacity: 0.1,
    decorative: 'sparkleStars',
    decorativeOpacity: 0.8,
    icon: 'leaf',
    titleFont: 'font-garamond',
  },

  genre_romance: {
    background: '#F0D8D8',
    sidebar: '#C4828A',
    title: '#6B1A2A',
    author: '#8A4A52',
    accent: '#D4829A',
    romaji: '#9A6A72',
    textureOpacity: 0.08,
    decorative: 'fallingPetals',
    decorativeOpacity: 0.6,
    icon: 'sakura',
  },

  genre_essay: {
    background: '#F2EDE4',
    sidebar: '#3A5A6B',
    title: '#2A3A4A',
    author: '#4A5A6A',
    accent: '#D4A820',
    romaji: '#6A7A8A',
    textureOpacity: 0.12,
    decorative: 'brushStrokeLine',
    decorativeOpacity: 0.3,
    icon: 'leaf',
  },

  genre_fantasy: {
    background: '#0A0F1E',
    sidebar: '#F5EDD6',
    title: '#E8D5A0',
    author: '#B8A880',
    accent: '#D4AF37',
    romaji: '#8A7A60',
    textureOpacity: 0.15,
    decorative: 'starField',
    decorativeOpacity: 0.7,
    icon: 'compassStar',
  },

  genre_short_story: {
    background: '#1A1A2E',
    sidebar: '#16213E',
    title: '#E8D5C0',
    author: '#B8A090',
    accent: '#C0392B',
    romaji: '#8A7A6A',
    textureOpacity: 0.12,
    decorative: 'ensoCircle',
    decorativeOpacity: 0.3,
    icon: 'enso',
  },

  genre_poetry: {
    background: '#1E2A1E',
    sidebar: '#142014',
    title: '#D4C8A0',
    author: '#A0946A',
    accent: '#8BC4A0',
    romaji: '#7A8A7A',
    textureOpacity: 0.15,
    decorative: 'bambooStalk',
    decorativeOpacity: 0.25,
    icon: 'bamboo',
  },

  default: NEUTRAL_DEFAULT,
};

/**
 * @param {string[]} [genreIds]
 * @returns {GenreDesign}
 */
export function getGenreDesign(genreIds = []) {
  const primaryGenre = getPrimaryGenre(genreIds);
  return GENRE_DESIGNS[primaryGenre] ?? GENRE_DESIGNS.default;
}
