/**
 * @fileoverview Zenzeii shelf detail page — /bookshelves/:slug.
 *
 * Renders one curated shelf (fetched from GET /api/shelves/:slug) with a
 * full-width, no-sidebar-catalog layout: breadcrumb, cover + title/
 * description header, a real FilterSidebar, and a book grid/list.
 *
 * Filtering is client-side, not server-side: GET /api/catalog has no
 * id-list filter param, so useCatalog (which always hits /api/catalog)
 * can't be reused for a fixed shelf book set. Instead this page fetches
 * the shelf's ~10 books once and filters that array locally with the
 * same filter shape FilterSidebar already speaks (genre/difficulty/
 * jlpt/length/theme), so FilterSidebar and useTaxonomy() are reused
 * completely unmodified.
 *
 * Known gap: GET /api/shelves/:slug resolves book_ids into
 * BookCatalogItem — the Layer-1-only list/card shape — which does not
 * include theme_ids (Layer 2, only present on BookCatalogDetail). On
 * the main LibraryPage the theme filter works because the *backend*
 * queries theme_ids server-side; here there's no per-book theme data to
 * match against client-side. The Theme row stays in FilterSidebar
 * (unmodified, per COO instruction) but selecting a theme is currently
 * a no-op rather than a false "0 books" result — flagged to COO/Nico
 * separately, not fixed here since it would require a backend change.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Grid2X2, List } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { FilterSidebar } from '@/features/library/components/filters/FilterSidebar';
import { BookCard } from '@/features/library/components/books/BookCard';
import { BookCoverArt } from '@/features/library/components/books/BookCoverArt';
import { SealStamp } from '@/features/library/components/books/bookCoverDecorations';
import { useTaxonomy } from '@/features/library/hooks/useTaxonomy';
import { fetchShelf } from '@/features/library/services/catalogApi';

const DEFAULT_SHELF_FILTERS = {
  genre: null,
  difficulty: null,
  jlpt: null,
  length: null,
  theme: null,
};

const GRID_CLASSES = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6';

export default function ShelfDetailPage() {
  const { slug } = useParams();
  const taxonomy = useTaxonomy();

  const [shelf, setShelf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // 'not_found' | 'error' | null
  const [filters, setFiltersState] = useState(DEFAULT_SHELF_FILTERS);
  const [view, setView] = useState('grid'); // 'grid' | 'list'

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setShelf(null);
    setFiltersState(DEFAULT_SHELF_FILTERS);

    fetchShelf(slug)
      .then((data) => {
        if (cancelled) return;
        setShelf(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err?.response?.status === 404 ? 'not_found' : 'error');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const setFilter = (filterId, value) => {
    setFiltersState((prev) => ({ ...prev, [filterId]: value }));
  };

  const clearAllFilters = () => setFiltersState(DEFAULT_SHELF_FILTERS);

  const hasActiveFilters = Object.values(filters).some((v) => v !== null);

  const filteredBooks = useMemo(() => {
    if (!shelf) return [];
    return shelf.books.filter((book) => {
      if (filters.genre && !book.genre_ids?.includes(filters.genre)) return false;
      if (filters.difficulty && book.difficulty !== filters.difficulty) return false;
      if (filters.jlpt && book.jlpt_level !== filters.jlpt) return false;
      if (filters.length && book.length_category !== filters.length) return false;
      // theme intentionally not matched — see fileoverview.
      return true;
    });
  }, [shelf, filters]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="animate-pulse text-library-text-secondary">Loading shelf…</p>
        </div>
      </Layout>
    );
  }

  if (loadError) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-6">
          <p className="font-garamond text-xl text-library-text-secondary">
            {loadError === 'not_found' ? 'This shelf could not be found' : 'Something went wrong'}
          </p>
          <Link to="/library" className="text-sm text-library-red hover:underline">
            Back to Bookshelves
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-library-bg-primary">
        <div className="flex">
          <FilterSidebar
            totalBooks={filteredBooks.length}
            onResetFilters={clearAllFilters}
            filters={filters}
            onFilterChange={setFilter}
            taxonomy={taxonomy}
          />

          <div className="flex-1 min-w-0 px-8">
            <header className="pt-8 pb-8">
              <div className="mb-6">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild className="text-library-red hover:text-library-red">
                        <Link to="/library">Bookshelves</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-library-text-primary">{shelf.title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>

              <div className="flex items-start justify-between gap-8">
                <div className="flex gap-6">
                  <BookCoverArt
                    bookId={`shelf-${shelf.slug}`}
                    titleJp={shelf.title_jp}
                    titleEn={shelf.title}
                    titleRomaji={shelf.title}
                    coverImage={shelf.image_url || null}
                    size="lg"
                    genre_ids={['genre_novel']}
                  />
                  <div className="flex flex-col justify-center gap-3 max-w-xl">
                    <h1 className="font-playfair text-4xl font-semibold text-library-text-primary">{shelf.title}</h1>
                    <p className="text-sm text-library-text-secondary line-clamp-2">{shelf.description}</p>
                    <p className="text-xs text-library-text-secondary">
                      {shelf.book_count} book{shelf.book_count === 1 ? '' : 's'} · Curated by Zenzeii · Public
                    </p>
                  </div>
                </div>

                <div className="hidden md:flex flex-col items-end gap-3 shrink-0 pt-2">
                  <p
                    className="font-garamond text-base text-library-text-secondary"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    {shelf.kanji_text}
                  </p>
                  <SealStamp className="w-8 h-8" textClass="text-[9px]" />
                </div>
              </div>
            </header>

            <div className="border-t border-library-border" />

            <section aria-label={`${shelf.title} books`} className="py-8">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-library-text-muted">
                  {filteredBooks.length} book{filteredBooks.length === 1 ? '' : 's'}
                </p>
                <div className="flex items-center gap-2 bg-library-bg-shelf rounded-library-xs p-1">
                  <button
                    type="button"
                    aria-label="Grid view"
                    aria-pressed={view === 'grid'}
                    onClick={() => setView('grid')}
                    className={`p-1 ${view === 'grid' ? 'text-library-red' : 'text-library-text-secondary'}`}
                  >
                    <Grid2X2 className="w-[18px] h-[18px]" />
                  </button>
                  <button
                    type="button"
                    aria-label="List view"
                    aria-pressed={view === 'list'}
                    onClick={() => setView('list')}
                    className={`p-1 ${view === 'list' ? 'text-library-red' : 'text-library-text-secondary'}`}
                  >
                    <List className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>

              {filteredBooks.length === 0 ? (
                <div className="text-center py-24">
                  <p className="font-garamond text-xl text-library-text-secondary">No books found</p>
                  <p className="text-sm text-library-text-muted mt-2">Try adjusting your filters</p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="mt-4 text-sm text-library-red hover:underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : view === 'grid' ? (
                <div className={GRID_CLASSES}>
                  {filteredBooks.map((book) => (
                    <BookCard key={book.id} book={book} variant="grid" showAddButton />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredBooks.map((book) => (
                    <BookCard key={book.id} book={book} variant="compact" />
                  ))}
                </div>
              )}

              <p className="text-center text-sm text-library-text-muted mt-10">✿ End of shelf</p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
