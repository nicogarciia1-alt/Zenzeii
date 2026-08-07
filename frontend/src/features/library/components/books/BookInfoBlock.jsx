/**
 * @fileoverview Book information block for the recommendation card.
 *
 * Renders the complete right-side content of a RecommendationCard:
 * label, titles, author, description, metadata, rating, and action
 * buttons. Composes MetadataBadge and StarRating.
 */
import { Bookmark } from 'lucide-react';
import { MetadataBadge } from './MetadataBadge';
import { StarRating } from './StarRating';
import { DIFFICULTY_LABELS } from '../../constants/libraryConstants';
import { estimateReadingHours } from '../../utils/libraryUtils';

// TODO: Phase 9 (deferred — book detail design pending) opens the detail modal here.
const DEFAULT_VIEW_DETAILS = () => {};
// TODO: wiring real shelf/import state here needs RecommendationSection off
// its hardcoded mock book first — see RecommendationSection.jsx.
const DEFAULT_BOOKMARK = () => {};

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogItem} props.book
 * @param {function} [props.onViewDetails] - Called when "View Details" is clicked
 * @param {function} [props.onBookmark] - Called when bookmark icon is clicked
 * @param {boolean} [props.isBookmarked] - Whether the book is on the user's shelf
 */
export function BookInfoBlock({ book, onViewDetails = DEFAULT_VIEW_DETAILS, onBookmark = DEFAULT_BOOKMARK, isBookmarked = false }) {
  const readingHours = estimateReadingHours(book.page_count);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest text-library-red font-medium">Recommended</p>

      <div>
        <h3 className="font-playfair text-h3 text-library-text-primary">
          {book.title_en}
        </h3>
        <p className="font-garamond text-sm text-library-text-secondary mt-0.5">{book.title_jp}</p>
      </div>

      <p className="text-sm text-library-text-secondary/80">
        {book.author_name}
        {book.author_name_jp ? ` ${book.author_name_jp}` : ''}
      </p>

      {book.description_short && (
        <p className="text-sm text-library-text-secondary leading-loose line-clamp-3">
          {book.description_short}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {book.jlpt_level && <MetadataBadge label={book.jlpt_level} variant="jlpt" />}
        {book.difficulty && (
          <MetadataBadge label={DIFFICULTY_LABELS[book.difficulty] ?? book.difficulty} variant="difficulty" />
        )}
        {readingHours != null && <MetadataBadge label={`~${readingHours}h`} variant="time" icon="⏱" />}
      </div>

      <StarRating rating={book.rating_avg} count={book.rating_count} size="sm" />

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => onViewDetails(book)}
          aria-label={`View details for ${book.title_en}`}
          className="flex-1 h-12 border border-library-border text-library-text-primary hover:bg-library-bg-shelf px-spacing-3 rounded text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
        >
          View Details
        </button>
        <button
          type="button"
          onClick={() => onBookmark(book)}
          aria-label={isBookmarked ? 'Remove from library' : `Add ${book.title_en} to your library`}
          className="shrink-0 border border-library-border text-library-text-secondary hover:text-library-red hover:border-library-red p-spacing-2 rounded transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
        >
          <Bookmark className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
