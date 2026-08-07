/**
 * @fileoverview "More Filters" button for the Library filter bar.
 *
 * Opens the advanced Layer 2 filter panel (MoreFiltersPanel). FilterBar
 * always supplies a real onOpen, so DEFAULT_ON_OPEN below only runs if
 * this button is ever rendered standalone, outside FilterBar — a
 * defensive fallback, not a pending stub.
 */
import { SlidersHorizontal } from 'lucide-react';

const DEFAULT_ON_OPEN = () =>
  console.log('[MoreFiltersButton] More Filters clicked, but no onOpen handler was provided.');

/**
 * @param {Object} props
 * @param {function} [props.onOpen] - Called when button is clicked
 * @param {number} [props.activeCount] - Number of active advanced filters
 */
export function MoreFiltersButton({ onOpen = DEFAULT_ON_OPEN, activeCount = 0 }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="More filters"
      aria-haspopup="dialog"
      className="relative h-full flex flex-col items-center justify-center gap-0.5 px-3 min-w-[80px] border-l border-library-border text-library-text-secondary hover:bg-library-bg-shelf transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-inset"
    >
      <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
      <span className="hidden lg:block text-xs">More Filters</span>

      {activeCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-library-red text-white text-[10px] font-medium leading-none"
        >
          {activeCount}
        </span>
      )}
    </button>
  );
}
