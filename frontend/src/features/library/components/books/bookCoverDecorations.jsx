/**
 * @fileoverview Decorative SVG elements, sidebar glyphs, texture overlay,
 * and the 読書禅 seal stamp for the genre-driven BookCoverArt system.
 *
 * Every decorative/background element renders into the same normalized
 * 200x300 viewBox (BookCoverArt's main area is always a 2:3-ish portrait
 * box) via `preserveAspectRatio="xMidYMid slice"` and `w-full h-full` —
 * that's what makes one shape definition scale correctly across every
 * SIZE_CONFIG variant (sm/md/rec/lg/detail) without per-size branching.
 *
 * Sidebar icons are separate: small 0-24 viewBox glyphs meant to sit
 * inside the sidebar's icon circle, colored via `currentColor` so the
 * caller sets color once on the wrapping element.
 */
import { useId } from 'react';

function Base({ opacity = 1, children }) {
  return (
    <svg
      viewBox="0 0 200 300"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      <g style={{ opacity }}>{children}</g>
    </svg>
  );
}

/** Five-petal blossom cluster, reused by CherryBlossomBranch and FallingPetals. */
function Blossom({ cx, cy, r, color }) {
  return (
    <g fill={color}>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx={cx}
          cy={cy - r}
          rx={r * 0.55}
          ry={r}
          transform={`rotate(${angle} ${cx} ${cy})`}
        />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------
// Background decorative elements — one per genre design, keyed by the
// `decorative` field in GENRE_DESIGNS (bookCoverGenres.js).
// ---------------------------------------------------------------------

function CherryBlossomBranch({ color, opacity }) {
  return (
    <Base opacity={opacity}>
      <g stroke={color} strokeWidth="2" fill="none">
        <path d="M130 20 Q155 35 190 28" />
        <path d="M150 26 Q160 10 175 8" />
      </g>
      <Blossom cx={150} cy={26} r={7} color={color} />
      <Blossom cx={174} cy={13} r={5.5} color={color} />
      <Blossom cx={186} cy={30} r={5} color={color} />
    </Base>
  );
}

function InkWashHorizon({ color, opacity }) {
  return (
    <Base opacity={opacity}>
      <path d="M0 210 Q50 199 100 212 T200 207" stroke={color} strokeWidth="3" fill="none" />
      <path d="M0 223 Q60 214 120 225 T200 219" stroke={color} strokeWidth="1.5" fill="none" opacity="0.6" />
    </Base>
  );
}

function InkSplatterBottom({ color, opacity }) {
  return (
    <Base opacity={opacity}>
      <g fill={color}>
        <circle cx="40" cy="280" r="10" />
        <circle cx="61" cy="270" r="4" />
        <circle cx="25" cy="264" r="3" />
        <circle cx="70" cy="288" r="2.5" />
        <circle cx="15" cy="284" r="2" />
      </g>
    </Base>
  );
}

/** Mystery gets Art Deco corner brackets in addition to the ink splatter — always full opacity, it's a linework ornament, not a wash. */
function ArtDecoCorners({ color }) {
  const bracket = (transform) => (
    <g transform={transform} stroke={color} strokeWidth="1.5" fill="none">
      <path d="M0 16 L0 0 L16 0" />
      <path d="M4 20 L4 4 L20 4" />
    </g>
  );
  return (
    <Base opacity={0.8}>
      {bracket('translate(4,4)')}
      {bracket('translate(196,4) scale(-1,1)')}
      {bracket('translate(4,296) scale(1,-1)')}
      {bracket('translate(196,296) scale(-1,-1)')}
    </Base>
  );
}

function InkSplatterAbstract({ color, opacity }) {
  return (
    <Base opacity={opacity}>
      <g fill={color}>
        <path d="M20 40 Q40 20 70 35 Q90 50 60 70 Q30 80 20 40 Z" />
        <circle cx="152" cy="100" r="14" />
        <circle cx="172" cy="130" r="5" />
        <circle cx="132" cy="60" r="3" />
      </g>
      {/* stone lantern, bottom center, small */}
      <g transform="translate(85,252)" fill="none" stroke={color} strokeWidth="1.5">
        <rect x="0" y="10" width="20" height="14" />
        <path d="M-4 10 L24 10 L20 4 L0 4 Z" />
        <rect x="6" y="24" width="8" height="10" />
        <circle cx="10" cy="0" r="3" fill={color} stroke="none" />
      </g>
    </Base>
  );
}

function SparkleStars({ color, opacity }) {
  const star = (cx, cy, s, key) => (
    <path
      key={key}
      d={`M${cx} ${cy - s} L${cx + s * 0.3} ${cy - s * 0.3} L${cx + s} ${cy} L${cx + s * 0.3} ${cy + s * 0.3} L${cx} ${cy + s} L${cx - s * 0.3} ${cy + s * 0.3} L${cx - s} ${cy} L${cx - s * 0.3} ${cy - s * 0.3} Z`}
      fill={color}
    />
  );
  return (
    <Base opacity={opacity}>
      {star(30, 28, 5, 'a')}
      {star(172, 48, 4, 'b')}
      {star(150, 18, 3, 'c')}
      {star(52, 58, 3, 'd')}
      {/* botanical divider line, below title */}
      <path d="M40 132 Q100 124 160 132" stroke={color} strokeWidth="1.5" fill="none" opacity="0.7" />
      <circle cx="70" cy="129" r="2" fill={color} />
      <circle cx="130" cy="129" r="2" fill={color} />
    </Base>
  );
}

function FallingPetals({ color, opacity }) {
  const petal = (cx, cy, r, rot, key) => (
    <ellipse key={key} cx={cx} cy={cy} rx={r} ry={r * 0.6} transform={`rotate(${rot} ${cx} ${cy})`} fill={color} />
  );
  return (
    <Base opacity={opacity}>
      {petal(40, 30, 6, 20, 'a')}
      {petal(92, 15, 5, -30, 'b')}
      {petal(152, 45, 5.5, 60, 'c')}
      {petal(62, 92, 4, 10, 'd')}
      {petal(172, 102, 4.5, -15, 'e')}
      {petal(112, 142, 4, 45, 'f')}
    </Base>
  );
}

function BrushStrokeLine({ color, opacity }) {
  return (
    <Base opacity={opacity}>
      <path d="M20 100 Q100 92 190 98" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      <g transform="translate(160,180)" stroke={color} strokeWidth="1.3" fill="none">
        <path d="M0 20 Q4 4 0 -10" />
        <path d="M0 5 Q10 0 14 -8" />
        <path d="M0 10 Q-10 6 -13 -2" />
      </g>
    </Base>
  );
}

function StarField({ color, opacity }) {
  const dots = [
    [20, 20, 1.5], [50, 40, 1], [170, 25, 1.8], [140, 60, 1],
    [30, 90, 1.2], [190, 90, 1], [100, 30, 0.8], [160, 120, 1.3],
  ];
  return (
    <Base opacity={opacity}>
      <g fill={color}>
        {dots.map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      <path d="M175 30 A16 16 0 1 0 175 62 A12 12 0 1 1 175 30 Z" fill={color} opacity="0.5" />
    </Base>
  );
}

function EnsoCircle({ color, opacity }) {
  return (
    <Base opacity={opacity}>
      <path d="M100 40 A90 90 0 1 1 40 90" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
    </Base>
  );
}

function BambooStalk({ color, opacity }) {
  return (
    <Base opacity={opacity}>
      <g stroke={color} strokeWidth="2.5" fill="none">
        <line x1="170" y1="20" x2="170" y2="280" />
        <line x1="160" y1="90" x2="180" y2="90" />
        <line x1="160" y1="170" x2="180" y2="170" />
        <path d="M170 60 Q190 50 200 35" strokeWidth="1.5" />
        <path d="M170 220 Q155 210 145 195" strokeWidth="1.5" />
      </g>
    </Base>
  );
}

/** Fallback for genres with no bespoke design (memoir, contemporary, anthology, unknown). Kanji is chosen by BookCoverArt via the same bookId hash the old system used. */
function KanjiWatermark({ color, opacity, kanji, sizeClass }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
      style={{ opacity }}
    >
      <span className={`${sizeClass} leading-none font-bold`} style={{ color }}>
        {kanji}
      </span>
    </div>
  );
}

export const DECORATIVE_ELEMENTS = {
  cherryBlossomBranch: CherryBlossomBranch,
  inkWashHorizon: InkWashHorizon,
  inkSplatterBottom: InkSplatterBottom,
  inkSplatterAbstract: InkSplatterAbstract,
  sparkleStars: SparkleStars,
  fallingPetals: FallingPetals,
  brushStrokeLine: BrushStrokeLine,
  starField: StarField,
  ensoCircle: EnsoCircle,
  bambooStalk: BambooStalk,
  kanjiWatermark: KanjiWatermark,
};

export { ArtDecoCorners };

// ---------------------------------------------------------------------
// Sidebar icons — small glyphs for the genre icon circle. viewBox 0-24,
// draw with currentColor so the caller sets color on the wrapper.
// ---------------------------------------------------------------------

function SakuraIcon() {
  return (
    <>
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d="M12 10.5 Q10 7 12 4 Q14 7 12 10.5 Z" transform={`rotate(${a} 12 12)`} fill="currentColor" />
      ))}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  );
}

