import React from 'react';
import { SakuraBranch } from './decorations';

export function ToshokanRail() {
  return (
    <aside className="toshokan-rail">
      <div className="toshokan-rail__branch">
        <SakuraBranch color="#4a2320" opacity={0.5} className="w-[170px] h-[260px]" />
      </div>
      <p className="toshokan-rail__text">良い本は、静かに人生を変えていく。</p>
      <div className="toshokan-rail__seal">
        <span>禅々</span>
      </div>
    </aside>
  );
}

export default ToshokanRail;
