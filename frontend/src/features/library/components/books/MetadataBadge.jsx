/**
 * @fileoverview Reusable metadata badge for book information.
 *
 * Renders a small pill-shaped label for book metadata (JLPT level,
 * difficulty, reading time, etc.). Reused by RecommendationCard (Phase 2),
 * BookCard (Phase 5), and BookDetailModal (Phase 9) — no book-specific
 * logic lives inside it, just label + variant + optional icon.
 */

const VARIANT_CLASSES = {
  default: 'bg-transparent border-library-border text-library-text-secondary',
  subtle: 'border-transparent bg-library-filter-active text-library-text-secondary',
  jlpt: 'bg-transparent border-library-text-primary/40 text-library-text-primary font-medium',
  difficulty: 'bg-transparent border-library-border text-library-text-secondary',
  time: 'bg-transparent border-library-border text-library-text-muted',
};

/**
 * @param {Object} props
 * @param {string} props.label - The badge text (e.g. "N2", "Intermediate", "~6h")
 * @param {'default'|'subtle'|'jlpt'|'difficulty'|'time'} [props.variant] - Visual variant
 * @param {string} [props.icon] - Optional icon before label (e.g. "⏱")
 */
export function MetadataBadge({ label, variant = 'default', icon }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </span>
  );
}
