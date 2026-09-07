/**
 * @fileoverview Primary/secondary actions + fine print shared by every
 * ToshokanGateModal variant. onUpgrade routes into the existing /pricing
 * flow (see ToshokanGateContext) — no second checkout implementation here.
 */
export function GateModalCTA({ onUpgrade, onClose }) {
  return (
    <>
      <button type="button" className="toshokan-gate-cta" onClick={onUpgrade}>
        Get Toshokan Pass
      </button>
      <button type="button" className="toshokan-gate-secondary" onClick={onClose}>
        Maybe later
      </button>
      <p className="toshokan-gate-fineprint">€3.99 / month · Cancel anytime</p>
    </>
  );
}
