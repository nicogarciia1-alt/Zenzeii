/**
 * @fileoverview Reusable star rating display component.
 *
 * Renders filled gold stars + numeric rating + optional review count.
 * Read-only in all current phases — not interactive. Reused by
 * RecommendationCard (Phase 2), BookCard (Phase 5), and BookDetailModal
 * (Phase 9).
 *
 * Partial-star rendering uses an overlay-clip technique: a full row of
 * outline (stroke-only) stars sits underneath a full row of solid gold
 * stars, and the top row's container is clipped to `rating/5` width — no
 * separate half-star glyphs, no per-star clip-path math.
 */
import { formatRatingCount } from '../../utils/libraryUtils';

const SIZE_CLASSES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
};

/** @param {{ className: string, filled: boolean }} props */
function Star({ className, filled }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1}
    >
      <path d="M10 1.5l2.59 5.25 5.79.84-4.19 4.09.99 5.77L10 14.77l-5.18 2.68.99-5.77L1.62 7.59l5.79-.84L10 1.5z" />
    </svg>
  );
}

/**
 * @param {Object} props
 * @param {number} props.rating - Numeric rating (0-5, supports decimals)
 * @param {number} [props.count] - Number of ratings (displayed as "1.2k" if >= 1000)
 * @param {'sm'|'md'} [props.size] - Star size: sm for cards, md for detail
 */
export function StarRating({ rating, count, size = 'sm' }) {
  const clamped = Math.max(0, Math.min(5, rating));
  const fillPercent = (clamped / 5) * 100;
  const starSize = SIZE_CLASSES[size] ?? SIZE_CLASSES.sm;

  const label =
    count != null
      ? `Rated ${clamped} out of 5 stars by ${count} readers`
      : `Rated ${clamped} out of 5 stars`;

  return (
    <div className="inline-flex items-center gap-1.5" role="img" aria-label={label}>
      <div className="relative inline-flex">
        {/* Outline layer — always all 5 stars */}
        <div className="flex gap-0.5 text-library-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={starSize} filled={false} />
          ))}
        </div>
        {/* Filled layer — clipped to the rating percentage */}
        <div
          className="absolute inset-0 flex gap-0.5 text-library-star overflow-hidden"
          style={{ width: `${fillPercent}%` }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={starSize} filled />
          ))}
        </div>
      </div>
      <span className="text-sm font-bold text-library-text-primary">{clamped.toFixed(1)}</span>
      {count != null && (
        <span className="text-xs text-library-text-muted">({formatRatingCount(count)})</span>
      )}
    </div>
  );
}
