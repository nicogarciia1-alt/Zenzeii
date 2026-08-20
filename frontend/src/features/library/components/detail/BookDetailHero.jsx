/**
 * @fileoverview Book detail page's three-column top section:
 * cover / info / metadata panel.
 */
import { BookDetailCover } from './BookDetailCover';
import { BookDetailInfo } from './BookDetailInfo';
import { BookDetailMeta } from './BookDetailMeta';

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 * @param {ReturnType<typeof import('../../hooks/useTaxonomy').useTaxonomy>} props.taxonomy
 * @param {function} props.onImported - Called once the book is confirmed on the shelf
 */
export function BookDetailHero({ book, taxonomy, onImported }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[28%_44%_28%] gap-8">
      <div>
        <BookDetailCover book={book} />
      </div>
      <BookDetailInfo book={book} taxonomy={taxonomy} onImported={onImported} />
      <BookDetailMeta book={book} taxonomy={taxonomy} />
    </div>
  );
}
