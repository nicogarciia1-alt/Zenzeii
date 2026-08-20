/**
 * @fileoverview Primary action row for the book detail page's center column.
 * Composes ImportButton (Add to My Books / Read Now) and BookmarkButton.
 */
import { ImportButton } from './ImportButton';
import { BookmarkButton } from './BookmarkButton';

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 * @param {function} props.onImported - Called once the book is confirmed on the shelf
 */
export function BookDetailActions({ book, onImported }) {
  return (
    <div className="flex items-center gap-3">
      <ImportButton book={book} variant="detail" onImported={onImported} />
      <BookmarkButton bookId={book.id} bookTitle={book.title_en} isMarked={book.is_marked} />
    </div>
  );
}
