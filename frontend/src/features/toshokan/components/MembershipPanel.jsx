import React, { useState } from 'react';
import { toast } from 'sonner';
import { createCheckoutSession } from '@/lib/api';
import { ToshokanPassCard } from './ToshokanPassCard';
import { MembershipPrice } from './MembershipPrice';
import { PassCTA } from './PassCTA';

export function MembershipPanel() {
  const [loading, setLoading] = useState(false);

  const handleGetPass = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await createCheckoutSession('premium');
      window.location.href = res.data.checkout_url;
    } catch (err) {
      toast(err?.response?.data?.detail || 'Could not start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <section className="toshokan-membership">
      <ToshokanPassCard />
      <p className="pass-card-caption">Your membership card. Yours to keep.</p>
      <MembershipPrice />
      <PassCTA onClick={handleGetPass} loading={loading} />
      <p className="pass-fineprint">Cancel anytime. No long-term commitment. Secured by Stripe.</p>
    </section>
  );
}

export default MembershipPanel;
