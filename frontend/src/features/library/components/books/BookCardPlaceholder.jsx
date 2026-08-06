/**
 * @fileoverview Temporary book card placeholder for Phase 4 shelf layout.
 *
 * Renders a correctly-sized card skeleton to establish the shelf layout
 * before Phase 5 implements the real BookCard component.
 *
 * THIS COMPONENT WILL BE DELETED IN PHASE 5.
 * Do not add logic or styling beyond what's needed to establish correct dimensions.
 */
import { BookCoverArt } from './BookCoverArt';

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogItem} props.book
 */
export function BookCardPlaceholder({ book }) {
  return (
    <div aria-label={book.title_en} className="w-[80px]">
      <BookCoverArt
        bookId={book.id}
        titleJp={book.title_jp}
        titleEn={book.title_en}
        authorJp={book.author_name_jp || book.author_name}
        coverImage={book.cover_image}
        size="sm"
      />
      <p className="mt-1 text-xs text-library-text-secondary truncate">{book.title_en}</p>
    </div>
  );
}
