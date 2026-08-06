/**
 * @fileoverview Zenzeii Library page — top-level layout shell.
 *
 * Responsibility: provide the responsive page structure.
 * All sections are rendered as placeholder divs in Phase 0.
 * Each phase replaces a placeholder with a real component.
 *
 * Layout structure:
 *   <LibraryPage>
 *     <LibraryHero />           Phase 1
 *     <RecommendationSection /> Phase 2
 *     <FilterBar />             Phase 3
 *     <BookShelf /> x N         Phase 4
 *     <CatalogGrid />           Phase 6
 *   </LibraryPage>
 */
import LibraryHero from '@/features/library/components/hero/LibraryHero';
import { RecommendationSection } from '@/features/library/components/recommendation/RecommendationSection';

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-library-bg-primary">

      {/* Phase 1 — Hero */}
      <LibraryHero />

      {/* Phase 2 — Recommendation */}
      <RecommendationSection />

      {/* Phase 3 — Filter Bar */}
      <div data-section="filters" className="w-full h-14 border-b border-library-border" />

      {/* Phase 4 — Shelves */}
      <div data-section="shelves" className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 py-8 lg:py-12 space-y-8 lg:space-y-16" />

    </div>
  );
}
