import React from 'react';
import { SakuraBranch } from './decorations';
// Colocated so .pass-card renders correctly wherever this component is
// used, including from ToshokanGateModal — which mounts from pages that
// never import ToshokanPassPage (and therefore never load this CSS
// otherwise). Safe to import alongside ToshokanPassPage.jsx's own import
// of the same file — CSS module imports are deduped.
import '../toshokan.css';

/**
 * @param {Object} [props]
 * @param {'default'|'compact'} [props.size] - 'compact' is a smaller,
 *   proportionally-scaled rendering (same markup/identity, just resized)
 *   used inside ToshokanGateModal — see .pass-card--compact in toshokan.css.
 */
export function ToshokanPassCard({ size = 'default' }) {
  return (
    <div className={`pass-card${size === 'compact' ? ' pass-card--compact' : ''}`}>
      <div className="pass-card__branch">
        <SakuraBranch color="#C8A830" opacity={0.11} className="w-full h-full" />
      </div>

      <div className="pass-card__top">
        <div>
          <p className="pass-card__mark">図書館</p>
          <p className="pass-card__mark-label">TOSHOKAN PASS</p>
        </div>
        <div>
          <p className="pass-card__brand">善井</p>
          <p className="pass-card__brand-label">ZENZEII</p>
        </div>
      </div>

      <div className="pass-card__bottom">
        <div>
          <p className="pass-card__label">MEMBER NO.</p>
          <p className="pass-card__value">ZP-24-0001847</p>
          <p className="pass-card__label pass-card__label--since">SINCE</p>
          <p className="pass-card__value">AUG 2026</p>
        </div>
        <div className="pass-card__seal">
          <span>禅々</span>
        </div>
      </div>
    </div>
  );
}

export default ToshokanPassCard;
