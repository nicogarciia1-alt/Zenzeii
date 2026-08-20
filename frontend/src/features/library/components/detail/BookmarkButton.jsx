/**
 * @fileoverview Bookmark toggle button for marking books for later.
 *
 * Saves marked state to backend via POST /api/books/{bookId}/mark (toggle).
 * Optimistic update: UI flips immediately, reverts on error. Independent
 * of the shelf — any published catalog book can be marked (product
 * decision, Phase 9). "Marked Books" profile section is a future task.
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bookmark } from 'lucide-react';
import { markBook } from '../../services/catalogApi';

/**
 * @param {Object} props
 * @param {string} props.bookId
 * @param {string} props.bookTitle - Used for the accessible label
 * @param {boolean} props.isMarked - Marked state from catalog data
 */
export function BookmarkButton({ bookId, bookTitle, isMarked }) {
  const [marked, setMarked] = useState(isMarked);
  const [pending, setPending] = useState(false);

  // Re-sync when navigating from one book's detail page to another —
  // BookDetailPage doesn't remount on a bookId param change, so local
  // state would otherwise carry over from the previous book.
  useEffect(() => {
    setMarked(isMarked);
  }, [bookId, isMarked]);

  const handleClick = async (e) => {
    e.stopPropagation();
    if (pending) return;

    const optimisticNext = !marked;
    setMarked(optimisticNext);
    setPending(true);

    try {
      const result = await markBook(bookId);
      setMarked(result.marked);
    } catch (err) {
      setMarked(!optimisticNext);
      toast.error('Could not update bookmark. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={marked}
      aria-label={marked ? `Remove ${bookTitle} from bookmarks` : `Bookmark ${bookTitle}`}
      className={`h-12 w-12 shrink-0 flex items-center justify-center rounded border transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 ${
        marked
          ? 'bg-library-filter-active border-library-border text-library-red'
          : 'border-library-border text-library-text-secondary hover:bg-library-bg-shelf'
      }`}
    >
      <Bookmark className="h-5 w-5" fill={marked ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  );
}
