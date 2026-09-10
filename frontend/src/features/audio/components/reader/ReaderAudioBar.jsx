import { forwardRef, useEffect, useState } from 'react';
import { AudioIdleState } from './AudioIdleState';
import { AudioGeneratingState } from './AudioGeneratingState';
import { AudioErrorState } from './AudioErrorState';
import { AudioPlaybackState } from './AudioPlaybackState';
import '../../styles/reader-audio-bar.css';

const EXIT_DURATION_MS = 220;

/**
 * @fileoverview The reader's bottom audio bar — one stable dark shell with
 * three (plus error) internal states: idle/listen, generating, playback.
 * This owns visual state composition only; the audio engine (entitlement,
 * generation, playback, balance) is owned by ReaderPage and passed in as
 * props. See the Screen 2 brief for the full spec this implements.
 *
 * Mount/unmount is delayed on close so the slide-down exit transition can
 * play — a conditionally-rendered element has no exit animation otherwise.
 */
export const ReaderAudioBar = forwardRef(function ReaderAudioBar(
  {
    isOpen,
    barState, // 'idle' | 'generating' | 'error' | 'playback'
    audioUrl,
    audioElRef,
    onTimeUpdate,
    onEnded,
    onPlay,
    onPause,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    balance,
    onListen,
    onPlayPause,
    onSeek,
    onPlaybackRateChange,
    onRetry,
    onClose,
  },
  ref
) {
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div
      ref={ref}
      id="reader-audio-bar"
      className="reader-audio-bar"
      data-visible={visible ? 'true' : 'false'}
    >
      <audio
        ref={audioElRef}
        src={audioUrl || undefined}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onPlay={onPlay}
        onPause={onPause}
      />

      <div className="reader-audio-state-content" key={barState}>
        {barState === 'idle' && <AudioIdleState onListen={onListen} onClose={onClose} />}
        {barState === 'generating' && <AudioGeneratingState onClose={onClose} />}
        {barState === 'error' && <AudioErrorState onRetry={onRetry} onClose={onClose} />}
        {barState === 'playback' && (
          <AudioPlaybackState
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            playbackRate={playbackRate}
            onPlayPause={onPlayPause}
            onSeek={onSeek}
            onPlaybackRateChange={onPlaybackRateChange}
            balance={balance}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
});
