import React from 'react';
import { Lock } from 'lucide-react';
import { ToshokanIntro } from './components/ToshokanIntro';
import { PassBenefits } from './components/PassBenefits';
import { MembershipPanel } from './components/MembershipPanel';
import { IOSDelivery } from './components/IOSDelivery';
import { BambooEdge } from './components/decorations';

export function ToshokanContent() {
  return (
    <main className="toshokan-content">
      <div className="toshokan-edge-accent">
        <BambooEdge color="#D8D2C4" className="w-full h-full" />
      </div>

      <div className="toshokan-layout">
        <section className="toshokan-copy">
          <ToshokanIntro />
          <PassBenefits />
        </section>

        <MembershipPanel />

        <IOSDelivery />

        <div className="toshokan-footer">
          <Lock />
          <span>
            Secure payments. Your data is always protected. <span style={{ color: '#c4bdb0' }}>·</span> Powered by Stripe.
          </span>
        </div>
      </div>
    </main>
  );
}

export default ToshokanContent;
