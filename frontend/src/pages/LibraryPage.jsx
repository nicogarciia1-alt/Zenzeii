/**
 * @fileoverview Zenzeii Library page — top-level orchestrator.
 *
 * Holds useCatalog, useTaxonomy, and useSearch — the three data hooks —
 * and passes their state down to FilterBar, LibraryHero (search), and
 * CatalogGrid. ShelvesSection stays self-contained on mock data — the
 * dynamic collection system that would back it with real taxonomy
 * queries is a future backend feature, out of scope here.
 *
 * Search (Phase 7) is not a separate results view — useSearch debounces
 * the hero SearchBar's input and forwards it straight into
 * catalog.setFilter('q', ...), so it composes with every other filter
 * and renders through the same CatalogGrid.
 *
 * Layout structure:
 *   <LibraryPage>
 *     <LibraryHero />           Phase 1, search-wired Phase 7
 *     <RecommendationSection /> Phase 2
 *     <FilterBar />             Phase 3, live-wired Phase 6
 *     <ShelvesSection />        Phase 4, still mock data
 *     <CatalogGrid />           Phase 6
 *   </LibraryPage>
 */
import LibraryHero from '@/features/library/components/hero/LibraryHero';
import { FilterSidebar } from '@/features/library/components/filters/FilterSidebar';
import { LibraryContentHeader } from '@/features/library/components/filters/LibraryContentHeader';
import { ShelvesSection } from '@/features/library/components/shelves/ShelvesSection';
import { CatalogGrid } from '@/features/library/components/books/CatalogGrid';
import { useCatalog } from '@/features/library/hooks/useCatalog';
import { useTaxonomy } from '@/features/library/hooks/useTaxonomy';
import { useSearch } from '@/features/library/hooks/useSearch';
import { CATALOG_SECTION_ID } from '@/features/library/constants/libraryConstants';
import Layout from '@/components/layout/Layout';

export default function LibraryPage() {
  const catalog = useCatalog();
  const taxonomy = useTaxonomy();
  const search = useSearch((query) => catalog.setFilter('q', query));

  const searchProps = {
    value: search.query,
    onChange: search.setQuery,
    onClear: search.clearQuery,
    isSearching: search.isSearching,
  };

  return (
    <Layout>
    <div className="bg-library-bg-primary">

      {/* Phase 1 — Hero, search-wired Phase 7. Entrance animation skipped here —
          it's the first thing visible on load, so fading it in would only add
          a delay before the user sees anything at all. Full-width, sits above
          the sidebar/content flex row below — not part of it. */}
      <LibraryHero searchProps={searchProps} />

      {/* UI Refinement (Aug 2026) — vertical FilterSidebar + content column,
          replacing the old horizontal FilterBar. The sidebar sits beside
          BOTH the shelves and the catalog, not just the catalog — so the
          flex row wraps everything below the Hero, and Shelves/Catalog
          stack inside the flex-1 content column instead of being direct
          children of the page. min-w-0 on that column is required: without
          it a flex child won't shrink below its content's intrinsic width,
          and ShelfScrollContainer's horizontal-scrolling row would push the
          column (and the whole page) wider than intended. */}
      <div className="flex">
        <FilterSidebar totalBooks={catalog.total} onResetFilters={catalog.clearAllFilters} />

        <div className="flex-1 min-w-0">
          {/* Phase 4 — Shelves, still mock data */}
          <div className="mt-8 animate-in fade-in-0 duration-slow" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <ShelvesSection />
          </div>

          {/* Phase 6 — Catalog: all books, filterable. Phase 7: also the search results view. */}
          <section
            id={CATALOG_SECTION_ID}
            aria-label="All books"
            className="mt-spacing-8 max-w-[1440px] mx-auto px-5 md:px-12 lg:px-20 py-8 animate-in fade-in-0 duration-slow"
            style={{ animationDelay: '400ms', animationFillMode: 'both' }}
          >
            <LibraryContentHeader total={catalog.total} />
            <CatalogGrid
              books={catalog.books}
              total={catalog.total}
              page={catalog.page}
              pages={catalog.pages}
              loading={catalog.loading}
              error={catalog.error}
              onPageChange={catalog.setPage}
              onClearFilters={catalog.clearAllFilters}
              hasActiveFilters={catalog.hasActiveFilters}
            />
          </section>
        </div>
      </div>

    </div>
    </Layout>
  );
}
