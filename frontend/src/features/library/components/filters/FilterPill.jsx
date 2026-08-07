/**
 * @fileoverview Selectable filter pill for the advanced filter panel.
 *
 * A toggleable checkbox for a single taxonomy option, styled as a pill.
 * Rendered by FilterSection — one per taxonomy entity in that section.
 *
 * role="checkbox" rather than a real <input type="checkbox"> because the
 * pill's entire clickable surface (padding, hover state, selected fill)
 * needs to be the label — a native checkbox would force a separate
 * input+label pairing for the same visual result. It's a real <button>
 * underneath, so Space/Enter already toggle it via native semantics.
 */

/**
 * @param {Object} props
 * @param {string} props.value - The filter value
 * @param {string} props.label - Display label
 * @param {string} [props.labelJp] - Optional Japanese label (shown below main label, desktop only)
 * @param {boolean} props.selected - Whether this option is currently selected
 * @param {function} props.onToggle - Called with value when pill is clicked
 */
export function FilterPill({ value, label, labelJp, selected, onToggle }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={label}
      onClick={() => onToggle(value)}
      className={`flex flex-col items-center rounded-full px-3 py-1.5 text-xs cursor-pointer border transition-colors duration-150 ${
        selected
          ? 'bg-library-red border-library-red text-white hover:bg-library-red-hover'
          : 'bg-transparent border-library-border text-library-text-primary hover:bg-library-bg-shelf'
      }`}
    >
      <span>{label}</span>
      {labelJp && <span className="hidden lg:block text-[10px] opacity-70">{labelJp}</span>}
    </button>
  );
}
