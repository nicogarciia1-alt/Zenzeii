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
 * Phase 9: clicking any card variant navigates to /library/:bookId
 * (BookDetailPage). No parent ever passed an onCardClick prop before this
 * phase — navigation lives directly in BookCard now rather than through an
 * indirection nothing used.
 * Phase 10/9: the grid variant's "Add to Library" button — and Phase 9's
 * detail/sticky buttons — are now all owned by the shared ImportButton
 * component (see detail/ImportButton.jsx), so useImport's state machine is
 * wired in exactly one place across the whole Library feature.
 *
 * Root is <article>, not <button>, even though the whole card is
 * keyboard-actionable: the 'grid' variant nests real interactive
 * elements (Add to Library button, buy link) inside the card, and a
 * <button> can never legally contain another interactive control.
 * role="article" + manual tabIndex/onKeyDown makes the card
 * keyboard-actionable without that HTML validity violation.
 */
import { useNavigate } from 'react-router-dom';
import { BookCoverArt } from './BookCoverArt';
import { MetadataBadge } from './MetadataBadge';
import { StarRating } from './StarRating';
import { DIFFICULTY_LABELS } from '../../constants/libraryConstants';
import { ImportButton } from '../detail/ImportButton';

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
    container:
      'flex flex-col gap-2 w-[160px] shadow-library-card-sm hover:shadow-library-card hover:-translate-y-0.5 transition-all duration-base',
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
 * @param {boolean} [props.showAddButton] - Whether to show the add-to-library button (default: false)
 */
export function BookCard({ book, variant = 'shelf', showAddButton = false }) {
  const config = VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.shelf;
  const isHorizontal = config.layout === 'horizontal';
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/library/${book.id}`);
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

      {showAddButton && config.supportsAddButton && (
        <ImportButton book={book} variant="grid" />
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
          titleRomaji={book.title_romaji}
          authorJp={book.author_name_jp}
          authorRomaji={book.author_name}
          coverImage={book.cover_image}
          size={config.coverSize}
          genre_ids={book.genre_ids}
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
