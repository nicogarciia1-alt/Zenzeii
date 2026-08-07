/**
 * @fileoverview HeroContent — title, subtitle, description, search bar,
 * and CTA buttons in LibraryHero's left zone. Purely presentational
 * apart from mounting SearchBar, which owns its own controlled-input
 * rendering — HeroContent just forwards searchProps to it.
 *
 * Phase 7: searchProps wires SearchBar to useSearch via LibraryPage →
 * LibraryHero → here. Without it, SearchBar renders inert (typing does
 * nothing) rather than crashing — same graceful-fallback pattern as
 * onExplore/onSurpriseMe below.
 *
 * LibraryPage never actually passes onExplore/onSurpriseMe — these
 * defaults are what real users hit. "Explore Books" scrolls to the same
 * #library-catalog-section useSearch already targets after a debounced
 * search; "Surprise Me" needs a real destination to land on (a random
 * book's detail view), which doesn't exist until Phase 9 (deferred), so
 * it stays inert rather than navigating somewhere half-built.
 */
import { SearchBar } from './SearchBar';
import { CATALOG_SECTION_ID } from '../../constants/libraryConstants';

const DEFAULT_EXPLORE = () =>
  document.getElementById(CATALOG_SECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
// TODO: needs a real destination (random book detail view) — Phase 9, deferred.
const DEFAULT_SURPRISE_ME = () => {};
const DEFAULT_SEARCH_PROPS = { value: '', onChange: () => {}, onClear: () => {}, isSearching: false };

/**
 * @param {Object} props
 * @param {function} [props.onExplore] - Called when "Explore Books" is clicked
 * @param {function} [props.onSurpriseMe] - Called when "Surprise Me" is clicked
 * @param {Object} [props.searchProps] - Props forwarded to SearchBar (Phase 7):
 *   { value, onChange, onClear, isSearching }. Falls back to an inert stub
 *   when omitted.
 */
export default function HeroContent({
  onExplore = DEFAULT_EXPLORE,
  onSurpriseMe = DEFAULT_SURPRISE_ME,
  searchProps = DEFAULT_SEARCH_PROPS,
}) {
  return (
    <div className="relative h-full flex flex-col justify-center gap-6 px-6 md:px-12 lg:px-16 py-12">
      {/* Japanese subtitle */}
      <p className="text-library-text-muted text-sm tracking-wide flex items-center gap-2">
        <span aria-hidden="true">🌸</span>
        <span>日本の物語を、あなたの言葉で</span>
      </p>

      {/* Main headline — the page's single h1 */}
      <h1 className="font-playfair text-[28px] md:text-4xl lg:text-5xl font-bold text-white leading-tight">
        Discover Japanese
        <br />
        Literature
      </h1>

      {/* Description */}
      <p className="text-white/70 text-sm leading-relaxed max-w-sm">
        From timeless classics to hidden gems.
        <br />
        Find your next story, at the right level for you.
      </p>

      {/* Search */}
      <div className="max-w-sm">
        <SearchBar {...searchProps} />
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onExplore}
          className="bg-library-red hover:bg-library-red-hover text-white px-6 py-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 focus-visible:ring-offset-library-bg-hero-dark"
        >
          Explore Books
          <span aria-hidden="true">→</span>
        </button>

        <button
          type="button"
          onClick={onSurpriseMe}
          className="border border-white/60 hover:border-white text-white px-6 py-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 focus-visible:ring-offset-library-bg-hero-dark"
        >
          <span aria-hidden="true">✦</span>
          Surprise Me
        </button>
      </div>

      {/* Gradient transition into the artwork zone — right-edge fade, desktop two-column layout only */}
      <div
        aria-hidden="true"
        className="hidden lg:block absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-library-bg-hero-dark to-transparent pointer-events-none"
      />
    </div>
  );
}
