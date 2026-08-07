/**
 * @fileoverview Hook for the Zenzeii book import flow.
 *
 * Manages the complete lifecycle: trigger import → poll status →
 * completed/failed/timeout. One hook instance per book card — importing
 * book A does not affect book B's state.
 *
 * Reuses importBook/getBookStatus from frontend/src/lib/api.js rather
 * than adding new calls to catalogApi.js. Three things were verified
 * directly against production before writing this, all of which
 * contradict the naive "just call the catalog API" approach:
 *
 * 1. POST /api/books/import needs the BARE book key, not the catalog id.
 *    {book_key: "aozora-kokoro", source: "aozora"} → 400 "Must provide
 *    valid book_key for Aozora". {book_key: "kokoro", source: "aozora"}
 *    works. Gutenberg is a different shape again — {gutenberg_id: 1342},
 *    no book_key/source — confirmed by triggering a real import.
 * 2. There is no "already_owned" status. The backend returns
 *    status: "completed" for both a fresh completion and an
 *    already-owned book; the only signal is the message field
 *    ("Book already in your library" vs "Book import started").
 * 3. GET /api/catalog/{book_id}'s import_status field does not update —
 *    polled it against a book mid-import and after completion; it
 *    stayed null throughout even as is_on_shelf flipped to true. Only
 *    GET /api/books/{book_id}/status (getBookStatus) reports live
 *    status — it's what HomePage.jsx's existing, working poll loop
 *    already uses.
 *
 * No Authorization header is set here or in lib/api.js's importBook —
 * AuthContext.js sets axios.defaults.headers.common['Authorization']
 * globally on login, so every axios call in the app already carries it.
 *
 * @param {string} bookId - The catalog book ID to import (e.g. "aozora-kokoro")
 * @param {function} [onComplete] - Called with { alreadyOwned } when import completes successfully
 * @param {function} [onError] - Called with a human-readable message when import fails
 * @param {'idle'|'completed'} [initialStatus] - Seed state — 'completed' for books already on the shelf (book.is_on_shelf)
 *
 * @returns {{
 *   importStatus: 'idle'|'importing'|'completed'|'failed',
 *   isImporting: boolean,
 *   triggerImport: function,
 *   reset: function,
 * }}
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { importBook, getBookStatus } from '@/lib/api';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40;

/**
 * Builds the /api/books/import payload for a catalog book id. See the
 * fileoverview above — the two sources take genuinely different shapes,
 * not just a different `source` value.
 */
function buildImportPayload(bookId) {
  if (bookId.startsWith('aozora-')) {
    return { book_key: bookId.slice('aozora-'.length), source: 'aozora' };
  }
  if (bookId.startsWith('gutenberg-')) {
    return { gutenberg_id: Number(bookId.slice('gutenberg-'.length)) };
  }
  // Unreachable from the Library's Add button in practice — it only
  // renders for availability === 'free' books, and every free book in
  // the catalog is aozora- or gutenberg-prefixed (verified against
  // production). Fails loudly rather than silently misfiring an import.
  throw new Error(`Unsupported import source for book id "${bookId}"`);
}

export function useImport(bookId, onComplete, onError, initialStatus = 'idle') {
  const [importStatus, setImportStatus] = useState(initialStatus);
  const pollRef = useRef(null);
  const pollCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  const startPolling = useCallback(() => {
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;

      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        stopPolling();
        setImportStatus('failed');
        onError?.('Import timed out. Please try again later.');
        return;
      }

      try {
        const { data } = await getBookStatus(bookId);
        if (data.status === 'completed') {
          stopPolling();
          setImportStatus('completed');
          onComplete?.({ alreadyOwned: false });
        } else if (data.status === 'failed') {
          stopPolling();
          setImportStatus('failed');
          onError?.('Import failed. Please try again.');
        }
        // 'importing' / 'preparing' → keep polling
      } catch (err) {
        // Network error during polling — don't abort, keep trying until MAX_POLL_ATTEMPTS
        console.warn('[useImport] Poll request failed, retrying:', err.message);
      }
    }, POLL_INTERVAL_MS);
  }, [bookId, onComplete, onError, stopPolling]);

  const triggerImport = useCallback(async () => {
    if (importStatus === 'importing' || importStatus === 'completed') return;

    setImportStatus('importing');

    try {
      const result = await importBook(buildImportPayload(bookId));

      if (result.data.status === 'completed') {
        // Instant completion — either already owned, or a very fast import.
        setImportStatus('completed');
        const alreadyOwned = /already/i.test(result.data.message ?? '');
        onComplete?.({ alreadyOwned });
        return;
      }

      // status === 'importing' → begin polling for real completion
      startPolling();
    } catch (err) {
      setImportStatus('failed');
      onError?.(err.response?.data?.detail || err.message || 'Failed to start import.');
    }
  }, [bookId, importStatus, onComplete, onError, startPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setImportStatus('idle');
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => stopPolling, [stopPolling]);

  return {
    importStatus,
    isImporting: importStatus === 'importing',
    triggerImport,
    reset,
  };
}
