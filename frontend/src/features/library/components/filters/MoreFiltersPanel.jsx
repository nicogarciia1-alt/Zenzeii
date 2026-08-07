/**
 * @fileoverview Advanced filter panel content for the Zenzeii Library.
 *
 * Renders the five Layer 2 discovery filters that live only behind
 * "More Filters" — setting, historical period, cultural concept, award,
 * adaptation. Theme and mood are Layer 2 taxonomy too, but they already
 * have a single-select home in the primary FilterBar chips (see
 * useCatalog.js), so they're deliberately not duplicated here.
 *
 * Purely presentational — receives current filter state and callbacks
 * via props. Rendered inside MoreFiltersPopover (desktop) or
 * MoreFiltersBottomSheet (mobile); has no knowledge of which.
 *
 * Desktop (liveUpdate=true): every pill tap calls onFilterChange
 * immediately — the catalog updates live, same as the primary chips.
 * Mobile (liveUpdate=false): taps are held in local `pending` state so
 * the catalog doesn't refetch on every tap while the sheet is open;
 * onFilterChange only fires (once per changed value) when the user taps
 * "Show results".
 */
import { useState } from 'react';
import { FilterSection } from './FilterSection';
import { MoreFiltersPanelFooter } from './MoreFiltersPanelFooter';

const EMPTY_LAYER2_FILTERS = { setting: [], period: [], concept: [], award: [], adaptation: [] };

/** Maps a taxonomy entity (Setting/Period/Concept/Award/Adaptation shape) to a FilterOption. */
const toFilterOption = (entity) => ({ value: entity.id, label: entity.name, labelJp: entity.name_jp });

/**
 * Section config, in display order. `taxonomyKey` is the useTaxonomy()
 * field (plural); `filterId` is the useCatalog filter key (singular) —
 * the two differ by design, not typo (see useTaxonomy.js's field
 * renames from the raw API response).
 */
const SECTIONS = [
  { filterId: 'setting', taxonomyKey: 'settings', title: 'Setting', collapsible: true, defaultCollapsed: true },
  { filterId: 'period', taxonomyKey: 'periods', title: 'Historical Period', collapsible: false, defaultCollapsed: false },
  { filterId: 'concept', taxonomyKey: 'concepts', title: 'Cultural Concepts', collapsible: true, defaultCollapsed: true },
  { filterId: 'adaptation', taxonomyKey: 'adaptations', title: 'Adaptations', collapsible: false, defaultCollapsed: false },
  { filterId: 'award', taxonomyKey: 'awards', title: 'Awards', collapsible: false, defaultCollapsed: false },
];

/**
 * @param {Object} props
 * @param {Object} props.taxonomy - Full taxonomy data from useTaxonomy
 * @param {Object} props.activeFilters - Current filter state from useCatalog (only the 5 Layer 2 keys are read)
 * @param {function} props.onFilterChange - Called with (filterId, value) on selection
 * @param {function} props.onClearAll - Called when "Clear all" is clicked
 * @param {function} props.onApply - Called when the footer's primary button is clicked
 * @param {number|null} props.resultCount - Current result count, or null if not known yet (shown in "Show X results")
 * @param {boolean} [props.liveUpdate] - true: applies immediately (desktop). false: applies on button click (mobile).
 */
export function MoreFiltersPanel({
  taxonomy,
  activeFilters,
  onFilterChange,
  onClearAll,
  onApply,
  resultCount,
  liveUpdate = true,
}) {
  const [pending, setPending] = useState(() => ({
    setting: activeFilters.setting ?? [],
    period: activeFilters.period ?? [],
    concept: activeFilters.concept ?? [],
    adaptation: activeFilters.adaptation ?? [],
    award: activeFilters.award ?? [],
  }));

  // Single source of truth for what's rendered as "selected" — the live
  // external state on desktop, the undrafted local copy on mobile. Keeps
  // the pills and the footer's active count from ever disagreeing.
  const displayFilters = liveUpdate ? activeFilters : pending;

  const handleSelect = (filterId) => (value) => {
    if (liveUpdate) {
      onFilterChange(filterId, value);
      return;
    }
    setPending((prev) => {
      const current = prev[filterId];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [filterId]: next };
    });
  };

  const handleClearAll = () => {
    if (liveUpdate) {
      onClearAll();
    } else {
      setPending(EMPTY_LAYER2_FILTERS);
    }
  };

  const handleApply = () => {
    if (!liveUpdate) {
      SECTIONS.forEach(({ filterId }) => {
        const before = new Set(activeFilters[filterId] ?? []);
        const after = new Set(pending[filterId]);
        for (const value of new Set([...before, ...after])) {
          if (before.has(value) !== after.has(value)) onFilterChange(filterId, value);
        }
      });
    }
    onApply();
  };

  const activeCount = SECTIONS.reduce((count, { filterId }) => count + displayFilters[filterId].length, 0);

  return (
    <div>
      <div className="flex flex-col gap-6 px-6 py-5">
        {SECTIONS.map(({ filterId, taxonomyKey, title, collapsible, defaultCollapsed }) => (
          <FilterSection
            key={filterId}
            title={title}
            options={(taxonomy?.[taxonomyKey] ?? []).map(toFilterOption)}
            selectedValues={displayFilters[filterId]}
            onSelect={handleSelect(filterId)}
            collapsible={collapsible}
            defaultCollapsed={defaultCollapsed}
          />
        ))}
      </div>

      <MoreFiltersPanelFooter
        activeCount={activeCount}
        resultCount={resultCount}
        liveUpdate={liveUpdate}
        onClearAll={handleClearAll}
        onApply={handleApply}
      />
    </div>
  );
}
