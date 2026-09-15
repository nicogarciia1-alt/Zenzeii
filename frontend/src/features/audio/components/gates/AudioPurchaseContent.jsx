import * as Dialog from '@radix-ui/react-dialog';
import { Lock } from 'lucide-react';
import { AUDIO_PACKS } from '../../constants/audioGateTypes';
import { AudioMinutePackCard } from './AudioMinutePackCard';

export function AudioPurchaseContent() {
  return (
    <>
      <Dialog.Title className="audio-gate-headline">Continue listening.</Dialog.Title>
      <Dialog.Description className="audio-gate-body">
        Choose a minute pack — yours to use across any book, any time.
      </Dialog.Description>

      <div className="audio-pack-grid">
        {AUDIO_PACKS.map((pack) => (
          <AudioMinutePackCard
            key={pack.id}
            label={pack.label}
            minutes={pack.minutes}
            price={pack.price}
            recommended={pack.recommended}
          />
        ))}
      </div>

      <p className="audio-purchase-coming-soon">Audio listening is coming soon. Check back shortly.</p>

      <p className="audio-purchase-note">
        <Lock size={12} aria-hidden="true" />
        Payments secured by Stripe.
      </p>
    </>
  );
}
