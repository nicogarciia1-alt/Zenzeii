/**
 * @fileoverview Search bar for the Library hero section.
 *
 * Controlled input connected to useSearch via value/onChange/onClear
 * props (passed down LibraryPage → LibraryHero → HeroContent → here).
 * Shows a subtle loading indicator during the debounce window and a
 * clear (×) button once there's a query to clear.
 *
 * Distinct from the existing app navigation search bar elsewhere in the
 * app — that component is untouched by this one.
 */
import { Search, X, Loader2 } from 'lucide-react';

/**
 * @param {Object} props
 * @param {string} props.value - Current search query (controlled)
 * @param {function} props.onChange - Called with new input value on every keystroke
 * @param {function} props.onClear - Called when the clear button (or Escape) fires
 * @param {boolean} [props.isSearching] - Whether debounce is pending (shows loading indicator)
 * @param {string} [props.placeholder] - Input placeholder text
 */
export function SearchBar({ value, onChange, onClear, isSearching = false, placeholder = 'Search books, authors, themes...' }) {
  const handleKeyDown = (e) => {
    // Enter: the debounced search fires shortly after typing stops anyway
    // (SEARCH_DEBOUNCE_MS). Bypassing the debounce on Enter needs an
    // onSearchImmediate prop this component doesn't have yet — deferred
    // to a future polish pass, not a Phase 7 requirement.
    if (e.key === 'Escape') onClear();
  };

  return (
    <div className="flex items-center gap-2 w-full h-14 px-spacing-3 rounded-library-xl bg-white border border-library-border shadow-sm focus-within:ring-2 focus-within:ring-library-red focus-within:ring-offset-2 focus-within:ring-offset-library-bg-hero-dark transition-shadow">
      <Search className="w-5 h-5 shrink-0 text-library-text-muted" aria-hidden="true" />

      <input
        type="text"
        role="searchbox"
        aria-label="Search the Zenzeii library"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent border-none outline-none text-body text-library-text-primary placeholder:text-library-text-muted"
      />

      {isSearching && (
        <Loader2
          className="w-5 h-5 shrink-0 animate-spin text-library-text-muted"
          role="status"
          aria-live="polite"
          aria-label="Searching..."
        />
      )}

      {!isSearching && value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="shrink-0 text-library-text-muted hover:text-library-text-primary transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
