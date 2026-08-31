/**
 * @fileoverview Library shelves section — discovery shelf groups.
 *
 * Renders: Discover Japan shelves and Timeless Classics shelf. Still on
 * mock data as of Phase 11 — deliberately not wired to live data (see
 * Phase 6/8/10 notes throughout this codebase). The "Discover Japan"
 * shelf is a hand-curated collection (setting grouping), not a plain
 * catalog query — it needs a dynamic collection backend endpoint that
 * doesn't exist yet, so wiring it to live data isn't a drop-in
 * fetchCatalog() swap the way FilterBar/CatalogGrid were.
 *
 * No props — self-contained with mock data.
 *
 * Card navigation (Step 3, Aug 2026): each Discover Japan card now
 * navigates to /bookshelves/:slug via FeelingCard's existing onClick
 * prop — the card visuals are untouched. See DISCOVER_JAPAN_SHELVES's
 * own comment for which slugs currently have real books vs. an empty
 * placeholder shelf. This does NOT wire the section itself to live
 * shelf data — still deliberately mock, per COO
 * instruction, until all 6 shelves are seeded.
 */
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from './SectionHeader';
import { ShelfScrollContainer } from './ShelfScrollContainer';
import { FeelingCard } from './FeelingCard';
import { BookShelf } from './BookShelf';
import { DISCOVER_JAPAN_SHELVES } from '../../data/mockCollections';
import { MOCK_CATALOG_BOOKS } from '../../data/mockCatalog';

export function ShelvesSection() {
  const navigate = useNavigate();

  return (
    <div className="py-8 space-y-spacing-12">
      {/* Discover Japan through stories */}
      <section aria-label="Discover Japan through stories">
        <SectionHeader
          title="Discover Japan"
          subtitle="Explore books by setting, culture, and time"
          viewAllLabel="View all"
          viewAllAriaLabel="View all books in Discover Japan through stories"
          // TODO: needs a dynamic collection backend endpoint — see fileoverview above.
          onViewAll={() => {}}
        />
        <ShelfScrollContainer>
          {DISCOVER_JAPAN_SHELVES.map((shelf) => (
            <FeelingCard
              key={shelf.id}
              id={shelf.id}
              name={shelf.name}
              nameJp={shelf.name_jp}
              bookCount={shelf.book_count}
              imageUrl={shelf.image_url}
              emoji={shelf.emoji}
              onClick={() => navigate(`/bookshelves/${shelf.slug}`)}
            />
          ))}
        </ShelfScrollContainer>
      </section>

      {/* Timeless Classics */}
      <BookShelf
        title="Timeless classics"
        subtitle="The books everyone should read"
        books={MOCK_CATALOG_BOOKS}
        // TODO: needs a dynamic collection backend endpoint — see fileoverview above.
        onViewAll={() => {}}
      />
    </div>
  );
}
