import React from 'react';
import { toast } from 'sonner';
import { ToshokanPassCard } from './ToshokanPassCard';
import { MembershipPrice } from './MembershipPrice';
import { PassCTA } from './PassCTA';

export function MembershipPanel() {
  const handleGetPass = () => {
    // TODO: wire to checkout/payments backend
    toast('Checkout coming soon.');
  };

  return (
    <section className="toshokan-membership">
      <ToshokanPassCard />
      <p className="pass-card-caption">Your membership card. Yours to keep.</p>
      <MembershipPrice />
      <PassCTA onClick={handleGetPass} />
      <p className="pass-fineprint">Cancel anytime. No long-term commitment. Secured by Stripe.</p>
    </section>
  );
}

export default MembershipPanel;
