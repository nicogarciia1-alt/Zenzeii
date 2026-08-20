/**
 * @fileoverview "Get this book" CTA for non-free catalog books (availability="buy").
 *
 * Opens AcquisitionModal when clicked. "Read now" state is derived from
 * book.linked_upload_status rather than a caller-supplied prop — both
 * BookDetailActions and BookDetailStickyBar render this component for the
 * same book, so deriving from the book object keeps them in sync with a
 * single source of truth instead of each computing it themselves.
 *
 * linked_upload_id is a separate book record from this catalog book's own
 * id (see AcquisitionModal's fileoverview) — "Read now" opens that record,
 * not book.id.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, BookOpen } from 'lucide-react';
import { AcquisitionModal } from './AcquisitionModal';

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 * @param {'detail'|'sticky'} [props.variant] - Accepted for call-site parity with ImportButton; unused — detail and sticky render identically here, same as ImportButton's own non-grid branch
 * @param {function} [props.onImported] - Bubbled up from AcquisitionModal once an EPUB import completes
 */
export function AcquisitionButton({ book, onImported }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const isImported = book.linked_upload_status === 'completed' && !!book.linked_upload_id;

  const handleClick = (e) => {
    e.stopPropagation();
    if (isImported) {
      navigate(`/read/${book.linked_upload_id}`);
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={`${book.title_en}: ${isImported ? 'Read now' : 'Get this book'}`}
        className="h-12 px-6 rounded bg-library-red text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-library-red-hover transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
      >
        {isImported ? (
          <>
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Read now
          </>
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Get this book
          </>
        )}
      </button>

      <AcquisitionModal isOpen={isOpen} onClose={() => setIsOpen(false)} book={book} onImported={onImported} />
    </>
  );
}
