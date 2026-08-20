/**
 * @fileoverview Sticky bottom CTA bar for the book detail page. Always
 * visible while scrolling. "Preview Sample" and "More" (···) are
 * eliminated per product decision — not in this build.
 */
import { BookOpen } from 'lucide-react';
import { ImportButton } from './ImportButton';
import { AVAILABILITY_LABELS, AVAILABILITY_SUBTITLES } from '../../constants/libraryConstants';

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 * @param {function} props.onImported - Called once the book is confirmed on the shelf
 */
export function BookDetailStickyBar({ book, onImported }) {
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

        <ImportButton book={book} variant="sticky" onImported={onImported} />
      </div>
    </div>
  );
}
