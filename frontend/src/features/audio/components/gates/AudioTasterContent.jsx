import * as Dialog from '@radix-ui/react-dialog';
import { AudioWaveform } from './AudioWaveform';

export function AudioTasterContent({ onPlayNow }) {
  return (
    <>
      <Dialog.Title className="audio-gate-headline">One free minute, yours to keep.</Dialog.Title>
      <Dialog.Description className="audio-gate-body">
        Hear the opening of this chapter — no commitment, no account required.
      </Dialog.Description>

      <div className="audio-taster-waveform">
        <AudioWaveform />
      </div>
      <p className="audio-taster-caption">A small taste of a larger world.</p>

      <button type="button" className="audio-taster-cta" onClick={onPlayNow}>
        Play now
      </button>
    </>
  );
}
