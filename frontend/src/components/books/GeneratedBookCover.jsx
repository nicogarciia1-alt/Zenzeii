import React from 'react';

// Deterministic hash → index, so each book title always maps to the same palette
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Literary publisher palette — rich, muted, high-contrast
const PALETTES = [
  { bg: '#B5451B', text: '#FFF8F0', accent: '#FFD0A8', rule: '#FF9060' },  // Terracotta
  { bg: '#1B3A5C', text: '#EFF5FF', accent: '#A8C8EC', rule: '#5898CC' },  // Midnight blue
  { bg: '#2A5233', text: '#F0FFF4', accent: '#96D4A0', rule: '#4EAA60' },  // Forest green
  { bg: '#5C1B3A', text: '#FFF0F6', accent: '#ECA8C4', rule: '#CC5888' },  // Plum
  { bg: '#1A4A4A', text: '#F0FFFE', accent: '#80D4D0', rule: '#30A8A0' },  // Deep teal
  { bg: '#3D1A5C', text: '#F8F2FF', accent: '#C4A0EC', rule: '#9060CC' },  // Violet
  { bg: '#5C3A1B', text: '#FFF6EC', accent: '#EABF90', rule: '#CC8840' },  // Warm amber
  { bg: '#1B1B5C', text: '#F2F2FF', accent: '#9898EC', rule: '#5050CC' },  // Indigo
  { bg: '#3A3A3A', text: '#FAF8F4', accent: '#D4C8B0', rule: '#A89878' },  // Charcoal
  { bg: '#1B5C40', text: '#F0FFF8', accent: '#88E0B8', rule: '#30B878' },  // Emerald
  { bg: '#5C4A1B', text: '#FFFBF0', accent: '#ECD898', rule: '#CCAC40' },  // Gold
  { bg: '#5C1B1B', text: '#FFF4F0', accent: '#ECA898', rule: '#CC5040' },  // Crimson
];

// Subtle Japanese literary characters used as cover decoration
const DECO_CHARS = ['書', '文', '語', '詩', '話', '夢', '心', '道', '空', '風', '月', '光'];

const GeneratedBookCover = ({ book }) => {
  const titleKey = book.title || '';
  const authorKey = book.author || book.author_jp || '';

  const palette = PALETTES[hashString(titleKey) % PALETTES.length];
  const decoChar = DECO_CHARS[hashString(authorKey + titleKey) % DECO_CHARS.length];

  // Prefer Japanese title/author when available for aesthetic
  const displayTitle = book.title_jp || book.title || 'Untitled';
  const displayAuthor = book.author_jp || book.author || '';

  return (
    <div
      className="w-full h-full flex flex-col select-none"
      style={{ backgroundColor: palette.bg, color: palette.text }}
    >
      {/* Outer padding wrapper */}
      <div className="flex-1 flex flex-col" style={{ margin: '7%' }}>

        {/* Top rule — double-weight accent stripe */}
        <div className="shrink-0 flex flex-col gap-[3px] mb-[8%]">
          <div style={{ height: 2, backgroundColor: palette.rule }} />
          <div style={{ height: 1, backgroundColor: palette.accent, opacity: 0.5 }} />
        </div>

        {/* Title */}
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-[6%]">
          <h2
            style={{
              fontFamily: '"Noto Serif JP", "Merriweather", Georgia, "Times New Roman", serif',
              fontSize: '0.9em',
              fontWeight: 600,
              lineHeight: 1.35,
              color: palette.text,
              letterSpacing: '0.02em',
              // Clamp to 4 lines
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              width: '100%',
            }}
          >
            {displayTitle}
          </h2>

          {/* Thin centre rule */}
          <div
            style={{
              height: 1,
              backgroundColor: palette.accent,
              opacity: 0.7,
              width: '45%',
              flexShrink: 0,
            }}
          />

          {/* Author */}
          <p
            style={{
              fontFamily: '"Inter", "Noto Sans JP", sans-serif',
              fontSize: '0.6em',
              color: palette.accent,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {displayAuthor}
          </p>
        </div>

        {/* Decorative kanji character */}
        <div className="shrink-0 flex items-end justify-center" style={{ paddingTop: '8%' }}>
          <span
            style={{
              fontFamily: '"Noto Serif JP", serif',
              fontSize: '1.6em',
              color: palette.accent,
              opacity: 0.25,
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            {decoChar}
          </span>
        </div>

        {/* Bottom rule — mirror of top */}
        <div className="shrink-0 flex flex-col gap-[3px] mt-[4%]">
          <div style={{ height: 1, backgroundColor: palette.accent, opacity: 0.5 }} />
          <div style={{ height: 2, backgroundColor: palette.rule }} />
        </div>

      </div>
    </div>
  );
};

export default GeneratedBookCover;
