import React from 'react';
import { SakuraBranch } from './decorations';

export function ToshokanPassCard() {
  return (
    <div className="pass-card">
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
