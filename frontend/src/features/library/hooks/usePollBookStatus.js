/**
 * @fileoverview Generic book-import-status poller.
 *
 * Extracted from useImport.js's inline setInterval loop, which mixed two
 * concerns: (1) triggering an import via POST /api/books/import — specific
 * to catalog books with an aozora-/gutenberg- prefixed id — and (2) polling
 * GET /api/books/{bookId}/status until it resolves. Only the second half
 * applies to the acquisition flow's EPUB upload: POST /api/books/upload
 * already starts the import as a side effect of the upload request itself,
 * so there is nothing analogous to trigger — just a bookId to poll.
 *
 * useImport now calls this hook internally for its post-trigger polling
 * (see useImport.js), and EpubProcessing.jsx calls it directly with the
 * bookId returned from uploadBook(). Same 3s interval / 40-attempt (2
 * minute) timeout in both places — one constant, not two copies of "40".
 *
 * @param {function} onComplete - Called with no args when status === 'completed'
 * @param {function} onError - Called with a human-readable message on failure/timeout
 * @returns {{
 *   startPolling: (bookId: string) => void,
 *   stopPolling: () => void,
 * }}
 */
import { useCallback, useEffect, useRef } from 'react';
import { getBookStatus } from '@/lib/api';

export const POLL_INTERVAL_MS = 3000;
export const MAX_POLL_ATTEMPTS = 40;

export function usePollBookStatus(onComplete, onError) {
  const pollRef = useRef(null);
  const pollCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  const startPolling = useCallback(
    (bookId) => {
      stopPolling();
      pollCountRef.current = 0;
      pollRef.current = setInterval(async () => {
        pollCountRef.current += 1;

        if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
          stopPolling();
          onError?.('Import timed out. Please try again later.');
          return;
        }

        try {
          const { data } = await getBookStatus(bookId);
          if (data.status === 'completed') {
            stopPolling();
            onComplete?.();
          } else if (data.status === 'failed') {
            stopPolling();
            onError?.('Import failed. Please try again.');
          }
          // 'importing' / 'preparing' → keep polling
        } catch (err) {
          // Network error during polling — don't abort, keep trying until MAX_POLL_ATTEMPTS
          console.warn('[usePollBookStatus] Poll request failed, retrying:', err.message);
        }
      }, POLL_INTERVAL_MS);
    },
    [onComplete, onError, stopPolling]
  );

  useEffect(() => stopPolling, [stopPolling]);

  return { startPolling, stopPolling };
}
