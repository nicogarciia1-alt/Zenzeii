/**
 * @fileoverview Gate B detail — a dimmed/blurred preview of the target
 * shelf's first 3 books with a centered lock overlay. Self-fetches the
 * shelf (fetchShelf(slug), the same GET /api/shelves/{slug} ShelfDetailPage
 * uses) from the slug passed in via gate context, rather than requiring
 * ShelvesSection to marshal book data before the gate can open.
 *
 * Fetch failure/missing slug both resolve to an empty book list — falls
 * back to plain placeholder slots under the same lock overlay rather than
 * crashing or showing broken images.
 */
import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { fetchShelf } from '@/features/library/services/catalogApi';
import { BookCoverArt } from '@/features/library/components/books/BookCoverArt';

export function CuratedCollectionPreview({ context }) {
  const slug = context?.slug;
  const [books, setBooks] = useState([]);

  useEffect(() => {
    if (!slug) {
      setBooks([]);
      return;
    }
    let cancelled = false;
    fetchShelf(slug)
      .then((shelf) => {
        if (!cancelled) setBooks(Array.isArray(shelf?.books) ? shelf.books.slice(0, 3) : []);
      })
      .catch(() => {
        if (!cancelled) setBooks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const slots = [0, 1, 2];

  return (
    <div className="gate-collection-preview">
      <div className="gate-collection-preview__covers">
        {slots.map((i) => {
          const book = books[i];
          return book ? (
            <BookCoverArt
              key={book.id}
              bookId={book.id}
              titleJp={book.title_jp}
              titleEn={book.title_en}
              authorJp={book.author_name_jp || book.author_name}
              coverImage={book.cover_image}
              genre_ids={book.genre_ids}
              size="sm"
            />
          ) : (
            <div key={`placeholder-${i}`} className="gate-library-preview__locked" aria-hidden="true" />
          );
        })}
      </div>
      <div className="gate-collection-preview__overlay">
        <span className="gate-collection-preview__overlay-icon">
          <Lock size={16} aria-hidden="true" />
        </span>
        <p>A curated collection for Toshokan Pass members.</p>
      </div>
    </div>
  );
}
