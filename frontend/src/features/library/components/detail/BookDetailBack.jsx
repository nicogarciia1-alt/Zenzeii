/**
 * @fileoverview "Back to all books" navigation for the book detail page.
 * Uses navigate(-1) rather than a hardcoded /library link, so it returns
 * to whatever Library state (filters, scroll position, search) the user
 * actually came from.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function BookDetailBack() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-2 text-sm text-library-text-secondary hover:text-library-text-primary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 rounded"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to all books
    </button>
  );
}
