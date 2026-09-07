/**
 * @fileoverview Reusable import/add-to-library button.
 *
 * Single owner of useImport's state machine for the whole Library feature —
 * BookCard's grid variant and the book detail page both render through this
 * component now, so there is exactly one place that decides what "idle /
 * importing / completed / failed" looks like. useImport itself only ever
 * reports those four states (see hooks/useImport.js) — there is no separate
 * "already_owned" status from the backend, just a `message` string on
 * completion, so both a fresh import and an already-owned book converge on
 * 'completed' here.
 *
 * variant="grid" reproduces Phase 10's BookCard behavior byte-for-byte
 * (small outlined button, "In your library" stays disabled with a separate
 * "Read now →" link beneath it) — the brief calls this out explicitly as
 * "existing Phase 10 behavior", not a new design.
 * variant="detail"/"sticky" is Phase 9's new large button, where the button
 * itself becomes the "Read Now" action once completed — no separate link.
 *
 * Only availability === 'free' books go through the import flow at all.
 * 'buy' renders the existing external buy link instead (same as BookCard's
 * grid variant already does); 'upload' has no action here — it isn't
 * ownable through this flow, and Phase 9's brief has no spec for it, so it
 * renders nothing rather than a button that would silently fail.
 *
 * The book detail page mounts two separate ImportButton instances at once
 * (BookDetailActions in the hero, BookDetailStickyBar) — each with its own
 * independent useImport hook, since useImport has no cross-instance state.
 * Completing the import in one would leave the other showing stale 'idle'
 * with no signal to update. `book.is_on_shelf` (lifted to shared page state
 * via onImported) is layered on top of useImport's own status as the
 * source of truth for "should this render as owned" — once either instance
 * reports success, both immediately reflect it.
 */
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Check, BookPlus, BookOpen } from 'lucide-react';
import { useImport } from '../../hooks/useImport';
import { useToshokanGate } from '@/features/toshokan/context/ToshokanGateContext';
import { TOSHOKAN_GATE } from '@/features/toshokan/constants/toshokanGates';

/** Phase 10's grid-variant button presentation — moved here verbatim from BookCard.jsx. */
function getGridButtonProps(importStatus) {
  switch (importStatus) {
    case 'importing':
      return {
        label: 'Importing...',
        className: 'opacity-60 cursor-not-allowed border-library-border/40 text-library-text-muted',
        disabled: true,
        icon: <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />,
      };
    case 'completed':
      return {
        label: 'In your library',
        className: 'bg-library-bg-shelf border-library-border/40 text-library-text-secondary cursor-default',
        disabled: true,
        icon: <Check className="h-3 w-3" aria-hidden="true" />,
      };
    case 'failed':
      return {
        label: 'Try again',
        className: 'border-red-300 text-red-600 hover:bg-red-50',
        disabled: false,
        icon: null,
      };
    default: // 'idle'
      return {
        label: '+ Add to Library',
        className:
          'border-library-border/40 text-library-text-secondary hover:bg-library-bg-shelf hover:text-library-text-primary',
        disabled: false,
        icon: null,
      };
  }
}

/** Phase 9's large detail/sticky button presentation. */
function getDetailButtonProps(importStatus) {
  switch (importStatus) {
    case 'importing':
      return {
        label: 'Adding...',
        className: 'bg-library-red text-white opacity-80 cursor-not-allowed',
        disabled: true,
        icon: <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />,
      };
    case 'completed':
      return {
        label: 'Read Now',
        className: 'bg-library-red text-white hover:bg-library-red-hover',
        disabled: false,
        icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
      };
    case 'failed':
      return {
        label: 'Try Again',
        className: 'bg-transparent border border-library-red text-library-red hover:bg-library-red/5',
        disabled: false,
        icon: null,
      };
    default: // 'idle'
      return {
        label: 'Add to My Books',
        className: 'bg-library-red text-white hover:bg-library-red-hover',
        disabled: false,
        icon: <BookPlus className="h-4 w-4" aria-hidden="true" />,
      };
  }
}

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail|import('../../types/catalogTypes').BookCatalogItem} props.book
 * @param {'detail'|'sticky'|'grid'} [props.variant]
 * @param {function} [props.onImported] - Called once the book is confirmed on the shelf (fresh import or already-owned)
 */
export function ImportButton({ book, variant = 'detail', onImported }) {
  const navigate = useNavigate();
  const { openGate } = useToshokanGate();

  const { importStatus: hookStatus, triggerImport } = useImport(
    book.id,
    ({ alreadyOwned } = {}) => {
      toast.success(alreadyOwned ? 'Already in your library' : `${book.title_en} added to your library`);
      onImported?.();
    },
    (message) => toast.error(message || 'Import failed'),
    book.is_on_shelf ? 'completed' : 'idle',
    () => openGate(TOSHOKAN_GATE.LIBRARY_LIMIT)
  );
  // book.is_on_shelf can flip true from a sibling ImportButton instance
  // completing its own separate useImport hook (see fileoverview) — that
  // update reaches this instance through the book prop, not through
  // hookStatus, so it's layered on top rather than replacing it.
  const importStatus = book.is_on_shelf ? 'completed' : hookStatus;

  if (book.availability === 'buy') {
    if (!book.buy_link) return null;
    const buyClass =
      variant === 'grid'
        ? 'mt-1 w-full text-xs rounded px-2 py-1.5 border border-library-border/40 text-library-text-secondary hover:bg-library-bg-shelf text-center block transition-colors duration-fast'
        : 'h-12 px-6 rounded border border-library-border text-library-text-primary hover:bg-library-bg-shelf text-sm font-medium flex items-center justify-center transition-colors duration-fast';
    return (
      <a
        href={book.buy_link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Buy ${book.title_en} — opens external site`}
        className={`${buyClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2`}
      >
        Buy →
      </a>
    );
  }

  if (book.availability === 'upload') return null;

  const handleImportClick = (e) => {
    e.stopPropagation();
    triggerImport();
  };

  if (variant === 'grid') {
    const buttonProps = getGridButtonProps(importStatus);
    return (
      <>
        <button
          type="button"
          onClick={handleImportClick}
          disabled={buttonProps.disabled}
          aria-live="polite"
          aria-label={`${book.title_en}: ${buttonProps.label}`}
          className={`mt-1 w-full text-xs rounded px-2 py-1.5 border transition-colors duration-fast flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 ${buttonProps.className}`}
        >
          <span key={importStatus} className="flex items-center gap-1 animate-in fade-in-0 duration-200">
            {buttonProps.icon}
            {buttonProps.label}
          </span>
        </button>

        {importStatus === 'completed' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/read/${book.id}`);
            }}
            aria-label={`Read ${book.title_en} now`}
            className="w-full text-xs text-library-red hover:underline text-center rounded transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
          >
            Read now →
          </button>
        )}
      </>
    );
  }

  // variant === 'detail' | 'sticky'
  const buttonProps = getDetailButtonProps(importStatus);
  const handleClick = (e) => {
    e.stopPropagation();
    if (importStatus === 'completed') {
      navigate(`/read/${book.id}`);
      return;
    }
    triggerImport();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={buttonProps.disabled}
      aria-live="polite"
      aria-label={`${book.title_en}: ${buttonProps.label}`}
      className={`h-12 px-6 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 ${buttonProps.className}`}
    >
      <span key={importStatus} className="flex items-center gap-2 animate-in fade-in-0 duration-200">
        {buttonProps.icon}
        {buttonProps.label}
      </span>
    </button>
  );
}
