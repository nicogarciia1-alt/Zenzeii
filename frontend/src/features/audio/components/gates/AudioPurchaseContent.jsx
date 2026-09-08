import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Lock } from 'lucide-react';
import { purchaseAudioPack } from '@/lib/api';
import { AUDIO_PACKS } from '../../constants/audioGateTypes';
import { AudioMinutePackCard } from './AudioMinutePackCard';

export function AudioPurchaseContent() {
  const [buyingPackId, setBuyingPackId] = useState(null);
  const [error, setError] = useState(null);

  const handleBuy = async (pack) => {
    setError(null);
    setBuyingPackId(pack.packId);
    try {
      const res = await purchaseAudioPack(pack.packId);
      window.location.href = res.data.checkout_url;
    } catch {
      setBuyingPackId(null);
      setError("We couldn't open checkout. Please try again.");
    }
  };

  return (
    <>
      <Dialog.Title className="audio-gate-headline">Continue listening.</Dialog.Title>
      <Dialog.Description className="audio-gate-body">
        Choose a minute pack — yours to use across any book, any time.
      </Dialog.Description>

      {error && <p className="audio-purchase-error">{error}</p>}

      <div className="audio-pack-grid">
        {AUDIO_PACKS.map((pack) => (
          <AudioMinutePackCard
            key={pack.id}
            label={pack.label}
            minutes={pack.minutes}
            price={pack.price}
            recommended={pack.recommended}
            loading={buyingPackId === pack.packId}
            disabled={buyingPackId !== null}
            onBuy={() => handleBuy(pack)}
          />
        ))}
      </div>

      <p className="audio-purchase-note">
        <Lock size={12} aria-hidden="true" />
        Payments secured by Stripe.
      </p>
    </>
  );
}
