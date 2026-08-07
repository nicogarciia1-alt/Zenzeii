/**
 * @fileoverview Library discovery filter bar.
 *
 * Renders the full horizontal filter strip with 6 primary filter chips
 * and the "More Filters" button. Sticky — stays visible on scroll.
 *
 * Phase 6: controlled by useCatalog/useTaxonomy via LibraryPage when
 * externalFilters/onExternalFilterChange/taxonomy are passed. Falls back
 * to local state and mock taxonomy when they're not — keeps FilterBar
 * usable standalone (Phase 3 behavior unchanged for any other caller).
 *
 * Phase 8: owns the "More Filters" open/close state and renders the
 * desktop popover + mobile bottom sheet, both wrapping the same
 * MoreFiltersPanel content. Layer 2 filter values live in the same
 * externalFilters/onExternalFilterChange pair as the primary chips — no
 * new state management, just five more keys (setting/period/concept/
 * award/adaptation) that happen to be arrays instead of scalars. See
 * useCatalog.js for why theme/mood aren't among them.
 */
import { useRef, useState } from 'react';
import { BookOpen, BarChart2, Languages, Clock, Leaf, Smile } from 'lucide-react';
import { FilterChip } from './FilterChip';
import { MoreFiltersButton } from './MoreFiltersButton';
import { MoreFiltersPanel } from './MoreFiltersPanel';
import { MoreFiltersPopover } from './MoreFiltersPopover';
import { MoreFiltersBottomSheet } from './MoreFiltersBottomSheet';
import {
  FILTER_BAR_CHIPS,
  DIFFICULTY_OPTIONS,
  JLPT_OPTIONS,
  LENGTH_OPTIONS,
  SECONDARY_FILTERS,
} from '../../constants/libraryConstants';
import { MOCK_GENRES, MOCK_THEMES, MOCK_MOODS } from '../../data/mockTaxonomy';

/** lucide-react icon lookup — FILTER_BAR_CHIPS stores icon names as plain strings. */
const ICON_MAP = { BookOpen, BarChart2, Languages, Clock, Leaf, Smile };

/** Maps a taxonomy entity (Genre/Theme/Mood shape) to a FilterOption. */
const toFilterOption = (entity) => ({ value: entity.id, label: entity.name, labelJp: entity.name_jp });

/** Local filter default when no externalFilters is provided (Phase 3 standalone mode). */
const LOCAL_DEFAULT_FILTERS = {
  genre: null,
  difficulty: null,
  jlpt: null,
  length: null,
  theme: null,
  mood: null,
};

/** The five Layer 2 filters that live only behind "More Filters" — see useCatalog.js's ARRAY_FILTER_IDS. */
const LAYER2_FILTER_IDS = SECONDARY_FILTERS;

/**
 * Resolves a chip's options. genres/themes/moods chips prefer live
 * taxonomy (Phase 6, via the `taxonomy` prop) and fall back to mock data
 * when taxonomy hasn't loaded yet or isn't passed at all — same
 * FilterOption[] shape either way, so the chips never know which source
 * they're reading from.
 */
function resolveOptions(chip, taxonomy) {
  switch (chip.optionsSource) {
    case 'genres':
      return (taxonomy?.genres?.length ? taxonomy.genres : MOCK_GENRES).map(toFilterOption);
    case 'themes':
      return (taxonomy?.themes?.length ? taxonomy.themes : MOCK_THEMES).map(toFilterOption);
    case 'moods':
      return (taxonomy?.moods?.length ? taxonomy.moods : MOCK_MOODS).map(toFilterOption);
    case 'static':
    default:
      if (chip.id === 'difficulty') return DIFFICULTY_OPTIONS;
      if (chip.id === 'jlpt') return JLPT_OPTIONS;
      if (chip.id === 'length') return LENGTH_OPTIONS;
      return [];
  }
}

