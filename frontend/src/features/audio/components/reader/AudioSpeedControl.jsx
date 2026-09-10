import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown } from 'lucide-react';

const RATES = [0.75, 1, 1.5];

/**
 * Compact "1× ⌄" playback-speed selector (2c reference). Built directly on
 * @radix-ui/react-dropdown-menu — same rationale as AudioGateModal/AudioToolbarButton:
 * the visual spec is fully custom, Radix supplies the a11y plumbing (roving
 * focus, Escape, outside-click) without fighting default menu styling.
 */
export function AudioSpeedControl({ playbackRate, onPlaybackRateChange }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="reader-audio-speed-trigger"
          aria-label={`Playback speed, ${playbackRate}×`}
        >
          {playbackRate}×
          <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="reader-audio-speed-menu" side="top" align="start" sideOffset={8}>
          {RATES.map((rate) => (
            <DropdownMenu.Item
              key={rate}
              className="reader-audio-speed-item"
              data-active={playbackRate === rate ? 'true' : 'false'}
              onSelect={() => onPlaybackRateChange(rate)}
            >
              {rate}×
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
