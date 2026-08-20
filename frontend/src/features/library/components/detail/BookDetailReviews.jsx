/**
 * @fileoverview Reviews tab — aggregate rating display, 5-star submission,
 * and a real per-star distribution (backend-computed, not estimated — see
 * catalog_service.get_rating_distribution).
 *
 * One rating per user per book (upsert), same as the backend's contract.
 * Submitting updates the book's displayed rating_avg/rating_count/
 * distribution optimistically via onBookUpdate, so the page doesn't need
 * a full refetch after rating.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { StarRating } from '../books/StarRating';
import { rateBook } from '../../services/catalogApi';

const STAR_VALUES = [1, 2, 3, 4, 5];

function DistributionBar({ starValue, count, total }) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs text-library-text-muted">
      <span className="w-8 shrink-0">{starValue}★</span>
      <div className="flex-1 h-1.5 rounded-full bg-library-bg-shelf overflow-hidden">
        <div className="h-full bg-library-star" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right">{percent}%</span>
    </div>
  );
}

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 * @param {function} props.onBookUpdate - Receives a partial update to merge into the book state
 */
export function BookDetailReviews({ book, onBookUpdate }) {
  const [submitting, setSubmitting] = useState(false);
  const [hoverValue, setHoverValue] = useState(0);

  const handleRate = async (value) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await rateBook(book.id, value);
      onBookUpdate({
        rating_avg: result.rating_avg,
        rating_count: result.rating_count,
        rating_distribution: result.rating_distribution,
        my_rating: result.my_rating,
      });
      toast.success('Thanks for rating this book');
    } catch (err) {
      toast.error('Could not submit your rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (book.rating_count === 0) {
    return (
      <div className="py-8">
        <RatingSubmission book={book} hoverValue={hoverValue} setHoverValue={setHoverValue} onRate={handleRate} submitting={submitting} />
        <p className="text-library-text-muted text-center py-12">Be the first to rate this book.</p>
      </div>
    );
  }

  return (
    <div className="py-8 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-12">
      <div className="flex flex-col items-center md:items-start gap-2">
        <p className="font-playfair text-5xl text-library-text-primary">{book.rating_avg.toFixed(1)}</p>
        <StarRating rating={book.rating_avg} size="lg" />
        <p className="text-sm text-library-text-muted">
          {book.rating_count} rating{book.rating_count === 1 ? '' : 's'}
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-md">
        <div className="flex flex-col gap-1.5">
          {[...STAR_VALUES].reverse().map((value) => (
            <DistributionBar
              key={value}
              starValue={value}
              count={book.rating_distribution?.[String(value)] ?? 0}
              total={book.rating_count}
            />
          ))}
        </div>

        <RatingSubmission book={book} hoverValue={hoverValue} setHoverValue={setHoverValue} onRate={handleRate} submitting={submitting} />
      </div>
    </div>
  );
}

function RatingSubmission({ book, hoverValue, setHoverValue, onRate, submitting }) {
  const activeValue = hoverValue || book.my_rating || 0;

  return (
    <div className="pt-2">
      {book.my_rating != null && (
        <p className="text-xs uppercase tracking-wide text-library-text-muted mb-1.5">Your rating</p>
      )}
      <div className="flex items-center gap-1" onMouseLeave={() => setHoverValue(0)}>
        {STAR_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            disabled={submitting}
            onClick={() => onRate(value)}
            onMouseEnter={() => setHoverValue(value)}
            aria-label={`Rate ${value} out of 5 stars`}
            className="p-0.5 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 rounded"
          >
            <Star
              className="w-6 h-6 text-library-star transition-transform duration-fast hover:scale-110"
              fill={value <= activeValue ? 'currentColor' : 'none'}
              strokeWidth={value <= activeValue ? 0 : 1.5}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
