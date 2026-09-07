/**
 * @fileoverview Gate A detail — the user's 2 occupied library slots plus a
 * third locked "Add more books" slot. Self-fetches the current user's
 * library (getBooks()) rather than requiring callers to pass it in, so
 * every trigger site (HomePage, ImportButton, AcquisitionModal) can open
 * this gate the same way.
 *
 * Fetch failure/loading both resolve to an empty slot list — the two
 * "real book" positions just render as locked-looking placeholders
 * instead of crashing or showing a broken image.
 */
import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { getBooks } from '@/lib/api';
import { BookCoverArt } from '@/features/library/components/books/BookCoverArt';

export function LibraryLimitPreview() {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getBooks()
      .then((res) => {
        if (!cancelled) setBooks(Array.isArray(res.data) ? res.data.slice(0, 2) : []);
      })
      .catch(() => {
        if (!cancelled) setBooks([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="gate-library-preview">
      {[0, 1].map((i) => {
        const book = books[i];
        return book ? (
          <BookCoverArt
            key={book.id}
            bookId={book.id}
            titleJp={book.title_jp || book.title}
            titleEn={book.title_en || book.title}
            authorJp={book.author_jp || book.author}
            coverImage={book.cover_image}
            size="sm"
          />
        ) : (
          <div key={`empty-${i}`} className="gate-library-preview__locked" aria-hidden="true" />
        );
      })}
      <div className="gate-library-preview__locked">
        <Lock size={16} aria-hidden="true" />
        <span>Add more books</span>
      </div>
    </div>
  );
}
