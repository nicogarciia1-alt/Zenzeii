import { Play, Pause, X } from 'lucide-react';
import { AudioProgress } from './AudioProgress';

const RATES = [0.75, 1, 1.5];

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 2C — full playback controls. Hierarchy: play -> progress -> time ->
 * speed -> balance -> close (Screen 2 brief §14). `balance` is passed in
 * as a rendered node (either the healthy-balance label or the existing
 * AudioLowBalancePill) so entitlement/formatting logic isn't duplicated
 * here — see ReaderPage.
 */
export function AudioPlaybackState({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  onPlayPause,
  onSeek,
  onPlaybackRateChange,
  balance,
  onClose,
}) {
  return (
    <div className="reader-audio-playback">
      <button
        type="button"
        className="reader-audio-playpause-btn"
        onClick={onPlayPause}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={19} aria-hidden="true" /> : <Play size={19} aria-hidden="true" />}
      </button>

      <AudioProgress currentTime={currentTime} duration={duration} onSeek={onSeek} />

      <span className="reader-audio-time">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <div className="reader-audio-rates" role="group" aria-label="Playback speed">
        {RATES.map((rate) => (
          <button
            key={rate}
            type="button"
            className="reader-audio-rate-btn"
            data-active={playbackRate === rate ? 'true' : 'false'}
            onClick={() => onPlaybackRateChange(rate)}
          >
            {rate}×
          </button>
        ))}
      </div>

      <div className="reader-audio-balance-slot">{balance}</div>

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
