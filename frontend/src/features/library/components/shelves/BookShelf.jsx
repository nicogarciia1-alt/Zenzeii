/**
 * @fileoverview Reusable horizontal book shelf component.
 *
 * Renders a section header and a horizontally scrollable row of book
 * cards. The single shelf component that powers every book collection
 * in the Library.
 *
 * Phase 4: renders BookCardPlaceholder for each book.
 * Phase 5 handoff: the ONLY change this component needs is swapping
 * `<BookCardPlaceholder book={book} />` below for the real `<BookCard
 * book={book} />`. Everything else — SectionHeader, ShelfScrollContainer,
 * arrows, aria-labels — stays exactly as built here.
 */
import { SectionHeader } from './SectionHeader';
import { ShelfScrollContainer } from './ShelfScrollContainer';
import { BookCardPlaceholder } from '../books/BookCardPlaceholder';

/**
 * @param {Object} props
 * @param {string} props.title - Shelf section title
 * @param {string} [props.subtitle] - Optional subtitle
 * @param {string} [props.icon] - Optional icon for SectionHeader
 * @param {import('../../types/catalogTypes').BookCatalogItem[]} props.books - Books to display
 * @param {function} [props.onViewAll] - Called when "View all" is clicked
 * @param {boolean} [props.showArrows] - Whether to show navigation arrows (default true)
 */
export function BookShelf({ title, subtitle, icon, books, onViewAll, showArrows = true }) {
  return (
    <section aria-label={title}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        icon={icon}
        viewAllLabel="View all"
        viewAllAriaLabel={`View all books in ${title}`}
        onViewAll={onViewAll}
      />
      <ShelfScrollContainer showArrows={showArrows}>
        {books.map((book) => (
          <BookCardPlaceholder key={book.id} book={book} />
        ))}
      </ShelfScrollContainer>
    </section>
  );
}
