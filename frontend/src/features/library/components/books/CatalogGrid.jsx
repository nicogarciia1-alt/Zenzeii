/**
 * @fileoverview Browsable catalog grid for the Zenzeii Library.
 *
 * Renders a responsive grid of BookCards (grid variant) with loading,
 * empty, and error states, plus pagination. Receives all data from the
 * useCatalog hook via LibraryPage props — holds no state of its own.
 *
 * Phase 6: connected to live /api/catalog data.
 * Phase 7: search results update this grid in real time.
 */
import { BookCard } from './BookCard';

const SKELETON_COUNT = 12;
const GRID_CLASSES = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6';

/**
 * Mirrors BookCard's 'grid' variant row-for-row (BookCard.jsx
 * VARIANT_CONFIG.grid + its detailsContent): cover, 2-line title, JP
 * title, author, a badges row, a rating row, and the Add to Library
 * button — same gap-2 rhythm between each. A skeleton that only showed
 * the cover and a couple of text lines (the previous version) was
 * noticeably shorter than a real card, causing a visible jump when the
 * grid swapped from skeletons to real content.
 */
function BookCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 w-[160px] animate-pulse" aria-hidden="true">
      <div className="w-[120px] h-[180px] rounded bg-library-bg-shelf" />
      <div className="flex flex-col gap-1">
        <div className="h-3.5 w-full rounded bg-library-bg-shelf" />
        <div className="h-3.5 w-4/5 rounded bg-library-bg-shelf" />
        <div className="h-3 w-2/3 rounded bg-library-bg-shelf" />
        <div className="h-3 w-1/2 rounded bg-library-bg-shelf" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-5 w-9 rounded-full bg-library-bg-shelf" />
        <div className="h-5 w-14 rounded-full bg-library-bg-shelf" />
      </div>
      <div className="h-3.5 w-16 rounded bg-library-bg-shelf" />
      <div className="h-6 w-full rounded bg-library-bg-shelf" />
    </div>
  );
}

/**
 * Builds the page-number sequence for Pagination, collapsing runs of
 * skipped pages into a single 'ellipsis-N' marker (N keeps each marker's
 * React key unique when there are two gaps, e.g. page 1 ... 5 6 7 ... 20).
 * @param {number} current
 * @param {number} total
 * @returns {(number|string)[]}
 */
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const keep = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result = [];
  let prev = null;
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) result.push(`ellipsis-${p}`);
    result.push(p);
    prev = p;
  }
  return result;
}

function Pagination({ page, pages, onPageChange }) {
  if (pages <= 1) return null;

  return (
    <nav aria-label="Catalog pagination" className="flex items-center justify-center gap-1.5 mt-10">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={`px-3 py-1.5 text-sm rounded border border-library-border text-library-text-secondary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 ${
          page <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-library-bg-shelf'
        }`}
      >
        Previous
      </button>

      {getPageNumbers(page, pages).map((entry) =>
        typeof entry === 'number' ? (
          <button
            key={entry}
            type="button"
            onClick={() => onPageChange(entry)}
            aria-label={`Page ${entry}`}
            aria-current={entry === page ? 'page' : undefined}
            className={`min-w-[32px] px-2 py-1.5 text-sm rounded transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 ${
              entry === page
                ? 'bg-library-red text-white'
                : 'text-library-text-secondary hover:bg-library-bg-shelf'
            }`}
          >
            {entry}
          </button>
        ) : (
          <span key={entry} aria-hidden="true" className="px-1 text-library-text-muted">
            …
          </span>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pages}
        aria-label="Next page"
        className={`px-3 py-1.5 text-sm rounded border border-library-border text-library-text-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 ${
          page >= pages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-library-bg-shelf'
        }`}
      >
        Next
      </button>
    </nav>
  );
}

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogItem[]} props.books - Books to display
 * @param {number} props.total - Total matching books count
 * @param {number} props.page - Current page number
 * @param {number} props.pages - Total page count
 * @param {boolean} props.loading - Whether data is loading
 * @param {string|null} props.error - Error message if fetch failed
 * @param {function} props.onPageChange - Called with new page number
 * @param {function} props.onClearFilters - Called when "Clear all filters" is clicked (filtered empty state)
 * @param {boolean} props.hasActiveFilters - Whether any filters are active
 */
export function CatalogGrid({ books, total, page, pages, loading, error, onPageChange, onClearFilters, hasActiveFilters }) {
  // Loading takes priority over stale content — a fresh fetch is in flight
  // for the current filters/sort/page, so what's still in `books` no
  // longer describes what's being requested.
  if (loading) {
    return (
      <div role="region" aria-label="Book catalog" aria-busy="true" className={GRID_CLASSES}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <BookCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Only take the full-block error state when there's nothing to show
  // underneath it — useCatalog deliberately preserves the last successful
  // `books` array on a failed refetch, so a later error with existing
  // results falls through to the normal grid below instead of hiding them.
  if (error && books.length === 0) {
    return (
      <div role="alert" className="text-center py-24">
        <p className="font-garamond text-xl text-library-text-secondary">Something went wrong</p>
        <p className="text-sm text-library-text-muted mt-2">{error}</p>
      </div>
    );
  }

  if (books.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="text-center py-24">
          <p className="font-garamond text-xl text-library-text-secondary">No books found</p>
          <p className="text-sm text-library-text-muted mt-2">Try adjusting your filters</p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 text-sm text-library-red hover:underline rounded transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
          >
            Clear all filters
          </button>
        </div>
      );
    }
    return (
      <div className="text-center py-24">
        <p className="font-garamond text-xl text-library-text-secondary">The library is being prepared</p>
        <p className="text-sm text-library-text-muted mt-2">Books are being added. Check back soon.</p>
      </div>
    );
  }

  return (
    <div role="region" aria-label="Book catalog">
      <p className="text-sm text-library-text-muted mb-4">Showing {total} books</p>
      <div className={GRID_CLASSES}>
        {books.map((book) => (
          <BookCard key={book.id} book={book} variant="grid" showAddButton={true} />
        ))}
      </div>
      <Pagination page={page} pages={pages} onPageChange={onPageChange} />
    </div>
  );
}
