/**
 * @fileoverview Hook for fetching a single book's full catalog detail.
 * Used by BookDetailPage.
 *
 * @param {string} bookId - Canonical book ID (e.g. "aozora-kokoro")
 * @returns {{
 *   book: import('../types/catalogTypes').BookCatalogDetail|null,
 *   loading: boolean,
 *   error: string|null,
 *   setBook: function,
 * }}
 */
import { useEffect, useState } from 'react';
import { fetchBookById } from '../services/catalogApi';

export function useBookDetail(bookId) {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchBookById(bookId)
      .then((data) => {
        if (cancelled) return;
        setBook(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.status === 404
            ? 'This book could not be found.'
            : 'Something went wrong loading this book. Please try again.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookId]);

  return { book, loading, error, setBook };
}
