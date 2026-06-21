// Shared reader constants — imported by both ReaderScreen and SettingsSheet.
// Kept in a plain JS file (no React) to avoid circular imports.

export const READER_THEMES = [
  { value: 'default', name: 'Default', bg: '#FFFFFF', text: '#2B2B2B', border: '#E5E5E5', muted: '#595959' },
  { value: 'washi',   name: '和紙',    bg: '#f5efe0', text: '#3d2b1f', border: '#c8b89a', muted: '#6b5040' },
  { value: 'sumi',    name: '墨',      bg: '#1c1a17', text: '#e5dfd5', border: '#2e2c28', muted: '#b8b0a4' },
  { value: 'sakura',  name: '桜',      bg: '#fdf0f3', text: '#4a1f2e', border: '#f0c4d0', muted: '#7a4455' },
  { value: 'take',    name: '竹',      bg: '#f0f5ec', text: '#1f3d2b', border: '#c4d8b8', muted: '#3d6650' },
];

export const FONT_FAMILY_MAP = {
  'noto-serif':   'NotoSerifJP',
  'noto-sans':    'System',
  'merriweather': 'Georgia',
};

export const FONT_SIZE_MAP = { sm: 16, base: 18, lg: 20, xl: 24 };

export const LINE_HEIGHT_MAP = { normal: 1.5, relaxed: 1.8, loose: 2.2 };

export const SENTENCES_PER_PAGE_OPTIONS = [10, 20, 30, 50, 75, 100];
