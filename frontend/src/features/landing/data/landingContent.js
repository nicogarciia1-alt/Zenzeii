/**
 * @fileoverview Copy, links and image paths for the Zenzeii landing page.
 * Plain data only — no JSX — so the sections stay presentational.
 */

/**
 * Both images are cut directly from the approved mockup (no other imagery
 * exists for this design yet):
 *   hero    — the mockup's hero photograph, cropped
 *   closing — the mockup's bottom landscape band, with its baked-in text
 *             painted out so the real headline and buttons sit on top
 * Swap the files at these paths (or edit the paths here) when higher-
 * resolution originals are available; nothing else references them.
 */
export const LANDING_IMAGES = {
  hero: '/assets/landing/hero.png',
  closing: '/assets/landing/closing.png',
};

/** The only two conversion actions on the page (hero + closing). */
export const LANDING_CTAS = {
  create: { label: 'Create an account', to: '/auth' },
  enter: { label: 'Enter the library', to: '/library' },
};

export const TOSHOKAN_LINK = {
  label: 'Learn more about the Toshokan Pass',
  to: '/pricing',
};

/** Order matters — rendered as the six-column exhibition, left to right. */
export const PRODUCT_STORIES = [
  {
    key: 'read',
    number: '01',
    action: '読む',
    actionEnglish: 'Read',
    phrase: '美しく、読みやすく。',
    description: 'A clean, focused reading experience with kanji support and helpful tools.',
  },
  {
    key: 'save',
    number: '02',
    action: '残す',
    actionEnglish: 'Save',
    phrase: '印をつけて、あとで。また。',
    description: 'Highlight passages, save words, and build your personal library.',
  },
  {
    key: 'listen',
    number: '03',
    action: '聴く',
    actionEnglish: 'Listen',
    phrase: '文学を、耳で楽しむ。',
    description: 'High-quality AI narration. Take your reading with you.',
  },
  {
    key: 'understand',
    number: '04',
    action: '調べる',
    actionEnglish: 'Understand',
    phrase: 'すぐに、深く理解できる。',
    description: 'Get instant explanations, explore context, and learn as you read.',
  },
  {
    key: 'community',
    number: '05',
    action: 'つながる',
    actionEnglish: 'Community',
    phrase: '好きな本で、ひととつながる。',
    description: 'Discover community shelves, follow readers, and share your perspective.',
  },
  {
    key: 'discover',
    number: '06',
    action: '探す',
    actionEnglish: 'Discover',
    phrase: '名作から、まだ知らない一冊まで。',
    description: 'Thousands of Japanese books, carefully curated for deeper discovery.',
  },
];

export const MEMBERSHIP_NOTES = [
  { key: 'read', icon: 'infinity', japanese: 'より多くの作品にアクセス', english: 'More to read.' },
  { key: 'listen', icon: 'headphones', japanese: 'すべての音声コンテンツ', english: 'More to listen to.' },
  { key: 'look-forward', icon: 'star', japanese: '新しい機能をいち早く', english: 'More to look forward to.' },
];
