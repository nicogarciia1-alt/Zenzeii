/**
 * @fileoverview Universal book card component for the Zenzeii Library.
 *
 * The single BookCard component used across all Library surfaces:
 * - 'shelf' variant: portrait card in horizontally scrolling shelves
 *   (replaces BookCardPlaceholder from Phase 4, everywhere it appeared)
 * - 'grid' variant: card in the catalog grid (Phase 6)
 * - 'compact' variant: minimal card for dense lists (Phase 7 search results)
 *
 * Composes BookCoverArt, MetadataBadge, and StarRating from Phase 2.
 *
 * Phase 5: static, no click-through navigation.
 * Phase 9: onCardClick opens BookDetailModal (deferred — book detail design pending).
 * Phase 10: the grid variant's "Add to Library" button is wired to
 * useImport. useImport is called unconditionally (Rules of Hooks — a
 * component can't call a hook only for some variants), but it's inert
 * until triggerImport() is actually invoked, which only ever happens
 * from the grid-variant button below.
 *
 * Root is <article>, not <button>, even though the whole card is
 * keyboard-actionable: the 'grid' variant nests real interactive
 * elements (Add to Library button, buy link) inside the card, and a
 * <button> can never legally contain another interactive control.
 * role="article" + manual tabIndex/onKeyDown makes the card
 * keyboard-actionable without that HTML validity violation.
 */
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';
import { BookCoverArt } from './BookCoverArt';
import { MetadataBadge } from './MetadataBadge';
import { StarRating } from './StarRating';
import { DIFFICULTY_LABELS } from '../../constants/libraryConstants';
import { useImport } from '../../hooks/useImport';

/**
 * Button presentation for each useImport status. Centralized here so the
 * JSX below only ever reads `buttonProps.*` — no scattered per-status
 * className branching to keep in sync.
 */
function getImportButtonProps(importStatus) {
  switch (importStatus) {
    case 'importing':
      return {
        label: 'Importing...',
        className: 'opacity-60 cursor-not-allowed border-library-border text-library-text-muted',
        disabled: true,
        icon: <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />,
      };
    case 'completed':
      return {
        label: 'In your library',
        className: 'bg-library-bg-shelf border-library-border text-library-text-secondary cursor-default',
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
          'border-library-border text-library-text-secondary hover:bg-library-bg-shelf hover:text-library-text-primary',
        disabled: false,
        icon: null,
      };
  }
}

/**
 * Class/behavior configuration for each BookCard variant. Add new
 * variants here — never in the JSX below. `supportsAddButton` is what
 * actually gates the "Add to Library" button (combined with the
 * showAddButton prop) — not a hardcoded `variant === 'grid'` check
 * scattered in JSX, so a future variant that wants the button only ever
 * needs a one-line change here.
 */
const VARIANT_CONFIG = {
  shelf: {
    container: 'flex flex-col gap-2 w-[120px]',
    coverSize: 'sm',
    titleClass: 'text-sm font-medium font-garamond line-clamp-2 text-library-text-primary',
    jpTitleClass: 'text-xs text-library-text-secondary line-clamp-1',
    showAuthor: false,
    showDifficulty: false,
    layout: 'vertical',
    supportsAddButton: false,
  },
  grid: {
    container: 'flex flex-col gap-2 w-[160px]',
    coverSize: 'md',
    titleClass: 'text-sm font-semibold font-garamond line-clamp-2 text-library-text-primary',
    jpTitleClass: 'text-xs text-library-text-secondary line-clamp-1',
    showAuthor: true,
    showDifficulty: true,
    layout: 'vertical',
    supportsAddButton: true,
  },
  compact: {
    container: 'flex flex-row gap-3 w-full',
    coverSize: 'sm',
    titleClass: 'text-sm font-medium font-garamond line-clamp-1 text-library-text-primary',
    jpTitleClass: 'text-xs text-library-text-secondary',
    showAuthor: true,
    showDifficulty: true,
    layout: 'horizontal',
    supportsAddButton: false,
  },
};

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogItem} props.book
 * @param {'shelf'|'grid'|'compact'} [props.variant] - Display variant (default: 'shelf')
 * @param {function} [props.onCardClick] - Called when card is clicked (Phase 9)
 * @param {boolean} [props.showAddButton] - Whether to show the add-to-library button (default: false)
 */
