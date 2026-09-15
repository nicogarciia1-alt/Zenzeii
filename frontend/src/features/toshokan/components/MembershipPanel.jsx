import React, { useState } from 'react';
import { toast } from 'sonner';
import { createCheckoutSession } from '@/lib/api';
import { ToshokanPassCard } from './ToshokanPassCard';
import { MembershipPrice } from './MembershipPrice';
import { PassCTA } from './PassCTA';

export function MembershipPanel() {
  const [loadingTier, setLoadingTier] = useState(null);

  const handleGetPass = async (tier) => {
    if (loadingTier) return;
    setLoadingTier(tier);
    try {
      const res = await createCheckoutSession(tier);
      window.location.href = res.data.checkout_url;
    } catch (err) {
      toast(err?.response?.data?.detail || 'Could not start checkout. Please try again.');
      setLoadingTier(null);
    }
  };

  return (
    <section className="toshokan-membership">
      <ToshokanPassCard />
      <p className="pass-card-caption">Your membership card. Yours to keep.</p>
      <MembershipPrice />
      <PassCTA onClick={() => handleGetPass('premium')} loading={loadingTier === 'premium'} />
      <button
        type="button"
        className="pass-cta-annual"
        onClick={() => handleGetPass('premium_annual')}
        disabled={loadingTier !== null}
      >
        {loadingTier === 'premium_annual' ? 'Redirecting…' : (
          <>
            €29.99 / year
            <span className="pass-cta-annual__badge">Save 37%</span>
          </>
        )}
      </button>
      <p className="pass-fineprint">Cancel anytime. No long-term commitment. Secured by Stripe.</p>
    </section>
  );
}

export default MembershipPanel;
