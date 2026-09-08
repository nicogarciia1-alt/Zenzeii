import { Loader2 } from 'lucide-react';

export function AudioMinutePackCard({ label, minutes, price, recommended, loading, disabled, onBuy }) {
  return (
    <div className={`audio-pack-card${recommended ? ' audio-pack-card--recommended' : ''}`}>
      {recommended && <span className="audio-pack-card__badge">Most popular</span>}
      <div className="audio-pack-card__label">{label}</div>
      <div className="audio-pack-card__minutes">{minutes} min</div>
      <div className="audio-pack-card__divider" />
      <div className="audio-pack-card__price">{price}</div>
      <button
        type="button"
        className="audio-pack-card__buy"
        disabled={disabled}
        onClick={onBuy}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Opening checkout…
          </>
        ) : (
          'Buy'
        )}
      </button>
    </div>
  );
}
