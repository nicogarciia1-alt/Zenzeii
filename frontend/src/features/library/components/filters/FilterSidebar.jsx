/**
 * @fileoverview Library discovery filter sidebar.
 *
 * Fixed 260px vertical sidebar replacing the horizontal FilterBar strip.
 * Renders every filter row in its collapsed (closed accordion) state only
 * — no expand/collapse logic, no options rendering, no backend wiring for
 * the 5 secondary rows. See the COO redesign brief (Library Filter Sidebar
 * Redesign, Aug 2026) for the full visual spec this implements pixel-for-
 * pixel against the designer's mockup.
 *
 * Mood (気分) is deliberately absent — removed per COO/Nico instruction,
 * it is not a Zenzeii filter. Do not re-add it here or anywhere else.
 *
 * Primary rows (Genre, Difficulty, JLPT Level, Length, Theme) reuse the
 * same filters/onFilterChange contract FilterBar already used from
 * useCatalog, so wiring the real accordion + options in a later pass is
 * additive, not a rewire. Secondary rows (Format, Publication Year,
 * Ratings, Availability, Language) are visual shells only — clicking them
 * does nothing yet, per the brief.
 *
 * Both "Clear all" (top row) and "Reset filters" (status card) are wired
 * to the same onResetFilters callback (useCatalog.clearAllFilters) — one
 * function, two entry points to it, matching the brief's visual spec.
 */
import { BookOpen, BarChart2, Clock, Leaf, AlignLeft, Calendar, Star, RefreshCw, MessageSquare, ChevronDown } from 'lucide-react';

/** Primary filter rows — collapsed-only for this pass. `key` matches the useCatalog filter id these will drive once accordion logic lands. */
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

/** One collapsed filter row — shared shape for both primary and secondary sections. */
function FilterRow({ icon: Icon, glyph, jp, en }) {
  return (
    <div className="h-11 flex items-center w-full border-b border-library-border hover:bg-library-bg-shelf transition-colors duration-150 cursor-pointer">
      {Icon ? (
        <Icon className="w-4 h-4 text-library-text-secondary shrink-0" />
      ) : (
        <span className="w-4 h-4 shrink-0 flex items-center justify-center font-garamond text-[11px] text-library-text-secondary">
          {glyph}
        </span>
      )}
      <div className="ml-3 flex flex-col leading-tight">
        <span className="font-garamond text-sm text-library-text-primary">{jp}</span>
        <span className="text-[10px] text-library-text-secondary">{en}</span>
      </div>
      <ChevronDown className="w-3 h-3 text-library-text-secondary ml-auto shrink-0" />
    </div>
  );
}

/**
 * @param {Object} props
 * @param {number} [props.totalBooks] - Live filtered book count for the status card. Defaults to 0 when not yet loaded.
 * @param {function} [props.onResetFilters] - Wired to useCatalog.clearAllFilters. Drives both the top "Clear all" row and the status card's "Reset filters" link.
 */
export function FilterSidebar({ totalBooks = 0, onResetFilters }) {
  return (
    <aside
      aria-label="Library filters"
      className="w-[260px] shrink-0 sticky top-0 h-screen overflow-y-auto bg-library-bg-primary border-r border-library-border px-6 pt-7 flex flex-col"
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
        {PRIMARY_ROWS.map((row) => (
          <FilterRow key={row.key} icon={row.icon} glyph={row.glyph} jp={row.jp} en={row.en} />
        ))}
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
