/**
 * @fileoverview Reader toolbar trigger that opens/closes the audio bar.
 * Built directly on @radix-ui/react-tooltip (not the shadcn-wrapped
 * components/ui/tooltip.jsx) for the same reason as AudioGateModal: the
 * visual spec here is fully custom, and Radix supplies the a11y plumbing
 * (keyboard-accessible label, focus handling) without fighting Tailwind's
 * default tooltip classes.
 *
 * Presentational only — open/closed state and the toggle handler live in
 * the reader; this component never touches entitlement or playback state.
 */
import * as Tooltip from '@radix-ui/react-tooltip';
import { Headphones } from 'lucide-react';
import '../../styles/audio-toolbar.css';

export function AudioToolbarButton({ isOpen, onToggle }) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className="audio-toolbar-button"
            data-active={isOpen ? 'true' : 'false'}
            aria-label="Listen to this chapter"
            aria-expanded={isOpen}
            aria-controls="reader-audio-bar"
            onClick={onToggle}
          >
            <Headphones className="audio-toolbar-icon" size={21} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="bottom" sideOffset={7} className="audio-toolbar-tooltip">
            Listen to this chapter
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
