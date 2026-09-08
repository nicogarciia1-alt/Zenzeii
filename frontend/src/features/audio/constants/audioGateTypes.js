/**
 * @fileoverview Audio minute-pack entitlement types and pack data.
 *
 * Deliberately separate from features/toshokan/constants/toshokanGates.js —
 * audio minute packs and the Toshokan Pass membership are different
 * commercial products and must not share entitlement logic (see the
 * Zenzeii audio purchase brief, "Relationship to Toshokan Pass").
 *
 * The backend's GET /api/audio/balance does not return an explicit
 * "audio_access" status enum (only raw balance fields), so the
 * available/taster/purchase decision is derived here, in one place,
 * from the real fields — not scattered as ad-hoc checks across the
 * reader, and not invented as a fake backend contract.
 */

export const AUDIO_GATE = {
  TASTER: 'taster',
  PURCHASE: 'purchase',
};

export const AUDIO_ACCESS = {
  AVAILABLE: 'available',
  ...AUDIO_GATE,
};

/**
 * Resolves a GET /api/audio/balance response into one access state.
 * Mirrors the reader's decision tree: purchased minutes (pack or, for
 * Premium, the monthly allowance) always win over the taster prompt —
 * once a user has paid, don't interrupt them with the free-minute intro.
 */
export function getAudioAccessState(balance) {
  if (!balance) return null;
  const {
    subscription_tier,
    audio_pack_minutes_balance = 0,
    audio_monthly_minutes_balance = 0,
    is_free_taster_exhausted,
  } = balance;

  const hasPurchasedMinutes =
    audio_pack_minutes_balance > 0 ||
    (subscription_tier === 'premium' && audio_monthly_minutes_balance > 0);
  if (hasPurchasedMinutes) return AUDIO_ACCESS.AVAILABLE;

  if (subscription_tier === 'free' && !is_free_taster_exhausted) {
    return AUDIO_GATE.TASTER;
  }

  return AUDIO_GATE.PURCHASE;
}

export const AUDIO_LOW_BALANCE_THRESHOLD = 3;

export const isLowBalance = (minutesRemaining) =>
  minutesRemaining > 0 && minutesRemaining < AUDIO_LOW_BALANCE_THRESHOLD;

/** "2 min left" / "1 min left" / "<1 min left" — never a raw decimal. */
export function formatMinutesRemaining(minutesRemaining) {
  if (minutesRemaining < 1) return '<1 min left';
  return `${Math.floor(minutesRemaining)} min left`;
}

// Presentational pack data. `packId` is the real backend/Stripe identifier
// (see AUDIO_PACK_PRICE_IDS in backend/server.py) — kept alongside, but the
// card component itself only ever sees the display fields + an onBuy
// callback, never the checkout identifier.
export const AUDIO_PACKS = [
  { id: 'starter', packId: 'starter_10', label: 'Starter', minutes: 10, price: '€1.99', recommended: false },
  { id: 'standard', packId: 'standard_30', label: 'Standard', minutes: 30, price: '€4.99', recommended: true },
  { id: 'library', packId: 'library_60', label: 'Library', minutes: 60, price: '€7.99', recommended: false },
];
