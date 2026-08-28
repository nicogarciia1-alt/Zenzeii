/**
 * @fileoverview Library discovery filter sidebar.
 *
 * Fixed 260px vertical sidebar replacing the horizontal FilterBar strip.
 * See the COO redesign brief (Library Filter Sidebar Redesign, Aug 2026)
 * for the full visual spec this implements pixel-for-pixel against the
 * designer's mockup — this file only adds interaction on top of it, it
 * does not touch colors, spacing, typography, or layout of the collapsed
 * appearance.
 *
 * Mood (気分) is deliberately absent — removed per COO/Nico instruction,
 * it is not a Zenzeii filter. Do not re-add it here or anywhere else.
 *
 * Primary rows (Genre, Difficulty, JLPT Level, Length, Theme) reuse the
 * same filters/onFilterChange contract FilterBar already used from
 * useCatalog — one row open at a time (accordion), options rendered
 * inline below the row rather than via FilterDropdown: FilterDropdown's
 * position:fixed exists solely to escape FilterBar's horizontal
 * overflow-x-auto clipping, a problem this vertical, normally-scrolling
 * sidebar doesn't have. Secondary rows (Format, Publication Year,
 * Ratings, Availability, Language) stay visual shells only — clicking
 * them does nothing yet, per COO instruction (fast-follow commit).
 *
 * Both "Clear all" (top row) and "Reset filters" (status card) are wired
 * to the same onResetFilters callback (useCatalog.clearAllFilters) — one
 * function, two entry points to it, matching the brief's visual spec.
 */
import { useMemo, useState } from 'react';
import { BookOpen, BarChart2, Clock, Leaf, AlignLeft, Calendar, Star, RefreshCw, MessageSquare, ChevronDown, Check } from 'lucide-react';
import { DIFFICULTY_OPTIONS, JLPT_OPTIONS, LENGTH_OPTIONS } from '../../constants/libraryConstants';
import { MOCK_GENRES, MOCK_THEMES } from '../../data/mockTaxonomy';

/** Primary filter rows — the only ones with real options/backend support behind them. `key` matches the useCatalog filter id. */
const PRIMARY_ROWS = [
  { key: 'genre', icon: BookOpen, jp: 'ジャンル', en: 'Genre' },
  { key: 'difficulty', icon: BarChart2, jp: '難易度', en: 'Difficulty' },
  { key: 'jlpt', jp: 'JLPTレベル', en: 'JLPT Level', glyph: '末' },
  { key: 'length', icon: Clock, jp: '長さ', en: 'Length' },
  { key: 'theme', icon: Leaf, jp: 'テーマ', en: 'Theme' },
];

/** Secondary filter rows — visual shell only, no backend support wired. See connectivity report in the brief response. */
const SECONDARY_ROWS = [
  { key: 'format', icon: AlignLeft, jp: '形式', en: 'Format' },
  { key: 'publication_year', icon: Calendar, jp: '出版年', en: 'Publication Year' },
  { key: 'ratings', icon: Star, jp: '評価', en: 'Ratings' },
  { key: 'availability', icon: RefreshCw, jp: '入手可能状況', en: 'Availability' },
  { key: 'language', icon: MessageSquare, jp: '言語', en: 'Language' },
];

/** Maps a taxonomy entity (Genre/Theme shape) to a FilterOption — same mapping FilterBar uses. */
const toFilterOption = (entity) => ({ value: entity.id, label: entity.name });

/** Always-first "clear this filter" option, matching FilterDropdown's ALL_OPTION. */
const ALL_OPTION = { value: null, label: 'All' };

/**
 * One filter row, collapsed or expanded. Collapsed appearance is
 * pixel-identical to before when no value is selected; a selected value
 * tints the icon/subtitle red and the row background, reusing the exact
 * isActive treatment FilterChip already uses elsewhere in this feature —
 * no new colors introduced.
 */
