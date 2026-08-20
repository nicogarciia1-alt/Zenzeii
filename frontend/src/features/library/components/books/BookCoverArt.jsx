/**
 * @fileoverview Book cover art component.
 *
 * Renders either a provided cover image or a beautifully generated cover
 * using the book's title and author. This is NOT a placeholder — it is
 * the permanent generated-cover system; most books will never have real
 * artwork. Deliberately separate from the existing
 * frontend/src/components/books/GeneratedBookCover.jsx (used by the "My
 * Books" shelf) — same underlying idea, different spec (bookId-derived
 * hash rather than title-derived, a fixed 8-color literary palette,
 * explicit sm/md/lg size variants), scoped to the Library feature per
 * the established features/library convention. That file is untouched.
 *
 * The hash function itself (fnv1aHash) moved to libraryUtils.js in
 * Phase 4, once FeelingCard needed the same hash for its own color
 * derivation — see that file for the full rationale.
 */
import { fnv1aHash } from '../../utils/libraryUtils';

/** The complete 8-color generated-cover palette. Named constants — never inlined in JSX. */
const LITERARY_COLORS = [
  '#1B2A4A', // dark navy
  '#4A1B2A', // deep burgundy
  '#1B3A2A', // forest green
  '#2A2A3A', // slate
  '#3A2A1B', // warm brown
  '#1B3A3A', // deep teal
  '#2A2A2A', // charcoal
  '#3A1B3A', // plum
];

/** Decorative background kanji options — one drawn per book via hash. */
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
 */
const SIZE_CONFIG = {
  sm: { wrapper: 'w-[80px] h-[120px]', padding: 'p-2', title: 'text-[10px]', author: 'text-[8px]', kanji: 'text-4xl' },
  md: { wrapper: 'w-[120px] h-[180px]', padding: 'p-3', title: 'text-lg', author: 'text-xs', kanji: 'text-8xl' },
  rec: { wrapper: 'w-[132px] h-[198px]', padding: 'p-3', title: 'text-lg', author: 'text-xs', kanji: 'text-8xl' },
  lg: { wrapper: 'w-[160px] h-[240px]', padding: 'p-4', title: 'text-xl', author: 'text-sm', kanji: 'text-9xl' },
  detail: { wrapper: 'w-[240px] h-[360px]', padding: 'p-6', title: 'text-2xl', author: 'text-base', kanji: 'text-[10rem]' },
};

/**
 * @param {Object} props
 * @param {string} props.bookId - Used to derive cover color (consistent per book)
 * @param {string} props.titleJp - Japanese title displayed on generated cover
 * @param {string} props.titleEn - English title (used as aria-label)
 * @param {string} props.authorJp - Japanese author name on generated cover
 * @param {string|null} [props.coverImage] - URL of real cover image, if available
 * @param {'sm'|'md'|'rec'|'lg'|'detail'} [props.size] - Cover size variant
 */
export function BookCoverArt({ bookId, titleJp, titleEn, authorJp, coverImage, size = 'md' }) {
  const config = SIZE_CONFIG[size] ?? SIZE_CONFIG.md;
  const label = `${titleEn} by ${authorJp} — book cover`;

  if (coverImage) {
    return (
      <div className={`${config.wrapper} shrink-0 rounded shadow-inner overflow-hidden`}>
        <img src={coverImage} alt={label} loading="lazy" className="w-full h-full object-cover" />
      </div>
    );
  }

  const bgColor = LITERARY_COLORS[fnv1aHash(bookId) % LITERARY_COLORS.length];
  const reversedId = bookId.split('').reverse().join('');
  const kanji = DECORATIVE_KANJI[fnv1aHash(reversedId) % DECORATIVE_KANJI.length];

  return (
    <div
      role="img"
      aria-label={label}
      className={`${config.wrapper} ${config.padding} shrink-0 relative rounded shadow-inner overflow-hidden flex flex-col items-center justify-center`}
      style={{ backgroundColor: bgColor }}
    >
      {/* Faint decorative kanji watermark */}
      <span
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-center text-white opacity-5 ${config.kanji} leading-none select-none pointer-events-none`}
      >
        {kanji}
      </span>

      {/* Title block: rule / title / rule */}
      <div className="relative z-10 flex flex-col items-center gap-1.5 text-center">
        <div className="h-px w-8 bg-white/40" />
        <p className={`font-garamond font-medium text-white ${config.title} leading-snug`}>
          {titleJp}
        </p>
        <div className="h-px w-8 bg-white/40" />
      </div>

      {/* Author, below the lower rule */}
      <p className={`relative z-10 mt-2 text-white/70 ${config.author}`}>
        {authorJp}
      </p>
    </div>
  );
}
