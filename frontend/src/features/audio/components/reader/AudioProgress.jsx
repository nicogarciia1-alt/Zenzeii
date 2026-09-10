/**
 * @fileoverview Seek control for the reader audio bar. The prior bar used a
 * clickable <div> with no keyboard support; this is a semantic range input
 * so seeking works with mouse, touch, and keyboard/screen-reader users alike.
 */
export function AudioProgress({ currentTime, duration, onSeek }) {
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <input
      type="range"
      className="reader-audio-progress"
      aria-label="Audio position"
      min={0}
      max={duration || 0}
      step={0.01}
      value={Math.min(currentTime, duration || 0)}
      disabled={!duration}
      onChange={(e) => onSeek(parseFloat(e.target.value))}
      style={{ '--progress-pct': `${pct}%` }}
    />
  );
}
