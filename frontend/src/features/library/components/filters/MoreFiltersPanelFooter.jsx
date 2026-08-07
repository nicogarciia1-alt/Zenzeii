/**
 * @fileoverview Footer for the advanced filter panel.
 *
 * Shows active filter count, "Clear all" link, and the primary action
 * button — "Done" on desktop (filters already applied live) or
 * "Show X results" on mobile (filters apply on tap).
 *
 * resultCount is nullable: FilterBar doesn't have the real catalog count
 * available to it in Phase 8 (that requires lifting more state than this
 * phase scopes — deferred to Phase 11), so it passes null rather than a
 * fabricated 0. null means "unknown" and shows a plain "Show results";
 * only a real, known 0 triggers the disabled "No results" state — an
 * always-disabled button would make the sheet's one primary action
 * permanently unusable, which null (vs. a hardcoded 0) avoids.
 */

/**
 * @param {Object} props
 * @param {number} props.activeCount - Number of active Layer 2 filters
 * @param {number|null} props.resultCount - Current catalog result count, or null if not known yet
 * @param {boolean} props.liveUpdate - Desktop (true) vs mobile (false) mode
 * @param {function} props.onClearAll - Called when "Clear all" is clicked
 * @param {function} props.onApply - Called when the primary button is clicked
 */
export function MoreFiltersPanelFooter({ activeCount, resultCount, liveUpdate, onClearAll, onApply }) {
  const noResults = resultCount === 0;
  const primaryLabel = liveUpdate
    ? 'Done'
    : noResults
    ? 'No results'
    : resultCount == null
    ? 'Show results'
    : `Show ${resultCount} results`;

  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-4 py-4 px-6 bg-white border-t border-library-border">
      <div className="text-sm text-library-text-secondary">
        {activeCount > 0 && (
          <>
            {activeCount} active filter{activeCount === 1 ? '' : 's'}
            {' · '}
            <button type="button" onClick={onClearAll} className="text-library-red hover:underline">
              Clear all
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onApply}
        disabled={!liveUpdate && noResults}
        className={`shrink-0 rounded px-5 py-2 text-sm font-medium text-white bg-library-red transition-colors ${
          !liveUpdate && noResults ? 'opacity-60 cursor-not-allowed' : 'hover:bg-library-red-hover'
        }`}
      >
        {primaryLabel}
        {!liveUpdate && !noResults && (
          <span aria-hidden="true" className="ml-1.5">
            →
          </span>
        )}
      </button>
    </div>
  );
}
