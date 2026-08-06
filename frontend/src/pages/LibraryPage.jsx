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
import { FilterBar } from '@/features/library/components/filters/FilterBar';
import { ShelvesSection } from '@/features/library/components/shelves/ShelvesSection';

export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-library-bg-primary">

      {/* Phase 1 — Hero */}
      <LibraryHero />

      {/* Phase 2 — Recommendation */}
      <RecommendationSection />

      {/* Phase 3 — Filter Bar */}
      <FilterBar />

      {/* Phase 4 — Shelves */}
      <ShelvesSection />

    </div>
  );
}
