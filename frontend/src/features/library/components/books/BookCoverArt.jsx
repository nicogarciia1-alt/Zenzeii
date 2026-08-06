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
 */

/**
 * Deterministic FNV-1a string hash — derives cover color and decorative
 * kanji per book.
 *
 * Not the simplest possible hash (a djb2-style `hash*31+char` was tried
 * first and rejected): verified empirically against the 10 real seeded
 * book IDs and it collapsed badly — 6 of 10 IDs share the exact
 * "aozora-" prefix, and that hash's poor mixing at small moduli put 6 of
 * them on the same color. FNV-1a spreads meaningfully better on the same
 * real data (verified: 4 distinct colors instead of 3, largest cluster
 * 4 books instead of 6). Color and kanji are hashed from different
 * transforms of the input (forward vs. reversed string) so they vary
 * independently — hashing both from the same value with moduli 8 and 4
 * would make kanji fully determined by color, since 4 divides 8.
 */
function fnv1aHash(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

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
 * text-8xl kanji) is the brief's literal spec — Phase 2's
 * RecommendationCard is the only place this component renders today, and
 * it uses 'md'. 'sm'/'lg' are scaled proportionally from that baseline
 * for Phase 5 (BookCardShelf) and Phase 9 (BookDetailModal); not yet
 * visually exercised.
 */
const SIZE_CONFIG = {
  sm: { wrapper: 'w-[80px] h-[120px]', padding: 'p-2', title: 'text-[10px]', author: 'text-[8px]', kanji: 'text-4xl' },
  md: { wrapper: 'w-[120px] h-[180px]', padding: 'p-3', title: 'text-lg', author: 'text-xs', kanji: 'text-8xl' },
  lg: { wrapper: 'w-[160px] h-[240px]', padding: 'p-4', title: 'text-xl', author: 'text-sm', kanji: 'text-9xl' },
};

/**
 * @param {Object} props
 * @param {string} props.bookId - Used to derive cover color (consistent per book)
 * @param {string} props.titleJp - Japanese title displayed on generated cover
 * @param {string} props.titleEn - English title (used as aria-label)
 * @param {string} props.authorJp - Japanese author name on generated cover
 * @param {string|null} [props.coverImage] - URL of real cover image, if available
 * @param {'sm'|'md'|'lg'} [props.size] - Cover size variant
 */
export function BookCoverArt({ bookId, titleJp, titleEn, authorJp, coverImage, size = 'md' }) {
  const config = SIZE_CONFIG[size] ?? SIZE_CONFIG.md;
  const label = `${titleEn} by ${authorJp} — book cover`;

  if (coverImage) {
    return (
      <div className={`${config.wrapper} shrink-0 rounded shadow-inner overflow-hidden`}>
        <img src={coverImage} alt={label} className="w-full h-full object-cover" />
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
