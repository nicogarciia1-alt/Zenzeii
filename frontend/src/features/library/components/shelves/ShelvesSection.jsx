/**
 * @fileoverview Library shelves section — all discovery shelf groups.
 *
 * Renders: Feeling Shelves, Discover Japan shelves, and Timeless
 * Classics shelf. Still on mock data as of Phase 11 — deliberately not
 * wired to live data (see Phase 6/8/10 notes throughout this codebase).
 * The "Explore by feeling"/"Discover Japan" shelves are hand-curated
 * collections (mood/setting groupings), not a plain catalog query — they
 * need a dynamic collection backend endpoint that doesn't exist yet, so
 * wiring them to live data isn't a drop-in fetchCatalog() swap the way
 * FilterBar/CatalogGrid were.
 *
 * No separate FeelingShelvesGroup/DiscoverJapanGroup/ClassicsShelfGroup
 * components — the three shelf blocks are inlined directly here,
 * matching the brief's own literal code sample and its 13-step
 * implementation order (neither ever creates those three files,
 * despite the brief's Component Breakdown diagram implying they exist).
 *
 * No props — self-contained with mock data.
 */
import { SectionHeader } from './SectionHeader';
import { ShelfScrollContainer } from './ShelfScrollContainer';
import { FeelingCard } from './FeelingCard';
import { BookShelf } from './BookShelf';
import { FEELING_SHELVES, DISCOVER_JAPAN_SHELVES } from '../../data/mockCollections';
import { MOCK_CATALOG_BOOKS } from '../../data/mockCatalog';

export function ShelvesSection() {
  return (
    <div className="max-w-[1440px] mx-auto px-5 md:px-12 lg:px-20 py-8 space-y-16">
      {/* Explore by Feeling */}
      <section aria-label="Explore by feeling">
        <SectionHeader
          title="Explore by feeling"
          subtitle="Books that match your mood"
          viewAllLabel="View all"
          viewAllAriaLabel="View all books in Explore by feeling"
          // TODO: needs a dynamic collection backend endpoint — see fileoverview above.
          onViewAll={() => {}}
        />
        <ShelfScrollContainer>
          {FEELING_SHELVES.map((shelf) => (
            <FeelingCard
              key={shelf.id}
              id={shelf.id}
              name={shelf.name}
              nameJp={shelf.name_jp}
              bookCount={shelf.book_count}
              imageUrl={shelf.image_url}
              emoji={shelf.emoji}
            />
          ))}
        </ShelfScrollContainer>
      </section>

      {/* Discover Japan through stories */}
      <section aria-label="Discover Japan through stories">
        <SectionHeader
          title="Discover Japan through stories"
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
