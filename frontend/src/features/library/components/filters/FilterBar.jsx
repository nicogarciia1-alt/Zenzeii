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
 */
import { useState } from 'react';
import { BookOpen, BarChart2, Languages, Clock, Leaf, Smile } from 'lucide-react';
import { FilterChip } from './FilterChip';
import { MoreFiltersButton } from './MoreFiltersButton';
import {
  FILTER_BAR_CHIPS,
  DIFFICULTY_OPTIONS,
  JLPT_OPTIONS,
  LENGTH_OPTIONS,
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
        <MoreFiltersButton />
      </div>
    </div>
  );
}
