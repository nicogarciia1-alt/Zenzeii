export function AudioMinutePackCard({ label, minutes, price, recommended }) {
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
        aria-label={`${label} — coming soon`}
        disabled
      >
        We're working on it
      </button>
    </div>
  );
}
