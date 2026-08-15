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
import { RecommendationSection } from '@/features/library/components/recommendation/RecommendationSection';
import { FilterBar } from '@/features/library/components/filters/FilterBar';
import { ShelvesSection } from '@/features/library/components/shelves/ShelvesSection';
import { CatalogGrid } from '@/features/library/components/books/CatalogGrid';
import { SectionHeader } from '@/features/library/components/shelves/SectionHeader';
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
          a delay before the user sees anything at all. */}
      <LibraryHero searchProps={searchProps} />

      {/* Phase 2 — Recommendation.
          Fade-only entrance everywhere below (no slide/transform) — see
          Bug 2 fix note: a transform held past its animation's end via
          animationFillMode: 'both' establishes a permanent new stacking
          context on that element. Any such wrapper positioned after
          FilterBar in the DOM then paints its entire subtree on top of
          FilterBar's z-40 dropdown, regardless of that z-index — stacking
          contexts aren't comparable across that boundary, only DOM/paint
          order is, once a sibling creates its own context. This bit
          FilterBar → ShelvesSection/CatalogGrid in production; fade-only
          (opacity settles at 1, which does not create a stacking context)
          avoids the whole bug class rather than fixing it section by
          section. */}
      <div className="mt-8 animate-in fade-in-0 duration-slow" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
        <RecommendationSection />
      </div>

      {/* Phase 4 — Shelves, still mock data */}
      <div className="mt-8 animate-in fade-in-0 duration-slow" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
        <ShelvesSection />
      </div>

      {/* Phase 3 — Filter Bar, live-wired to useCatalog + useTaxonomy (Phase 6).
          Also fade-only for its own separate reason: FilterBar's root is
          position: sticky, and a transform on an ancestor can break sticky
          positioning for the descendant the same way it breaks z-index
          above — same root cause (a lingering transform), two different
          symptoms. */}
      <div className="mt-spacing-8 animate-in fade-in-0 duration-slow" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
        <FilterBar
          externalFilters={catalog.filters}
          onExternalFilterChange={catalog.setFilter}
          taxonomy={taxonomy}
        />
      </div>

      {/* Phase 6 — Catalog: all books, filterable. Phase 7: also the search results view. */}
      <section
        id={CATALOG_SECTION_ID}
        aria-label="All books"
        className="mt-spacing-12 max-w-[1440px] mx-auto px-5 md:px-12 lg:px-20 py-8 animate-in fade-in-0 duration-slow"
        style={{ animationDelay: '400ms', animationFillMode: 'both' }}
      >
        <SectionHeader
          title="All books"
          subtitle={
            catalog.total > 0
              ? `${catalog.total} book${catalog.total === 1 ? '' : 's'} found`
              : 'Explore the collection'
          }
          subtitleAriaLive="polite"
          icon="📚"
        />
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
    </Layout>
  );
}
