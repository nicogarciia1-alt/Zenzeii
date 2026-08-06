/**
 * @fileoverview "More Filters" button for the Library filter bar.
 *
 * Opens the advanced Layer 2 filter panel (MoreFiltersPanel — Phase 8).
 * In Phase 3: renders as a styled button, logs to console on click.
 * Phase 8: receives onOpen callback to show MoreFiltersPanel.
 */
import { SlidersHorizontal } from 'lucide-react';

const DEFAULT_ON_OPEN = () =>
  console.log('[MoreFiltersButton] More Filters clicked — Phase 8 will open MoreFiltersPanel');

/**
 * @param {Object} props
 * @param {function} [props.onOpen] - Called when button is clicked (Phase 8)
 * @param {number} [props.activeCount] - Number of active advanced filters (Phase 8)
 */
export function MoreFiltersButton({ onOpen = DEFAULT_ON_OPEN, activeCount = 0 }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="More filters"
      aria-haspopup="dialog"
      className="relative h-full flex flex-col items-center justify-center gap-0.5 px-3 min-w-[80px] border-l border-library-border text-library-text-secondary hover:bg-library-bg-shelf transition-colors"
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