function FilterRow({ icon: Icon, glyph, jp, en, isActive, isExpanded, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={onToggle ? isExpanded : undefined}
      className={`h-11 flex items-center w-full text-left border-b border-library-border hover:bg-library-bg-shelf transition-colors duration-150 cursor-pointer ${
        isActive || isExpanded ? 'bg-library-filter-active' : ''
      }`}
    >
      {Icon ? (
        <Icon className={`w-4 h-4 shrink-0 transition-colors duration-150 ${isActive ? 'text-library-red' : 'text-library-text-secondary'}`} />
      ) : (
        <span
          className={`w-4 h-4 shrink-0 flex items-center justify-center font-garamond text-[11px] transition-colors duration-150 ${
            isActive ? 'text-library-red' : 'text-library-text-secondary'
          }`}
        >
          {glyph}
        </span>
      )}
      <div className="ml-3 flex flex-col leading-tight">
        <span className="font-garamond text-sm text-library-text-primary">{jp}</span>
        <span className={`text-[10px] transition-colors duration-150 ${isActive ? 'text-library-red' : 'text-library-text-secondary'}`}>{en}</span>
      </div>
      <ChevronDown
        className={`w-3 h-3 text-library-text-secondary ml-auto shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
      />
    </button>
  );
}

/**
 * Inline options list for one expanded primary row. Indented to pl-7
 * (icon width + its ml-3 gap) so options line up under the row's label,
 * not its icon.
 */
function FilterOptionsList({ options, selectedValue, onSelect }) {
  const combined = [ALL_OPTION, ...options];
  return (
    <div role="listbox" className="border-b border-library-border py-1">
      {combined.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <div
            key={option.value ?? '__all__'}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(option.value)}
            className={`flex items-center justify-between gap-2 pl-7 pr-3 py-2 font-garamond text-sm cursor-pointer hover:bg-library-bg-shelf ${
              isSelected ? 'text-library-red' : 'text-library-text-primary'
            }`}
          >
            <span>{option.label}</span>
            {isSelected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {number} [props.totalBooks] - Live filtered book count for the status card. Defaults to 0 when not yet loaded.
 * @param {function} [props.onResetFilters] - Wired to useCatalog.clearAllFilters. Drives both the top "Clear all" row and the status card's "Reset filters" link.
 * @param {Object} [props.filters] - Current filter state from useCatalog (only the 5 primary keys are read).
 * @param {function} [props.onFilterChange] - Wired to useCatalog.setFilter, called with (filterId, value) on option select.
 * @param {Object} [props.taxonomy] - Live taxonomy data from useTaxonomy: { genres, themes, loading, ... }. Falls back to mock taxonomy when omitted or still loading, same as FilterBar.
 */
export function FilterSidebar({ totalBooks = 0, onResetFilters, filters, onFilterChange, taxonomy }) {
  const [expandedRow, setExpandedRow] = useState(null);
  const isWired = filters != null && onFilterChange != null;

  const genreOptions = useMemo(
    () => (taxonomy?.genres?.length ? taxonomy.genres : MOCK_GENRES).map(toFilterOption),
    [taxonomy?.genres]
  );
  const themeOptions = useMemo(
    () => (taxonomy?.themes?.length ? taxonomy.themes : MOCK_THEMES).map(toFilterOption),
    [taxonomy?.themes]
  );
  const optionsByRow = {
    genre: genreOptions,
    difficulty: DIFFICULTY_OPTIONS,
    jlpt: JLPT_OPTIONS,
    length: LENGTH_OPTIONS,
    theme: themeOptions,
  };

  const handleToggle = (rowKey) => {
    if (!isWired) return;
    setExpandedRow((current) => (current === rowKey ? null : rowKey));
  };

  const handleSelect = (rowKey, value) => {
    onFilterChange(rowKey, value);
    setExpandedRow(null);
  };
  return (
    <aside
      aria-label="Library filters"
      className="w-[320px] shrink-0 sticky top-0 h-screen overflow-y-auto bg-library-bg-primary border-r border-library-border px-6 pt-7 flex flex-col"
    >
      {/* Header block */}
      <div>
        <h2 className="font-playfair text-[22px] font-semibold text-library-text-primary">絞り込み</h2>
        <p className="mt-0.5 text-[10px] font-medium tracking-[0.14em] uppercase text-library-text-secondary">
          Filters
        </p>
      </div>
      <div className="my-4 border-t border-library-border" />

      {/* Clear all row */}
      <div className="flex items-center justify-between pb-4 border-b border-library-border">
        <span className="font-garamond text-[13px] text-library-text-secondary">すべてクリア</span>
        <button
          type="button"
          onClick={onResetFilters}
          className="font-garamond text-[13px] text-library-red hover:underline"
        >
          Clear all
        </button>
      </div>

      {/* Primary filter rows */}
      <div>
        {PRIMARY_ROWS.map((row) => {
          const value = filters?.[row.key] ?? null;
          const isExpanded = expandedRow === row.key;
          return (
            <div key={row.key}>
              <FilterRow
                icon={row.icon}
                glyph={row.glyph}
                jp={row.jp}
                en={row.en}
                isActive={value != null}
                isExpanded={isExpanded}
                onToggle={isWired ? () => handleToggle(row.key) : undefined}
              />
              {isExpanded && (
                <FilterOptionsList
                  options={optionsByRow[row.key] ?? []}
                  selectedValue={value}
                  onSelect={(newValue) => handleSelect(row.key, newValue)}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* More filters divider */}
      <div className="my-3 flex items-baseline">
        <span className="text-[11px] text-library-text-secondary">その他の条件</span>
        <span className="ml-1 text-[11px] text-library-red">More filters</span>
      </div>

      {/* Secondary filter rows — visual shell only, not backend-wired */}
      <div>
        {SECONDARY_ROWS.map((row) => (
          <FilterRow key={row.key} icon={row.icon} jp={row.jp} en={row.en} />
        ))}
      </div>

      {/* Bottom status card */}
      <div className="mt-6 mb-7 relative overflow-hidden bg-library-bg-card border border-library-border rounded-library-sm p-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-library-red shrink-0" />
          <span className="font-garamond text-[13px] text-library-text-primary">
            {totalBooks}冊 見つかりました
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-library-text-secondary">
          {totalBooks} book{totalBooks === 1 ? '' : 's'} found
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-2 block font-garamond text-[13px] text-library-red underline"
        >
          条件をリセット / Reset filters
        </button>

        {/* TODO: swap with Sato's final asset — placeholder bamboo watermark sketch */}
        <svg
          aria-hidden="true"
          viewBox="0 0 60 60"
          className="absolute bottom-0 right-0 w-[60px] h-[60px] opacity-10 pointer-events-none"
        >
          <path
            d="M10 60 V20 M10 20 C10 16 14 16 14 20 M10 30 C10 26 6 26 6 30 M10 40 C10 36 14 36 14 40"
            stroke="#1A1814"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M28 60 V8 M28 18 C28 14 33 14 33 18 M28 30 C28 26 23 26 23 30 M28 42 C28 38 33 38 33 42"
            stroke="#1A1814"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M46 60 V26 M46 36 C46 32 50 32 50 36 M46 46 C46 42 42 42 42 46"
            stroke="#1A1814"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        {/* TODO: Sato to confirm final stamp asset — placeholder seal */}
        <div
          aria-hidden="true"
          className="absolute bottom-2 right-2 w-6 h-6 bg-library-red flex items-center justify-center"
        >
          <span className="font-garamond text-[10px] text-white">禅</span>
        </div>
      </div>
    </aside>
  );
}
