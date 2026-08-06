/**
 * @fileoverview Library discovery filter bar.
 *
 * Renders the full horizontal filter strip with 6 primary filter chips
 * and the "More Filters" button. Sticky — stays visible on scroll.
 *
 * Phase 3: filter state is local only. All changes logged to console.
 * Phase 6: filter state lifted to useCatalog hook, onChange propagates
 *           to the catalog API query.
 *
 * No props in Phase 3 — self-contained with local state.
 * Phase 6: receives filters, onFilterChange from parent (LibraryPage).
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

/**
 * Resolves a chip's options for Phase 3 (mock data). Phase 6 replaces
 * this with values sourced from useTaxonomy() — same FilterOption[]
 * shape either way, so only the source changes here, not the chips.
 */
function resolveOptions(chip) {
  switch (chip.optionsSource) {
    case 'genres':
      return MOCK_GENRES.map(toFilterOption);
    case 'themes':
      return MOCK_THEMES.map(toFilterOption);
    case 'moods':
      return MOCK_MOODS.map(toFilterOption);
    case 'static':
    default:
      if (chip.id === 'difficulty') return DIFFICULTY_OPTIONS;
      if (chip.id === 'jlpt') return JLPT_OPTIONS;
      if (chip.id === 'length') return LENGTH_OPTIONS;
      return [];
  }
}

export function FilterBar() {
  const [filters, setFilters] = useState({
    genre: null,
    difficulty: null,
    jlpt: null,
    length: null,
    theme: null,
    mood: null,
  });

  const handleFilterChange = (filterId, value) => {
    console.log('[FilterBar] Filter changed:', { filterId, value });
    // Phase 6: this is where onFilterChange(filterId, value) will be called
    // to propagate the change up to useCatalog.
    setFilters((prev) => ({ ...prev, [filterId]: value }));
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
              options={resolveOptions(chip)}
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
