import { Play, Pause, X, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react';
import { AudioBookIdentity } from './AudioBookIdentity';
import { AudioSpeedControl } from './AudioSpeedControl';
import { AudioProgress } from './AudioProgress';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * 2c — full playback controls, per the Visual Recovery brief's reference
 * (§D): identity block + balance/close on top, timeline row, then
 * speed / ±15 / play-pause / ±15 / volume on the bottom row. `balance` is
 * passed in as a rendered node (healthy label or the existing
 * AudioLowBalancePill) — entitlement/formatting logic isn't duplicated
 * here, see ReaderPage.
 */
export function AudioPlaybackState({
  book,
  chapterLabel,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  isMuted,
  onPlayPause,
  onSeek,
  onSkipBack,
  onSkipForward,
  onPlaybackRateChange,
  onToggleMute,
  balance,
  onClose,
}) {
  return (
    <div className="reader-audio-playback">
      <div className="reader-audio-playback-top">
        <AudioBookIdentity book={book} chapterLabel={chapterLabel} />
        <div className="reader-audio-playback-status">
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
      </div>

      <div className="reader-audio-timeline">
        <span className="reader-audio-time reader-audio-time--start">{formatTime(currentTime)}</span>
        <AudioProgress currentTime={currentTime} duration={duration} onSeek={onSeek} />
        <span className="reader-audio-time reader-audio-time--end">{formatTime(duration)}</span>
      </div>

      <div className="reader-audio-controls-row">
        <AudioSpeedControl playbackRate={playbackRate} onPlaybackRateChange={onPlaybackRateChange} />

        <button
          type="button"
          className="reader-audio-skip-btn"
          onClick={onSkipBack}
          aria-label="Back 15 seconds"
        >
          <RotateCcw size={17} strokeWidth={1.9} aria-hidden="true" />
          <span aria-hidden="true">15</span>
        </button>

        <button
          type="button"
          className="reader-audio-playpause-btn"
          onClick={onPlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </button>

        <button
          type="button"
          className="reader-audio-skip-btn"
          onClick={onSkipForward}
          aria-label="Forward 15 seconds"
        >
          <RotateCw size={17} strokeWidth={1.9} aria-hidden="true" />
          <span aria-hidden="true">15</span>
        </button>

        <button
          type="button"
          className="reader-audio-volume-btn"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
