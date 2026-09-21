import React from 'react';
import { AudioPlaybackState } from '@/features/audio/components/reader/AudioPlaybackState';
import { PREVIEW_BOOKS } from '../../data/previewBooks';
import '@/features/audio/styles/reader-audio-bar.css';

const noop = () => {};

/**
 * 03 — Listen: the real ReaderAudioBar playback state (identity, timeline,
 * speed, ±15, play), rendered with fixed props inside the bar's own dark
 * shell. Compact size overrides live in landing.css under .lp-listen.
 */
export default function ListenPreview() {
  return (
    <div className="lp-preview lp-listen">
      <div className="lp-listen__shell">
        <AudioPlaybackState
          book={PREVIEW_BOOKS.sangetsuki}
          chapterLabel="第一章"
          isPlaying={false}
          currentTime={756}
          duration={1856}
          playbackRate={1}
          isMuted={false}
          onPlayPause={noop}
          onSeek={noop}
          onSkipBack={noop}
          onSkipForward={noop}
          onPlaybackRateChange={noop}
          onToggleMute={noop}
          balance={null}
          onClose={noop}
        />
      </div>
    </div>
  );
}
