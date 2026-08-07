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
import { useMemo, useRef, useState } from 'react';
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

/** Chip optionsSource values backed by useTaxonomy — the only chips that have anything to wait on. */
const TAXONOMY_DEPENDENT_SOURCES = new Set(['genres', 'themes', 'moods']);

/** Placeholder shown in place of a taxonomy-backed FilterChip while useTaxonomy is still loading. Same footprint as a real chip so nothing reflows when it's replaced. */
function FilterChipSkeleton() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-0.5 px-3 min-w-[80px] animate-pulse" aria-hidden="true">
      <div className="w-4 h-4 rounded-full bg-library-bg-shelf" />
      <div className="hidden lg:block h-2.5 w-10 rounded bg-library-bg-shelf" />
      <div className="h-2.5 w-8 rounded bg-library-bg-shelf" />
    </div>
  );
}

/**
 * Resolves a chip's options from a pre-mapped { genres, themes, moods }
 * bundle (see useMemo calls in FilterBar below) for the three taxonomy-
 * backed chips, or the static *_OPTIONS constants for the rest — those
 * are already stable module-level references, no mapping work to redo
 * per render.
 */
function resolveOptions(chip, mappedTaxonomy) {
  switch (chip.optionsSource) {
    case 'genres':
      return mappedTaxonomy.genres;
    case 'themes':
      return mappedTaxonomy.themes;
    case 'moods':
      return mappedTaxonomy.moods;
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

  // Recomputed only when the underlying taxonomy arrays actually change —
  // useTaxonomy returns a memoized object, so these deps stay referentially
  // stable across unrelated LibraryPage re-renders (every search keystroke,
  // every filter change) instead of re-mapping on every FilterBar render.
  const genreOptions = useMemo(
    () => (taxonomy?.genres?.length ? taxonomy.genres : MOCK_GENRES).map(toFilterOption),
    [taxonomy?.genres]
  );
  const themeOptions = useMemo(
    () => (taxonomy?.themes?.length ? taxonomy.themes : MOCK_THEMES).map(toFilterOption),
    [taxonomy?.themes]
  );
  const moodOptions = useMemo(
    () => (taxonomy?.moods?.length ? taxonomy.moods : MOCK_MOODS).map(toFilterOption),
    [taxonomy?.moods]
  );
  const mappedTaxonomy = { genres: genreOptions, themes: themeOptions, moods: moodOptions };

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
    <nav aria-label="Library filters" className="sticky top-0 z-30 w-full h-14 bg-white border-b border-library-border">
      <div
        role="toolbar"
        aria-label="Book discovery filters"
        className="h-full flex items-stretch divide-x divide-library-border overflow-x-auto"
      >
        {FILTER_BAR_CHIPS.map((chip) => {
          const Icon = ICON_MAP[chip.icon];
          const isTaxonomyDependent = TAXONOMY_DEPENDENT_SOURCES.has(chip.optionsSource);

          if (taxonomy?.loading && isTaxonomyDependent) {
            return <FilterChipSkeleton key={chip.id} />;
          }

          return (
            <FilterChip
              // The static chips (difficulty/jlpt/length) use a stable key —
              // they never showed a skeleton, so they should never remount.
              // Only the taxonomy-backed chips get a loading-state-suffixed
              // key, forcing exactly one fresh mount (skeleton -> real) so
              // the chip fades in via its own entrance animation, rather
              // than a DOM node silently morphing from gray bars to content.
              key={isTaxonomyDependent ? `${chip.id}-ready` : chip.id}
              filterId={chip.id}
              label={chip.label}
              icon={<Icon className="w-4 h-4" />}
              options={resolveOptions(chip, mappedTaxonomy)}
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
    </nav>
  );
}
