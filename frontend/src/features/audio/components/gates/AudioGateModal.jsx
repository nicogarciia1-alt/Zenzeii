/**
 * @fileoverview Shared shell for the audio taster/purchase modals.
 * Built directly on @radix-ui/react-dialog (not the shadcn-wrapped
 * components/ui/dialog.jsx) for the same reason as ToshokanGateModal:
 * the visual spec here is fully custom. Radix supplies the a11y
 * plumbing — role="dialog"/aria-modal, focus trap, Escape-to-close,
 * focus return to trigger, body scroll lock — none of it reimplemented.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { AUDIO_GATE } from '../../constants/audioGateTypes';
import { AudioTasterContent } from './AudioTasterContent';
import { AudioPurchaseContent } from './AudioPurchaseContent';
import '../../styles/audio-gates.css';

export function AudioGateModal({ open, gateType, onClose, onPlayNow }) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="audio-gate-backdrop" />
        <Dialog.Content
          className={`audio-gate-modal${gateType === AUDIO_GATE.PURCHASE ? ' audio-gate-modal--purchase' : ''}`}
        >
          <Dialog.Close asChild>
            <button type="button" className="audio-gate-close" aria-label="Close">
              <X size={18} aria-hidden="true" />
            </button>
          </Dialog.Close>

          {gateType === AUDIO_GATE.TASTER && <AudioTasterContent onPlayNow={onPlayNow} />}
          {gateType === AUDIO_GATE.PURCHASE && <AudioPurchaseContent />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
