/**
 * @fileoverview Sticky bottom CTA bar for the book detail page. Always
 * visible while scrolling. "Preview Sample" and "More" (···) are
 * eliminated per product decision — not in this build.
 *
 * 'buy' books that have a completed EPUB import (book.linked_upload_id/
 * linked_upload_status — see AcquisitionModal's fileoverview for why this
 * is a separate book id from book.id) replace the whole bar with the
 * post-import layout: cover thumbnail, "In My Books" + import date, Read
 * now / View in My Books. Every other state (free books, buy books not yet
 * imported) keeps the original availability-label-plus-CTA layout.
 */
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle } from 'lucide-react';
import { ImportButton } from './ImportButton';
import { AcquisitionButton } from '../acquisition/AcquisitionButton';
import { BookCoverArt } from '../books/BookCoverArt';
import { AVAILABILITY_LABELS, AVAILABILITY_SUBTITLES } from '../../constants/libraryConstants';
import { formatShelvedDate } from '../../utils/libraryUtils';

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 * @param {function} props.onImported - Called once the book is confirmed on the shelf (free books) or an EPUB copy is imported (buy books)
 */
export function BookDetailStickyBar({ book, onImported }) {
  const navigate = useNavigate();
  const isImportedBuyBook = book.availability === 'buy' && book.linked_upload_status === 'completed' && book.linked_upload_id;

  if (isImportedBuyBook) {
    const importedDate = formatShelvedDate(book.linked_upload_at);
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-library-border/40 shadow-library-card-lg">
        <div className="max-w-[1440px] mx-auto px-5 md:px-12 lg:px-20 py-4 flex items-center gap-4">
          <BookCoverArt
            bookId={book.id}
            titleJp={book.title_jp}
            titleEn={book.title_en}
            titleRomaji={book.title_romaji}
            authorJp={book.author_name_jp}
            authorRomaji={book.author_name}
            coverImage={book.cover_image}
            size="sm"
            genre_ids={book.genre_ids}
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-library-text-primary">In My Books</span>
            </div>
            {importedDate && <p className="text-xs text-library-text-muted">Imported on {importedDate}</p>}
          </div>

          <div className="flex-1" />

          <button
            type="button"
            onClick={() => navigate(`/read/${book.linked_upload_id}`)}
            className="h-12 px-6 rounded bg-library-red text-white text-sm font-medium hover:bg-library-red-hover transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
          >
            Read now
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-12 px-6 rounded border border-library-border text-library-text-primary text-sm font-medium hover:bg-library-bg-shelf transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
          >
            View in My Books
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-library-border/40 shadow-library-card-lg">
      <div className="max-w-[1440px] mx-auto px-5 md:px-12 lg:px-20 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
          <div className="w-10 h-10 rounded-full bg-library-bg-shelf flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-library-text-secondary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-library-text-primary truncate">
              {AVAILABILITY_LABELS[book.availability] ?? book.availability}
            </p>
            <p className="text-xs text-library-text-muted truncate hidden sm:block">
              {AVAILABILITY_SUBTITLES[book.availability] ?? ''}
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {book.availability === 'buy' ? (
          <AcquisitionButton book={book} variant="sticky" onImported={onImported} />
        ) : (
          <ImportButton book={book} variant="sticky" onImported={onImported} />
        )}
      </div>
    </div>
  );
}
