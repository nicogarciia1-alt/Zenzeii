import { AudioBookIdentity } from './AudioBookIdentity';

/**
 * 2b — "Generating". Same console, same identity block as idle; only the
 * right-hand action region transitions (Listen → spinner + label). No
 * close control here — see AudioIdleState for why.
 */
export function AudioGeneratingState({ book, chapterLabel }) {
  return (
    <div className="reader-audio-row reader-audio-row--generating">
      <AudioBookIdentity book={book} chapterLabel={chapterLabel} />
      <div className="reader-audio-generating">
        <span className="reader-audio-spinner" aria-hidden="true" />
        Generating…
      </div>
    </div>
  );
}
