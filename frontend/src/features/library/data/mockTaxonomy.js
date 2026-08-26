/**
 * @fileoverview Mock taxonomy data for Phase 0-5 UI development, before
 * catalogApi.fetchGenres / fetchTaxonomy are wired to the live backend in
 * Phase 6.
 *
 * A subset of each collection, using exact IDs, names, and descriptions
 * from backend/scripts/seed_catalog.py (genres) and
 * backend/scripts/seed_layer2_taxonomy.py (everything else) — no invented
 * values. The real seed has more entries per collection (e.g. 32 settings,
 * 23 cultural concepts); this file carries only what Phase 0 needs to
 * exercise the UI, sized above each stated minimum
 * (5 genres, 6 settings, 5 themes, 4 cultural concepts).
 *
 * MOCK_MOODS removed (UI Refinement, Aug 2026) — Mood is not a Zenzeii
 * filter, per COO/Nico instruction. Do not re-add it.
 */

/** @type {import('../types/catalogTypes').Genre[]} */
export const MOCK_GENRES = [
  { id: 'genre_novel', name: 'Novel', name_jp: '小説', description: 'A long-form prose narrative', sort_order: 1 },
  { id: 'genre_short_story', name: 'Short Story', name_jp: '短編小説', description: 'A brief prose narrative, typically under 50 pages', sort_order: 2 },
  { id: 'genre_poetry', name: 'Poetry', name_jp: '詩', description: 'Verse-form literary work', sort_order: 3 },
  { id: 'genre_essay', name: 'Essay', name_jp: '随筆', description: 'Personal or reflective non-fiction prose', sort_order: 4 },
  { id: 'genre_classic', name: 'Classic', name_jp: '古典', description: 'Works of enduring literary recognition', sort_order: 5 },
  { id: 'genre_contemporary', name: 'Contemporary', name_jp: '現代文学', description: 'Works from the post-war era to present', sort_order: 6 },
  { id: 'genre_romance', name: 'Romance', name_jp: '恋愛小説', description: 'Stories centered on romantic relationships', sort_order: 10 },
  { id: 'genre_childrens', name: "Children's", name_jp: '児童文学', description: 'Literature written for young readers', sort_order: 11 },
];

/** @type {Object[]} Theme entities (themes collection) */
export const MOCK_THEMES = [
  { id: 'theme_identity', name: 'Identity', name_jp: 'アイデンティティ', description: 'The search for self and belonging' },
  { id: 'theme_isolation', name: 'Isolation', name_jp: '孤立', description: 'Enforced or chosen separation from others' },
  { id: 'theme_death', name: 'Death', name_jp: '死', description: 'Mortality and what it means to live' },
  { id: 'theme_love', name: 'Love', name_jp: '愛', description: 'Romantic or profound human love' },
  { id: 'theme_survival', name: 'Survival', name_jp: '生存', description: 'Endurance under extreme conditions' },
  { id: 'theme_justice', name: 'Justice', name_jp: '正義', description: 'Fairness, law, and moral reckoning' },
  { id: 'theme_dreams', name: 'Dreams', name_jp: '夢', description: 'Aspiration, fantasy, and the subconscious' },
];

/** @type {Object[]} Setting entities (settings collection) */
export const MOCK_SETTINGS = [
  { id: 'setting_tokyo', name: 'Tokyo', name_jp: '東京', type: 'city', description: "Japan's sprawling capital — a byword for speed, anonymity, and modern life" },
  { id: 'setting_kyoto', name: 'Kyoto', name_jp: '京都', type: 'city', description: 'The former imperial capital, layered with temples, shrines, and traditional culture' },
  { id: 'setting_countryside', name: 'Countryside', name_jp: '田舎', type: 'place_type', description: 'Rural Japan, away from the cities — a slower, older way of life' },
  { id: 'setting_historical_jp', name: 'Historical Japan', name_jp: '歴史的日本', type: 'era_context', description: 'Japan in an unspecified or blended historical past' },
  { id: 'setting_contemporary_jp', name: 'Contemporary Japan', name_jp: '現代日本', type: 'era_context', description: 'Present-day Japan, with its modern institutions and daily life' },
  { id: 'setting_onsen', name: 'Onsen', name_jp: '温泉', type: 'place_type', description: 'A hot spring resort, associated with rest, vulnerability, and quiet conversation' },
  { id: 'setting_seaside', name: 'Seaside', name_jp: '海辺', type: 'place_type', description: 'Coastal towns and shorelines, tied to fishing life and the rhythm of the tide' },
];

/** @type {Object[]} Historical period entities (historical_periods collection) */
export const MOCK_PERIODS = [
  { id: 'period_heian', name: 'Heian', name_jp: '平安', years: '794–1185', year_start: 794, year_end: 1185, description: 'The classical age of Japanese literature and court culture' },
  { id: 'period_meiji', name: 'Meiji', name_jp: '明治', years: '1868–1912', year_start: 1868, year_end: 1912, description: 'Rapid modernization and the birth of the modern Japanese novel' },
  { id: 'period_taisho', name: 'Taisho', name_jp: '大正', years: '1912–1926', year_start: 1912, year_end: 1926, description: 'Democracy, Western influence, and literary experimentation' },
  { id: 'period_showa_post', name: 'Post-war Showa', name_jp: '昭和後期', years: '1945–1989', year_start: 1945, year_end: 1989, description: 'Reconstruction, economic growth, and literary renaissance' },
  { id: 'period_heisei', name: 'Heisei', name_jp: '平成', years: '1989–2019', year_start: 1989, year_end: 2019, description: 'Globalization, digital age, and literary introspection' },
];

/** @type {import('../types/catalogTypes').CulturalConcept[]} */
export const MOCK_CULTURAL_CONCEPTS = [
  { id: 'concept_mono_no_aware', name: 'Mono no Aware', name_jp: '物の哀れ', romaji: 'mono no aware', description_short: 'The bittersweet awareness that all beautiful things are impermanent' },
  { id: 'concept_wabi_sabi', name: 'Wabi-Sabi', name_jp: '侘び寂び', romaji: 'wabi-sabi', description_short: 'Finding beauty in imperfection, incompleteness, and impermanence' },
  { id: 'concept_ikigai', name: 'Ikigai', name_jp: '生き甲斐', romaji: 'ikigai', description_short: 'The reason you get up in the morning — your purpose and joy in life' },
  { id: 'concept_ma', name: 'Ma', name_jp: '間', romaji: 'ma', description_short: 'The meaningful pause — negative space in time, sound, and relationship' },
];

/** @type {Object[]} Award entities (awards collection) */
export const MOCK_AWARDS = [
  { id: 'award_akutagawa', name: 'Akutagawa Prize', name_jp: '芥川賞', founded_year: 1935, country: 'Japan', prestige_level: 1, badge_display: true, description: "Japan's most prestigious award for emerging literary fiction authors" },
  { id: 'award_naoki', name: 'Naoki Prize', name_jp: '直木賞', founded_year: 1935, country: 'Japan', prestige_level: 1, badge_display: true, description: "Japan's premier award for popular fiction and storytelling" },
];

/** @type {Object[]} Adaptation type entities (adaptation_types collection) */
export const MOCK_ADAPTATION_TYPES = [
  { id: 'adaptation_anime', name: 'Anime', name_jp: 'アニメ' },
  { id: 'adaptation_film', name: 'Film', name_jp: '映画' },
  { id: 'adaptation_manga', name: 'Manga', name_jp: '漫画' },
];
