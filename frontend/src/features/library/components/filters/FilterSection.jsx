/**
 * @fileoverview A single taxonomy category section within MoreFiltersPanel.
 *
 * Renders a section heading and a row of selectable FilterPills. On
 * mobile, long option lists (Setting, Cultural Concepts) start collapsed
 * behind a toggle so the sheet doesn't open onto a wall of pills — the
 * toggle only renders at all when `collapsible` is true, so short
 * sections (Historical Period, Awards, Adaptations) always show every
 * option immediately.
 */
import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FilterPill } from './FilterPill';

/**
 * @param {Object} props
 * @param {string} props.title - Section title (e.g. "Mood", "Setting")
 * @param {string} [props.titleJp] - Japanese section title (optional)
 * @param {Object[]} props.options - Taxonomy options for this section (FilterOption[] shape: value/label/labelJp)
 * @param {string[]} props.selectedValues - Currently selected option values
 * @param {function} props.onSelect - Called with value when a pill is toggled
 * @param {boolean} [props.collapsible] - Whether to allow collapse (default: false)
 * @param {boolean} [props.defaultCollapsed] - Initial collapsed state (default: false)
 */
export function FilterSection({
  title,
  titleJp,
  options,
  selectedValues,
  onSelect,
  collapsible = false,
  defaultCollapsed = false,
}) {
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed);
  const listId = useId();
  const isHidden = collapsible && collapsed;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="flex items-baseline gap-1.5 text-xs uppercase tracking-wide text-library-text-muted">
          <span>{title}</span>
          {titleJp && <span className="normal-case text-[11px] opacity-70">{titleJp}</span>}
        </h3>

        {collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-controls={listId}
            aria-label={`${collapsed ? 'Show' : 'Hide'} ${title} options`}
            className="text-library-text-muted hover:text-library-text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${collapsed ? '' : 'rotate-180'}`} />
          </button>
        )}
      </div>

      {!isHidden && (
        <div id={listId} className="flex flex-wrap gap-2">
          {options.map((option) => (
            <FilterPill
              key={option.value}
              value={option.value}
              label={option.label}
              labelJp={option.labelJp}
              selected={selectedValues.includes(option.value)}
              onToggle={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
