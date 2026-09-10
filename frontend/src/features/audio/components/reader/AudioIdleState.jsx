import { Headphones, ChevronRight } from 'lucide-react';
import { AudioBookIdentity } from './AudioBookIdentity';

/**
 * 2 — "Before Playback". Clicking Listen runs the existing
 * entitlement/access resolution (handleListenClick in ReaderPage) — it
 * does not itself decide taster/purchase/generate.
 *
 * No close control here (Visual Recovery brief §B) — the reference shows
 * none for idle/generating; the toolbar headphones button already toggles
 * the console open/closed, so a second dismiss control would be redundant.
 */
export function AudioIdleState({ book, chapterLabel, onListen }) {
  return (
    <div className="reader-audio-row reader-audio-row--idle">
      <AudioBookIdentity book={book} chapterLabel={chapterLabel} />
      <button type="button" className="reader-audio-listen-btn" onClick={onListen}>
        <Headphones size={18} strokeWidth={1.8} aria-hidden="true" />
        Listen
        <ChevronRight size={16} strokeWidth={2.25} className="reader-audio-listen-chevron" aria-hidden="true" />
      </button>
    </div>
  );
}
