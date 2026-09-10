import { X } from 'lucide-react';

export function AudioGeneratingState({ onClose }) {
  return (
    <div className="reader-audio-row reader-audio-row--generating">
      <div className="reader-audio-generating">
        <span className="reader-audio-spinner" aria-hidden="true" />
        Generating…
      </div>
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
