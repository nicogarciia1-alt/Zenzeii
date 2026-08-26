/**
 * @fileoverview Bilingual content header for the Library catalog section.
 *
 * Replaces the plain SectionHeader ("All books" / "N books found") that
 * previously sat above CatalogGrid. Renders the bilingual title row plus
 * a sort control and a grid/list view toggle — both visual only, per the
 * COO redesign brief (Library Filter Sidebar Redesign, Aug 2026). Neither
 * has any wiring: the sort control always reads "人気順" (Most Popular,
 * the existing SORT_OPTIONS default) and the view toggle's "active" icon
 * is a hardcoded prop default, not real state. See the brief response's
 * connectivity report for what functional wiring each would need.
 *
 * Book cards themselves are untouched — this component only replaces the
 * header markup above CatalogGrid, not CatalogGrid or anything inside it.
 */
import { ChevronDown, Grid2X2, List } from 'lucide-react';

/**
 * @param {Object} props
 * @param {number} [props.total] - Live filtered book count from useCatalog. Defaults to 0 when not yet loaded.
 */
export function LibraryContentHeader({ total = 0 }) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-playfair text-[28px] font-semibold text-library-text-primary">すべての本</h2>
          <span className="text-base font-normal text-library-text-secondary">All books</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Sort control — visual only, no dropdown/logic. Always shows the SORT_OPTIONS default ("Most Popular" / 人気順). */}
          <button type="button" className="flex items-center gap-1 text-[13px] text-library-text-primary">
            並び替え: 人気順
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Grid/List view toggle — visual only, no state. Grid shown active per the mockup's default. */}
          <div className="flex items-center gap-2 bg-library-bg-shelf rounded-library-xs p-1">
            <button type="button" aria-label="Grid view" aria-pressed="true" className="p-1 text-library-red">
              <Grid2X2 className="w-[18px] h-[18px]" />
            </button>
            <button type="button" aria-label="List view" aria-pressed="false" className="p-1 text-library-text-secondary">
              <List className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-1.5">
        <p aria-live="polite" className="font-garamond text-sm text-library-text-primary">
          {total}冊 見つかりました
        </p>
        <p className="text-xs text-library-text-secondary">Showing {total} book{total === 1 ? '' : 's'}</p>
      </div>
    </div>
  );
}
