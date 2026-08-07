/**
 * @fileoverview Collection card for mood/setting/cultural concept shelves.
 *
 * Renders a square card with a full-bleed background image (or a
 * generated gradient placeholder), a bottom gradient overlay, and the
 * collection name + book count. Used in "Explore by feeling" and
 * "Discover Japan through stories" shelves.
 *
 * Root element does not carry role="listitem" — the parent
 * ShelfScrollContainer's wrapper div already owns that role uniformly
 * for every card type it renders; adding it here too would be a
 * duplicate/conflicting role on the same list.
 */
import { fnv1aHash } from '../../utils/libraryUtils';

/**
 * 6 named gradient pairs — "moody/atmospheric" tones, deliberately
 * distinct from BookCoverArt's 8-color literary palette. Selected via
 * fnv1aHash(id) % 6 and applied through inline style, never a
 * dynamically-constructed Tailwind class: a template-literal class like
 * `from-[${hex}]` would never be picked up by Tailwind's static JIT
 * source scan, since the hex value doesn't exist as literal text
 * anywhere in this file — it would silently produce no CSS at all.
 */
const FEELING_GRADIENTS = [
  { from: '#2F3B47', to: '#1A2129' }, // deep slate
  { from: '#263D2E', to: '#15241A' }, // forest green
  { from: '#3A3F47', to: '#22262C' }, // storm gray
  { from: '#4A3620', to: '#2E2013' }, // warm amber
  { from: '#1E3A4C', to: '#11212C' }, // ocean blue
  { from: '#4A2A22', to: '#2C1815' }, // autumn red
];

/**
 * @param {Object} props
 * @param {string} props.id - Collection ID (e.g. "rainy_day")
 * @param {string} props.name - Collection name (e.g. "Rainy Day")
 * @param {string} [props.nameJp] - Japanese name (e.g. "雨の日")
 * @param {number} props.bookCount - Number of books in this collection
 * @param {string} [props.imageUrl] - Background image URL (null = generated gradient)
 * @param {string} [props.emoji] - Emoji icon shown if no image
 * @param {function} [props.onClick] - Called when card is clicked
 */
export function FeelingCard({ id, name, nameJp, bookCount, imageUrl, emoji, onClick }) {
  // TODO: filtering the catalog by collection needs the dynamic collection
  // backend feature (ShelvesSection is still on mock data) — not yet built.
  const handleClick = () => {
    if (onClick) onClick(id);
  };

  const gradient = FEELING_GRADIENTS[fnv1aHash(id) % FEELING_GRADIENTS.length];

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${name} — ${bookCount} books`}
      title={nameJp}
      // rounded-library-lg (16px), not -xl (24px): the brief's Step 5 text says
      // "rounded-xl (16px from new scale)" but Step 0's own scale defines
      // lg=16px/xl=24px — honoring the stated 16px figure over the mislabeled
      // token name.
      className="relative w-[156px] h-[156px] md:w-[180px] md:h-[180px] rounded-library-lg overflow-hidden text-left shadow-library-card hover:scale-[1.03] hover:shadow-library-card-hover transition-all duration-slow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
      style={!imageUrl ? { background: `linear-gradient(to bottom right, ${gradient.from}, ${gradient.to})` } : undefined}
    >
      {imageUrl && (
        <img src={imageUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Bottom gradient overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" aria-hidden="true" />

      <div className="relative z-10 h-full p-spacing-2 flex flex-col">
        {emoji && !imageUrl && (
          <span aria-hidden="true" className="text-3xl text-white">
            {emoji}
          </span>
        )}

        <div className="mt-auto">
          <p className="font-garamond text-sm font-medium text-white">{name}</p>
          <p className="mt-spacing-1 text-xs text-white/70">{bookCount} books</p>
        </div>
      </div>
    </button>
  );
}
