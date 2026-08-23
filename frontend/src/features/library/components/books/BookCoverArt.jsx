/**
 * @fileoverview Book cover art component.
 *
 * Renders either a provided cover image or a beautifully generated cover
 * using the book's title and author. This is NOT a placeholder — it is
 * the permanent generated-cover system; most books will never have real
 * artwork. Deliberately separate from the existing
 * frontend/src/components/books/GeneratedBookCover.jsx (used by the "My
 * Books" shelf) — same underlying idea, different spec, scoped to the
 * Library feature per the established features/library convention. That
 * file is untouched; genre-driven covers are Library-only.
 *
 * Genre-driven design system (replaces the old bookId-hash color pick):
 * each book's primary genre (see bookCoverGenres.js) determines the
 * whole visual identity — palette, decorative element, sidebar icon,
 * texture intensity. `genre_ids` is optional so every existing caller
 * keeps working unchanged; an empty/unmatched genre list renders the
 * neutral default design, same as before this system existed.
 *
 * The hash function itself (fnv1aHash) moved to libraryUtils.js in
 * Phase 4, once FeelingCard needed the same hash for its own color
 * derivation — see that file for the full rationale. It's still used
 * here, now just for picking the default design's kanji watermark
 * character rather than the cover's background color.
 */
import { fnv1aHash } from '../../utils/libraryUtils';
import { getGenreDesign } from './bookCoverGenres';
import { DECORATIVE_ELEMENTS, ArtDecoCorners, SidebarGenreIcon, GrainOverlay, SealStamp } from './bookCoverDecorations';

/** Decorative kanji options for the default design's watermark — one drawn per book via hash. */
const DECORATIVE_KANJI = ['空', '読', '心', '文'];

/**
 * Size variants. 'md' typography (text-lg title / text-xs author /
 * text-8xl kanji) is the brief's literal spec, originally sized for
 * Phase 2's RecommendationCard. 'sm' is exercised by BookCard's shelf/
 * compact variants (Phase 5), 'md' by BookCard's grid variant. 'rec'
 * (UI Refinement Brief Rev 1, Step 3) is ~10% larger than 'md' — 132x198
 * vs 120x180 — for RecommendationCard specifically; reuses md's internal
 * typography proportions since a 10% size bump doesn't cross any natural
 * Tailwind text-size step. 'lg' (160x240) is a general-purpose larger
 * variant, not currently used by any component. 'detail' (240x360) is
 * Phase 9's BookDetailPage hero cover — scaled proportionally from 'lg'.
 *
 * `sidebarDetail` gates how much of the sidebar renders at each size —
 * a 14px-wide sidebar (sm) physically cannot hold an icon circle, two
 * lines of vertical text, and a stamp without illegible clipping, so
 * smaller variants show progressively less: 'none' (color bar only),
 * 'icon' (+ genre icon circle), 'full' (+ vertical author name, romaji
 * caption, ZENZEII label, and the 読書禅 stamp).
 */
const SIZE_CONFIG = {
  sm: {
    wrapper: 'w-[80px] h-[120px]', padding: 'p-2', title: 'text-[10px]', author: 'text-[8px]', kanji: 'text-4xl',
    sidebarW: 'w-[14px]', sidebarDetail: 'none', iconSize: 'w-2.5 h-2.5', romajiTitle: 'text-[6px]',
  },
  md: {
    wrapper: 'w-[120px] h-[180px]', padding: 'p-3', title: 'text-lg', author: 'text-xs', kanji: 'text-8xl',
    sidebarW: 'w-[22px]', sidebarDetail: 'icon', iconSize: 'w-3.5 h-3.5', romajiTitle: 'text-[8px]',
  },
  rec: {
    wrapper: 'w-[132px] h-[198px]', padding: 'p-3', title: 'text-lg', author: 'text-xs', kanji: 'text-8xl',
    sidebarW: 'w-[24px]', sidebarDetail: 'icon', iconSize: 'w-3.5 h-3.5', romajiTitle: 'text-[8px]',
  },
  lg: {
    wrapper: 'w-[160px] h-[240px]', padding: 'p-4', title: 'text-xl', author: 'text-sm', kanji: 'text-9xl',
    sidebarW: 'w-[32px]', sidebarDetail: 'full', iconSize: 'w-4 h-4', romajiTitle: 'text-[9px]',
  },
  detail: {
    wrapper: 'w-[240px] h-[360px]', padding: 'p-6', title: 'text-2xl', author: 'text-base', kanji: 'text-[10rem]',
    sidebarW: 'w-[46px]', sidebarDetail: 'full', iconSize: 'w-6 h-6', romajiTitle: 'text-[11px]',
  },
};

