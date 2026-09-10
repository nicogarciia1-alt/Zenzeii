import { Headphones, X } from 'lucide-react';

/**
 * 2A — sparse "Listen" state. Clicking Listen runs the existing
 * entitlement/access resolution (handleListenClick in ReaderPage) — it
 * does not itself decide taster/purchase/generate.
 */
export function AudioIdleState({ onListen, onClose }) {
  return (
    <div className="reader-audio-row reader-audio-row--idle">
      <button type="button" className="reader-audio-listen-btn" onClick={onListen}>
        <Headphones size={18} strokeWidth={1.8} aria-hidden="true" />
        Listen
      </button>
      <button
        type="button"
        className="reader-audio-close-btn"
        onClick={onClose}
        aria-label="Close audio player"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
