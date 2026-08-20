/**
 * @fileoverview EPUB processing screen — shows import progress.
 *
 * Screen 3 of the acquisition flow. Polls GET /api/books/{bookId}/status
 * via usePollBookStatus (the shared poller extracted from useImport.js —
 * see that hook's fileoverview) until the upload started by EpubUploadZone
 * completes. Same 3s interval / 40-attempt (2 minute) timeout as the
 * catalog import flow.
 *
 * Progress is intentionally indeterminate — the backend only reports
 * importing/completed/failed, never a percentage, so a spinning ring
 * communicates real state instead of fabricating one.
 *
 * Botanical decoration reused verbatim from QuizPromptCard.jsx.
 */
import { useEffect } from 'react';
import { usePollBookStatus } from '../../hooks/usePollBookStatus';

/**
 * @param {Object} props
 * @param {string} props.bookId - The book ID returned by uploadBook()
 * @param {string} props.fileName - The original filename (e.g. "Kokoro.epub")
 * @param {function} props.onComplete - Called when import status === 'completed'
 * @param {function} props.onError - Called with a message when import fails or times out
 */
export function EpubProcessing({ bookId, fileName, onComplete, onError }) {
  const { startPolling, stopPolling } = usePollBookStatus(onComplete, onError);

  useEffect(() => {
    startPolling(bookId);
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  return (
    <div className="relative">
      <div className="relative w-24 h-24 mx-auto mb-6">
        <svg className="animate-spin" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="#F5F3EF" strokeWidth="8" />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="#C0392B"
            strokeWidth="8"
            strokeDasharray="251"
            strokeDashoffset="188"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h2 className="font-playfair text-2xl text-center mb-2">Importing your book</h2>
      <p className="text-sm font-medium text-library-text-primary text-center mb-1">Processing {fileName}</p>
      <p className="text-xs text-library-text-muted text-center mb-8 max-w-xs mx-auto">
        Analysing content, generating indexes, and preparing your reading experience...
      </p>
      <p className="text-xs text-library-text-muted text-center">
        You can close this window. We&apos;ll notify you when it&apos;s ready.
      </p>

      <svg
        aria-hidden="true"
        viewBox="0 0 80 80"
        className="absolute bottom-2 right-2 w-[70px] h-[70px] stroke-library-border pointer-events-none"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M15 75 Q 35 55 30 20" />
        <path d="M30 40 Q 48 34 55 15" />
        <path d="M25 55 Q 8 50 5 62" />
      </svg>
    </div>
  );
}
