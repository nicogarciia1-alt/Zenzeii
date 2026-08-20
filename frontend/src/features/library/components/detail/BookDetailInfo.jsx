/**
 * @fileoverview Book detail page center column — genre label, titles,
 * author, description, metadata badges, rating, and primary actions.
 */
import { MetadataBadge } from '../books/MetadataBadge';
import { StarRating } from '../books/StarRating';
import { BookDetailActions } from './BookDetailActions';
import { DIFFICULTY_LABELS } from '../../constants/libraryConstants';
import { estimateReadingHours, resolveEntityNames } from '../../utils/libraryUtils';

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 * @param {ReturnType<typeof import('../../hooks/useTaxonomy').useTaxonomy>} props.taxonomy
 * @param {function} props.onImported - Called once the book is confirmed on the shelf
 */
export function BookDetailInfo({ book, taxonomy, onImported }) {
  const genreNames = resolveEntityNames(book.genre_ids, taxonomy.genres);
  const readingHours = estimateReadingHours(book.page_count);

  return (
    <div>
      {genreNames.length > 0 && (
        <p className="text-xs uppercase tracking-widest text-library-red font-medium mb-3">
          {genreNames.join(' · ')}
        </p>
      )}

      <h1 className="font-playfair text-5xl font-bold text-library-text-primary leading-tight mb-2">
        {book.title_en}
      </h1>

      <p className="font-garamond text-xl text-library-text-secondary mb-4">{book.title_jp}</p>

      <p className="text-base text-library-text-primary mb-6">
        {book.author_name}
        {book.author_name_jp && <span className="ml-2 text-library-text-secondary">{book.author_name_jp}</span>}
      </p>

      <p className="text-body text-library-text-secondary leading-relaxed mb-6 max-w-prose">
        {book.description_long || book.description_short || 'No description available.'}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {book.jlpt_level && <MetadataBadge label={book.jlpt_level} variant="jlpt" ariaLabel={`JLPT level ${book.jlpt_level}`} />}
        {book.difficulty && (
          <MetadataBadge
            label={DIFFICULTY_LABELS[book.difficulty] ?? book.difficulty}
            variant="difficulty"
            ariaLabel={`Difficulty: ${DIFFICULTY_LABELS[book.difficulty] ?? book.difficulty}`}
          />
        )}
        {readingHours != null && <MetadataBadge label={`~${readingHours}h read`} variant="time" icon="⏱" />}
      </div>

      <div className="mb-8">
        <StarRating rating={book.rating_avg} count={book.rating_count} size="md" />
      </div>

      <BookDetailActions book={book} onImported={onImported} />
    </div>
  );
}
