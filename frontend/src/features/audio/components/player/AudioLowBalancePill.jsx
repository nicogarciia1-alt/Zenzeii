import { Clock } from 'lucide-react';
import { formatMinutesRemaining } from '../../constants/audioGateTypes';
import '../../styles/audio-gates.css';

export function AudioLowBalancePill({ minutesRemaining, onTopUp }) {
  return (
    <span className="audio-low-balance-pill">
      <span className="audio-low-balance-pill__label">
        <Clock size={13} aria-hidden="true" />
        {formatMinutesRemaining(minutesRemaining)}
      </span>
      <span className="audio-low-balance-pill__divider" />
      <button
        type="button"
        className="audio-low-balance-pill__topup"
        onClick={onTopUp}
        aria-label={`${formatMinutesRemaining(minutesRemaining)}. Top up audio balance.`}
      >
        Top up
      </button>
    </span>
  );
}
