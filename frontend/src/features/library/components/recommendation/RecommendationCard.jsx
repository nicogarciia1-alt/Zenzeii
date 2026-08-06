/**
 * @fileoverview Featured recommendation card.
 *
 * The primary book recommendation display. Renders a book cover alongside
 * its full information block. Used in the "Your next book" section.
 * Composes BookCoverArt + BookInfoBlock; no logic of its own.
 */
import { BookCoverArt } from '../books/BookCoverArt';
import { BookInfoBlock } from '../books/BookInfoBlock';

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogItem} props.book
 * @param {function} [props.onViewDetails]
 * @param {function} [props.onBookmark]
 * @param {boolean} [props.isBookmarked]
 */
export function RecommendationCard({ book, onViewDetails, onBookmark, isBookmarked }) {
  return (
    <div
      role="region"
      aria-label="Featured book recommendation"
      className="bg-library-bg-card rounded-lg border border-library-border shadow-sm p-6 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6"
    >
      <BookCoverArt
        bookId={book.id}
        titleJp={book.title_jp}
        titleEn={book.title_en}
        authorJp={book.author_name_jp || book.author_name}
        coverImage={book.cover_image}
        size="md"
      />
      <BookInfoBlock
        book={book}
        onViewDetails={onViewDetails}
        onBookmark={onBookmark}
        isBookmarked={isBookmarked}
      />
    </div>
  );
}
