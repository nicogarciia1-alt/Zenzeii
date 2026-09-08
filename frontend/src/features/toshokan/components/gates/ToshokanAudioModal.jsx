/**
 * @fileoverview Audio minutes modal — the taster intro and the purchase
 * flow for narration packs, triggered from ReaderPage's audio bar.
 *
 * Deliberately separate from ToshokanGateModal: that component's shell is
 * a single-CTA "Get Toshokan Pass" upsell, while this one needs a
 * multi-pack purchase grid and a "Play now" no-purchase state. It reuses
 * the same Radix Dialog + toshokan-gate-backdrop/toshokan-gate-modal CSS
 * (see features/toshokan/styles/toshokan-gates.css) so the overlay
 * mechanics and shell aesthetic stay identical — only the content differs.
 *
 * Wiring-only pass: layout and interactions are final, exact visual spec
 * (colors/spacing for the pack cards and pill) is pending mockups.
 */
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { purchaseAudioPack } from '@/lib/api';
import { GateModalHeader } from './GateModalHeader';
import '../../styles/toshokan-gates.css';

export const AUDIO_PACKS = [
  { id: 'starter_10', name: 'Starter', minutes: 10, price: '€1.99' },
  { id: 'standard_30', name: 'Standard', minutes: 30, price: '€4.99' },
  { id: 'library_60', name: 'Library', minutes: 60, price: '€7.99' },
];

const AUDIO_MODAL_COPY = {
  taster: {
    headline: 'Try the audio reader.',
    body: 'You have 1 free minute to try the audio reader.',
  },
  no_minutes: {
    headline: 'Add more listening time.',
    body: 'Choose a narration pack to keep listening.',
  },
};

function AudioPackGrid() {
  const [buyingPackId, setBuyingPackId] = useState(null);

  const handleBuy = async (packId) => {
    setBuyingPackId(packId);
    try {
      const res = await purchaseAudioPack(packId);
      window.location.href = res.data.checkout_url;
    } catch {
      setBuyingPackId(null);
      toast.error('Could not start checkout. Please try again.');
    }
  };

  return (
    <div className="toshokan-audio-pack-grid">
      {AUDIO_PACKS.map((pack) => (
        <div key={pack.id} className="toshokan-audio-pack">
          <div className="toshokan-audio-pack__name">{pack.name}</div>
          <div className="toshokan-audio-pack__minutes">{pack.minutes} min</div>
          <div className="toshokan-audio-pack__price">{pack.price}</div>
          <button
            type="button"
            className="toshokan-audio-pack__buy"
            disabled={buyingPackId !== null}
            onClick={() => handleBuy(pack.id)}
          >
            {buyingPackId === pack.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buy'}
          </button>
        </div>
      ))}
    </div>
  );
}

export function ToshokanAudioModal({ open, state, onClose, onPlayNow }) {
  const copy = state ? AUDIO_MODAL_COPY[state] : null;

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

          {state === 'taster' && (
            <button
              type="button"
              className="toshokan-gate-cta"
              onClick={() => { onClose(); onPlayNow(); }}
            >
              Play now
            </button>
          )}

          {state === 'no_minutes' && <AudioPackGrid />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function AudioMinutesPill({ minutes, onTopUp }) {
  return (
    <button type="button" className="toshokan-audio-pill" onClick={onTopUp}>
      <span className="toshokan-audio-pill__label">声 {minutes.toFixed(1)} min</span>
      <span className="toshokan-audio-pill__topup">Top up</span>
    </button>
  );
}
