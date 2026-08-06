/**
 * @fileoverview Reusable section header for Library sections.
 *
 * Renders a title (with optional icon), subtitle, and optional "View all"
 * link. Used consistently across all Library sections for visual
 * coherence — this exact component is reused by RecommendationSection
 * (Phase 2), every BookShelf (Phase 4), and CatalogGrid (Phase 6). No
 * section-specific logic lives inside it.
 */

/**
 * @param {Object} props
 * @param {string} props.title - Section title text
 * @param {string} [props.subtitle] - Optional subtitle below title
 * @param {string} [props.icon] - Optional icon/emoji before title (e.g. "✦")
 * @param {string} [props.viewAllLabel] - Label for the "View all" link (e.g. "View all")
 * @param {function} [props.onViewAll] - Called when "View all" is clicked
 */
export function SectionHeader({ title, subtitle, icon, viewAllLabel, onViewAll }) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="flex items-center gap-2 font-playfair text-[22px] md:text-2xl font-semibold text-library-text-primary">
          {icon && (
            <span aria-hidden="true" className="text-library-red">
              {icon}
            </span>
          )}
          <span>{title}</span>
        </h2>
        {viewAllLabel && onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-sm text-library-text-secondary hover:underline whitespace-nowrap"
          >
            {viewAllLabel}
          </button>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-[13px] text-library-text-secondary">{subtitle}</p>
      )}
    </div>
  );
}
