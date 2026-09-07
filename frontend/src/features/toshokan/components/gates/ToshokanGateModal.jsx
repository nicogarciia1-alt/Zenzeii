/**
 * @fileoverview Shared shell for all three Toshokan Pass gate moments.
 * One modal system, variant-specific content swapped by `gate.type` — see
 * toshokanGates.js for the type enum and copy, and
 * features/toshokan/styles/toshokan-gates.css for the visual spec.
 *
 * Built on @radix-ui/react-dialog directly (not the shadcn-wrapped
 * components/ui/dialog.jsx) because the visual spec here — ivory shell,
 * custom overlay, custom sizing/timing — diverges from that wrapper's
 * baked-in Tailwind styling. Radix still supplies everything the brief's
 * interaction section asks for: role="dialog"/aria-modal, focus trap,
 * Escape-to-close, focus returned to the trigger on close, and body
 * scroll lock — none of that is reimplemented here.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { TOSHOKAN_GATE, TOSHOKAN_GATE_COPY } from '../../constants/toshokanGates';
import { ToshokanPassCard } from '../ToshokanPassCard';
import { GateModalHeader } from './GateModalHeader';
import { GateModalCTA } from './GateModalCTA';
import { LibraryLimitPreview } from './LibraryLimitPreview';
import { CuratedCollectionPreview } from './CuratedCollectionPreview';
import { AskZenzeiiLimitPreview } from './AskZenzeiiLimitPreview';
import '../../styles/toshokan-gates.css';

const GATE_PREVIEWS = {
  [TOSHOKAN_GATE.LIBRARY_LIMIT]: LibraryLimitPreview,
  [TOSHOKAN_GATE.CURATED_COLLECTION]: CuratedCollectionPreview,
  [TOSHOKAN_GATE.ASK_ZENZEII_LIMIT]: AskZenzeiiLimitPreview,
};

export function ToshokanGateModal({ open, gate, onClose, onUpgrade }) {
  const type = gate?.type;
  const copy = type ? TOSHOKAN_GATE_COPY[type] : null;
  const Preview = type ? GATE_PREVIEWS[type] : null;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="toshokan-gate-backdrop" />
        <Dialog.Content className="toshokan-gate-modal">
          <Dialog.Close asChild>
            <button type="button" className="toshokan-gate-close" aria-label="Close">
              <X size={18} aria-hidden="true" />
            </button>
          </Dialog.Close>

          {copy && <GateModalHeader headline={copy.headline} body={copy.body} />}

          {Preview && (
            <div className="toshokan-gate-detail">
              <Preview context={gate?.context} />
            </div>
          )}

          <hr className="toshokan-gate-divider" />

          <div className="toshokan-gate-passcard">
            <ToshokanPassCard size="compact" />
          </div>

          <GateModalCTA onUpgrade={onUpgrade} onClose={onClose} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