function CrossedSwordsIcon() {
  return (
    <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
      <line x1="5" y1="19" x2="19" y2="5" />
      <line x1="5" y1="5" x2="19" y2="19" />
      <path d="M4 20 L6 18" />
      <path d="M18 18 L20 20" />
      <path d="M4 4 L6 6" />
      <path d="M18 6 L20 4" />
    </g>
  );
}

function MagnifyingGlassIcon() {
  return (
    <>
      <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="14.5" y1="14.5" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function FlameIcon() {
  return <path d="M12 3 Q16 8 14 12 Q18 12 16 17 Q14 21 10 20 Q6 18 7 13 Q8 15 9 13 Q7 9 12 3 Z" fill="currentColor" />;
}

function LeafIcon() {
  return (
    <>
      <path d="M5 19 Q4 10 12 4 Q20 10 19 19 Q12 15 5 19 Z" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <path d="M12 5 Q12 12 6 18" stroke="currentColor" strokeWidth="1" fill="none" />
    </>
  );
}

function CompassStarIcon() {
  return (
    <>
      {[0, 45, 90, 135].map((a) => (
        <path key={a} d="M12 3 L13.3 10.7 L12 12 L10.7 10.7 Z" transform={`rotate(${a} 12 12)`} fill="currentColor" />
      ))}
    </>
  );
}

function EnsoIcon() {
  return <path d="M12 4 A8 8 0 1 1 6 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />;
}

function BambooIcon() {
  return (
    <g stroke="currentColor" strokeWidth="1.8">
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </g>
  );
}

function BookIcon() {
  return (
    <>
      <path d="M4 5 Q9 3 12 5 Q15 3 20 5 L20 18 Q15 16 12 18 Q9 16 4 18 Z" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <line x1="12" y1="5" x2="12" y2="18" stroke="currentColor" strokeWidth="1" />
    </>
  );
}

const SIDEBAR_ICON_PATHS = {
  sakura: SakuraIcon,
  crossedSwords: CrossedSwordsIcon,
  magnifyingGlass: MagnifyingGlassIcon,
  flame: FlameIcon,
  leaf: LeafIcon,
  compassStar: CompassStarIcon,
  enso: EnsoIcon,
  bamboo: BambooIcon,
  book: BookIcon,
};

/** Renders the genre icon inside its circle. `color` sets both the ring and the glyph. */
export function SidebarGenreIcon({ icon, color, className = 'w-5 h-5' }) {
  const Glyph = SIDEBAR_ICON_PATHS[icon] ?? BookIcon;
  return (
    <div
      className={`${className} shrink-0 rounded-full border flex items-center justify-center`}
      style={{ borderColor: color, color }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="w-3/5 h-3/5">
        <Glyph />
      </svg>
    </div>
  );
}

/**
 * Subtle grain overlay, top layer, opacity driven by the genre design.
 * One shared fractal-noise filter for every genre — the spec names a
 * different texture per genre in prose (parchment grain, rice paper,
 * heavy grain...) but they're all the same "subtle noise" effect at
 * different strengths, so one filter parametrized by opacity covers all
 * of them without ten near-identical feTurbulence variants.
 *
 * useId() keeps the filter id unique per rendered cover — plain grid
 * pages render dozens of BookCoverArt instances at once, and a
 * duplicate SVG filter id is invalid and unreliable across browsers.
 */
export function GrainOverlay({ opacity }) {
  const filterId = `zenzeii-grain-${useId()}`;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none mix-blend-overlay" aria-hidden="true">
      <filter id={filterId}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" style={{ opacity }} filter={`url(#${filterId})`} />
    </svg>
  );
}

/**
 * 読書禅 seal stamp — the Zenzeii mark. Fixed brand red regardless of
 * genre (it's a colophon, not a decorative element), always in the
 * sidebar's bottom slot.
 */
export function SealStamp({ className = 'w-4 h-4', textClass = 'text-[5px]' }) {
  return (
    <div
      aria-hidden="true"
      className={`${className} shrink-0 border border-[#9B2020] bg-[#F2E8D8] grid grid-cols-2 grid-rows-2 place-items-center leading-none`}
    >
      <span className={`${textClass} text-[#9B2020] font-bold`}>読</span>
      <span className={`${textClass} text-[#9B2020] font-bold`}>書</span>
      <span className={`${textClass} text-[#9B2020] font-bold col-span-2`}>禅</span>
    </div>
  );
}
