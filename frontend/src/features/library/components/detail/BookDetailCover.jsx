/**
 * @fileoverview Book detail page's large portrait cover — left column.
 * Thin wrapper around BookCoverArt's 'detail' size variant (240x360),
 * adding the drop shadow the detail page's hero specifies.
 */
import { BookCoverArt } from '../books/BookCoverArt';

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 */
export function BookDetailCover({ book }) {
  return (
    <div className="shadow-library-card-lg rounded-library-sm overflow-hidden inline-block">
      <BookCoverArt
        bookId={book.id}
        titleJp={book.title_jp}
        titleEn={book.title_en}
        titleRomaji={book.title_romaji}
        authorJp={book.author_name_jp}
        authorRomaji={book.author_name}
        coverImage={book.cover_image}
        size="detail"
        genre_ids={book.genre_ids}
      />
    </div>
  );
}