/**
 * @param {Object} props
 * @param {string} props.bookId - Used to derive the default design's kanji watermark (consistent per book)
 * @param {string} props.titleJp - Japanese title displayed on generated cover
 * @param {string} props.titleEn - English title (used as aria-label)
 * @param {string} [props.titleRomaji] - Romanized title, shown small below the Japanese title
 * @param {string} [props.authorJp] - Japanese author name — main-area byline and sidebar vertical text
 * @param {string} [props.authorRomaji] - Romanized author name — sidebar small-caps line only
 * @param {string|null} [props.coverImage] - URL of real cover image, if available
 * @param {'sm'|'md'|'rec'|'lg'|'detail'} [props.size] - Cover size variant
 * @param {string[]} [props.genre_ids] - Genre IDs for design selection. Empty/unmatched falls back to the neutral default design.
 */
export function BookCoverArt({
  bookId,
  titleJp,
  titleEn,
  titleRomaji,
  authorJp,
  authorRomaji,
  coverImage,
  size = 'md',
  genre_ids = [],
}) {
  const config = SIZE_CONFIG[size] ?? SIZE_CONFIG.md;
  const label = `${titleEn} by ${authorJp || authorRomaji} — book cover`;

  if (coverImage) {
    return (
      <div className={`${config.wrapper} shrink-0 rounded shadow-inner overflow-hidden`}>
        <img src={coverImage} alt={label} loading="lazy" className="w-full h-full object-cover" />
      </div>
    );
  }

  const design = getGenreDesign(genre_ids);
  const reversedId = bookId.split('').reverse().join('');
  const kanji = DECORATIVE_KANJI[fnv1aHash(reversedId) % DECORATIVE_KANJI.length];
  const Decorative = DECORATIVE_ELEMENTS[design.decorative] ?? DECORATIVE_ELEMENTS.kanjiWatermark;
  const ruleColor = `${design.accent}80`;
  const showSidebarIcon = config.sidebarDetail !== 'none';
  const showSidebarFull = config.sidebarDetail === 'full';

  return (
    <div
      role="img"
      aria-label={label}
      className={`${config.wrapper} shrink-0 relative rounded shadow-inner overflow-hidden flex`}
      style={{ backgroundColor: design.background }}
    >
      {/* Sidebar — always a solid color column, never gradient or texture */}
      <div
        className={`${config.sidebarW} h-full shrink-0 flex flex-col items-center py-1.5 gap-1`}
        style={{
          backgroundColor: design.sidebar,
          borderRight: design.sidebarBorder ? `1px solid ${design.sidebarBorder}` : undefined,
        }}
      >
        {showSidebarFull && (
          <span
            className="text-[4.5px] tracking-widest uppercase text-center leading-tight"
            style={{ color: design.accent }}
          >
            ZENZEII
          </span>
        )}

        {showSidebarIcon && <SidebarGenreIcon icon={design.icon} color={design.accent} className={config.iconSize} />}

        {showSidebarFull && authorJp && (
          <span
            className="text-[7px] tracking-wide flex-1"
            style={{ color: design.author, writingMode: 'vertical-rl' }}
          >
            {authorJp}
          </span>
        )}

        {showSidebarFull && authorRomaji && (
          <span
            className="text-[6px] tracking-wide uppercase leading-tight text-center"
            style={{ color: design.romaji, writingMode: 'vertical-rl' }}
          >
            {authorRomaji}
          </span>
        )}

        {showSidebarFull && <SealStamp className="w-4 h-4" textClass="text-[5px]" />}
      </div>

      {/* Main area */}
      <div className={`relative flex-1 flex flex-col items-center justify-center overflow-hidden ${config.padding}`}>
        <Decorative color={design.accent} opacity={design.decorativeOpacity} kanji={kanji} sizeClass={config.kanji} />
        {design.cornerOrnaments && <ArtDecoCorners color={design.accent} />}

        <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
          <div className="h-px w-8" style={{ backgroundColor: ruleColor }} />
          <p
            className={`${design.titleFont ?? 'font-garamond'} font-medium ${config.title} leading-snug`}
            style={{ color: design.title }}
          >
            {titleJp}
          </p>
          {titleRomaji && (
            <p className={`${config.romajiTitle} uppercase tracking-wide`} style={{ color: design.romaji }}>
              {titleRomaji}
            </p>
          )}
          <div className="h-px w-8" style={{ backgroundColor: ruleColor }} />
        </div>

        {authorJp && (
          <p className={`relative z-10 mt-2 ${config.author}`} style={{ color: design.author }}>
            {authorJp}
          </p>
        )}

        <span
          className="relative z-10 mt-1 text-[4.5px] tracking-widest uppercase opacity-70"
          style={{ color: design.romaji }}
        >
          ZENZEII EDITION
        </span>

        <GrainOverlay opacity={design.textureOpacity} />
      </div>
    </div>
  );
}
