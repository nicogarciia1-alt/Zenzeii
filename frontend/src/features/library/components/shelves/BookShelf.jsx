/**
 * @fileoverview Reusable horizontal book shelf component.
 *
 * Renders a section header and a horizontally scrollable row of book
 * cards. The single shelf component that powers every book collection
 * in the Library.
 *
 * Phase 5: renders the real BookCard (shelf variant) for each book —
 * replaces BookCardPlaceholder, retired this phase.
 */
import { SectionHeader } from './SectionHeader';
import { ShelfScrollContainer } from './ShelfScrollContainer';
import { BookCard } from '../books/BookCard';

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
          <BookCard key={book.id} book={book} variant="shelf" />
        ))}
      </ShelfScrollContainer>
    </section>
  );
}
