/**
 * @fileoverview Gate C detail — a quiet 5-dot usage indicator, not a
 * gamified progress bar. Defaults to limit=5/used=5 (the backend's fixed
 * daily cap — see check_ai_limit in backend/server.py) when no context is
 * passed, so this renders correctly even if a caller opens the gate
 * without fetching fresh usage first.
 */
export function AskZenzeiiLimitPreview({ context }) {
  const limit = context?.limit ?? 5;
  const used = context?.used ?? limit;

  return (
    <div className="ask-limit-panel">
      <div className="ask-limit-dots">
        {Array.from({ length: limit }).map((_, i) => (
          <span key={i} className="ask-limit-dot" aria-hidden="true" />
        ))}
      </div>
      <p className="ask-limit-count">{used} / {limit} used today</p>
      <p className="ask-limit-reset">Resets at midnight (JST).</p>
    </div>
  );
}