export function BookCard({ book, variant = 'shelf', onCardClick, showAddButton = false }) {
  const config = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.shelf;
  const isHorizontal = config.layout === 'horizontal';
  const navigate = useNavigate();

  const { importStatus, triggerImport } = useImport(
    book.id,
    ({ alreadyOwned } = {}) => {
      toast.success(alreadyOwned ? 'Already in your library' : `${book.title_en} added to your library`);
    },
    (message) => toast.error(message || 'Import failed'),
    book.is_on_shelf ? 'completed' : 'idle'
  );
  const buttonProps = getImportButtonProps(importStatus);

  // TODO: Phase 9 (deferred — book detail design pending) opens BookDetailModal here by default.
  const handleCardClick = () => {
    if (onCardClick) onCardClick(book);
  };

  const handleImportClick = (e) => {
    e.stopPropagation();
    triggerImport();
  };

  const handleReadNow = (e) => {
    e.stopPropagation();
    navigate(`/read/${book.id}`);
  };

  const detailsContent = (
    <>
      <div>
        <p className={config.titleClass}>{book.title_en}</p>
        <p className={config.jpTitleClass}>{book.title_jp}</p>
        {config.showAuthor && (
          <p className="text-xs text-library-text-muted line-clamp-1">{book.author_name}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {book.jlpt_level && (
          <MetadataBadge label={book.jlpt_level} variant="jlpt" ariaLabel={`JLPT level ${book.jlpt_level}`} />
        )}
        {config.showDifficulty && book.difficulty && (
          <MetadataBadge
            label={DIFFICULTY_LABELS[book.difficulty] ?? book.difficulty}
            variant="difficulty"
            ariaLabel={`Difficulty: ${DIFFICULTY_LABELS[book.difficulty] ?? book.difficulty}`}
          />
        )}
      </div>

      <StarRating rating={book.rating_avg} count={book.rating_count} size="sm" />

      {showAddButton && config.supportsAddButton && book.availability === 'free' && (
        <>
          <button
            type="button"
            onClick={handleImportClick}
            disabled={buttonProps.disabled}
            aria-live="polite"
            aria-label={`${book.title_en}: ${buttonProps.label}`}
            className={`mt-1 w-full text-xs rounded px-2 py-1.5 border transition-colors flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 ${buttonProps.className}`}
          >
            {buttonProps.icon}
            {buttonProps.label}
          </button>

          {importStatus === 'completed' && (
            <button
              type="button"
              onClick={handleReadNow}
              aria-label={`Read ${book.title_en} now`}
              className="w-full text-xs text-library-red hover:underline text-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
            >
              Read now →
            </button>
          )}
        </>
      )}

      {showAddButton && config.supportsAddButton && book.availability === 'buy' && book.buy_link && (
        <a
          href={book.buy_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Buy ${book.title_en} — opens external site`}
          className="mt-1 w-full text-xs rounded px-2 py-1.5 border border-library-border text-library-text-secondary hover:bg-library-bg-shelf text-center block transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
        >
          Buy →
        </a>
      )}
    </>
  );

  return (
    <article
      role="article"
      aria-label={`${book.title_en} by ${book.author_name}`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      tabIndex={0}
      className={`${config.container} group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 rounded`}
    >
      {/* Hover scales the cover only, via group-hover on this single wrapper — text below is untouched */}
      <div className={`${isHorizontal ? 'shrink-0' : ''} transition-transform duration-200 group-hover:scale-[1.02]`}>
        <BookCoverArt
          bookId={book.id}
          titleJp={book.title_jp}
          titleEn={book.title_en}
          authorJp={book.author_name_jp || book.author_name}
          coverImage={book.cover_image}
          size={config.coverSize}
        />
      </div>

      {isHorizontal ? (
        <div className="flex flex-col flex-1 gap-2 min-w-0">{detailsContent}</div>
      ) : (
        detailsContent
      )}
    </article>
  );
}