/**
 * @param {Object} [props]
 * @param {Object} [props.externalFilters] - Filter state from useCatalog (Phase 6).
 *   When provided together with onExternalFilterChange, FilterBar is fully
 *   controlled by the parent and its own local filter state goes unused.
 * @param {function} [props.onExternalFilterChange] - Called with (filterId, value)
 *   on selection, propagating to useCatalog. Without it, FilterBar manages
 *   filter state locally (Phase 3 fallback).
 * @param {Object} [props.taxonomy] - Live taxonomy data from useTaxonomy (Phase 6):
 *   { genres, themes, moods, ... }. Falls back to mock taxonomy when omitted
 *   or still loading.
 */
export function FilterBar({ externalFilters, onExternalFilterChange, taxonomy }) {
  const [localFilters, setLocalFilters] = useState(LOCAL_DEFAULT_FILTERS);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const moreFiltersTriggerRef = useRef(null);

  const isControlled = externalFilters != null && onExternalFilterChange != null;
  const filters = isControlled ? externalFilters : localFilters;

  const handleFilterChange = (filterId, value) => {
    if (isControlled) {
      onExternalFilterChange(filterId, value);
    } else {
      console.log('[FilterBar] Filter changed:', { filterId, value }); // Phase 3 fallback — no catalog connected
      setLocalFilters((prev) => ({ ...prev, [filterId]: value }));
    }
  };

  const activeLayer2Count = LAYER2_FILTER_IDS.reduce(
    (count, id) => count + (externalFilters?.[id]?.length ?? 0),
    0
  );

  // Clears each Layer 2 field by toggling off every value currently
  // selected in it — reuses onExternalFilterChange's existing
  // single-value toggle contract (see useCatalog.js's setFilter) rather
  // than needing a separate "reset to []" callback.
  const handleClearLayer2 = () => {
    if (!isControlled) return;
    LAYER2_FILTER_IDS.forEach((id) => {
      (externalFilters[id] ?? []).forEach((value) => onExternalFilterChange(id, value));
    });
  };

  const handleCloseMoreFilters = () => {
    setMoreFiltersOpen(false);
    moreFiltersTriggerRef.current?.querySelector('button')?.focus();
  };

  return (
    <div className="sticky top-0 z-30 w-full h-14 bg-white border-b border-library-border">
      <div
        role="toolbar"
        aria-label="Book discovery filters"
        className="h-full flex items-stretch divide-x divide-library-border overflow-x-auto"
      >
        {FILTER_BAR_CHIPS.map((chip) => {
          const Icon = ICON_MAP[chip.icon];
          return (
            <FilterChip
              key={chip.id}
              filterId={chip.id}
              label={chip.label}
              icon={<Icon className="w-4 h-4" />}
              options={resolveOptions(chip, taxonomy)}
              value={filters[chip.id]}
              onChange={(value) => handleFilterChange(chip.id, value)}
            />
          );
        })}
        {/* display:contents — invisible to the toolbar's flex layout, just gives Phase 8 a DOM ref for
            focus-return and outside-click exclusion without touching MoreFiltersButton itself. */}
        <div ref={moreFiltersTriggerRef} className="contents">
          <MoreFiltersButton onOpen={() => setMoreFiltersOpen(true)} activeCount={activeLayer2Count} />
        </div>
      </div>

      <div className="hidden lg:block">
        <MoreFiltersPopover isOpen={moreFiltersOpen} onClose={handleCloseMoreFilters} triggerRef={moreFiltersTriggerRef}>
          <MoreFiltersPanel
            taxonomy={taxonomy}
            activeFilters={filters}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearLayer2}
            onApply={handleCloseMoreFilters}
            resultCount={null}
            liveUpdate={true}
          />
        </MoreFiltersPopover>
      </div>

      <div className="lg:hidden">
        <MoreFiltersBottomSheet isOpen={moreFiltersOpen} onClose={handleCloseMoreFilters}>
          <MoreFiltersPanel
            taxonomy={taxonomy}
            activeFilters={filters}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearLayer2}
            onApply={handleCloseMoreFilters}
            resultCount={null}
            liveUpdate={false}
          />
        </MoreFiltersBottomSheet>
      </div>
    </div>
  );
}
