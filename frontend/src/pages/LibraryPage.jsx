/**
 * @fileoverview Zenzeii Library page — top-level orchestrator.
 *
 * Holds useCatalog and useTaxonomy, the two Phase 6 data hooks, and
 * passes their state down to FilterBar and CatalogGrid. ShelvesSection
 * stays self-contained on mock data — the dynamic collection system that
 * would back it with real taxonomy queries is a future backend feature,
 * out of scope for Phase 6 (which only connects the main catalog listing
 * and filter system).
 *
 * Layout structure:
 *   <LibraryPage>
 *     <LibraryHero />           Phase 1
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
import Layout from '@/components/layout/Layout';

export default function LibraryPage() {
  const catalog = useCatalog();
  const taxonomy = useTaxonomy();

  return (
    <Layout>
    <div className="bg-library-bg-primary">

      {/* Phase 1 — Hero */}
      <LibraryHero />

      {/* Phase 2 — Recommendation */}
      <RecommendationSection />

      {/* Phase 3 — Filter Bar, live-wired to useCatalog + useTaxonomy (Phase 6) */}
      <FilterBar
        externalFilters={catalog.filters}
        onExternalFilterChange={catalog.setFilter}
        taxonomy={taxonomy}
      />

      {/* Phase 4 — Shelves, still mock data */}
      <ShelvesSection />

      {/* Phase 6 — Catalog: all books, filterable */}
      <div className="max-w-[1440px] mx-auto px-5 md:px-12 lg:px-20 py-8">
        <SectionHeader
          title="All books"
          subtitle={catalog.total > 0 ? `${catalog.total} books in the library` : 'Explore the collection'}
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
      </div>

    </div>
    </Layout>
  );
}
