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
    <div className="relative h-full flex flex-col justify-center px-spacing-3 md:px-spacing-6 lg:px-spacing-8 py-spacing-6">
      {/* Japanese subtitle */}
      <p className="mb-spacing-3 text-library-text-muted text-sm tracking-wide flex items-center gap-2">
        <span aria-hidden="true">🌸</span>
        <span>日本の物語を、あなたの言葉で</span>
      </p>

      {/* Main headline — the page's single h1. Sized via the type scale alone
          (text-h2/h1/display), no separate font-bold/leading-tight/tracking-tight:
          those utilities compile after fontSize in Tailwind's stylesheet and
          would deterministically override the scale's own per-size weight/
          line-height/letter-spacing (confirmed against the compiled CSS) —
          collapsing the whole point of a tuned scale back to one generic
          value at every breakpoint. */}
      <h1 className="mb-spacing-4 font-playfair text-h2 md:text-h1 lg:text-display text-white">
        Discover Japanese
        <br />
        Literature
      </h1>

      {/* Description */}
      <p className="mb-spacing-4 text-white/70 text-sm leading-relaxed max-w-sm">
        From timeless classics to hidden gems.
        <br />
        Find your next story, at the right level for you.
      </p>

      {/* Search */}
      <div className="mb-spacing-4 max-w-sm">
        <SearchBar {...searchProps} />
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-spacing-2">
        <button
          type="button"
          onClick={onExplore}
          className="h-14 px-spacing-6 rounded-library-md bg-library-red hover:bg-library-red-hover text-white text-body font-semibold tracking-wide transition-colors duration-fast flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 focus-visible:ring-offset-library-bg-hero-dark"
        >
          Explore Books
          <span aria-hidden="true">→</span>
        </button>

        <button
          type="button"
          onClick={onSurpriseMe}
          className="h-14 px-spacing-6 rounded-library-md border border-white/60 hover:border-white text-white text-body font-semibold tracking-wide transition-colors duration-fast flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 focus-visible:ring-offset-library-bg-hero-dark"
        >
          <span aria-hidden="true">✦</span>
          Surprise Me
        </button>
      </div>

      {/* Gradient transition into the artwork zone — right-edge fade, desktop two-column
          layout only. Widened (was w-24/96px) for a smoother feather into the softened
          placeholder gradient — a visible seam here is exactly what this brief calls out. */}
      <div
        aria-hidden="true"
        className="hidden lg:block absolute inset-y-0 right-0 w-spacing-16 bg-gradient-to-r from-library-bg-hero-dark to-transparent pointer-events-none"
      />
    </div>
  );
}
