import { X } from 'lucide-react';
import { AudioBookIdentity } from './AudioBookIdentity';

/**
 * Quiet inline recovery state — not part of the brief's suggested file
 * list, added because generation can fail and the bar must not stay
 * stuck on "Generating…" (Screen 2 brief §27). Carries the same identity
 * block as idle/generating so the console doesn't drop back to a bare
 * strip on failure (Visual Recovery brief §A/§B).
 */
export function AudioErrorState({ book, chapterLabel, onRetry, onClose }) {
  return (
    <div className="reader-audio-row reader-audio-row--error">
      <AudioBookIdentity book={book} chapterLabel={chapterLabel} />
      <div className="reader-audio-error-group">
        <p className="reader-audio-error-message">
          We couldn't prepare the audio.{' '}
          <button type="button" className="reader-audio-retry-btn" onClick={onRetry}>
            Try again
          </button>
        </p>
        <button
          type="button"
          className="reader-audio-close-btn"
          onClick={onClose}
          aria-label="Close audio player"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
