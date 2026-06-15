import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, BookOpen, Users, ShieldCheck } from 'lucide-react';
import { createCheckoutSession } from '@/lib/api';
import founderIllustration from '@/assets/founder-illustration.png';
import { toast } from 'sonner';

// TODO: replace with GET /api/founding-member-spots once A3 ships
const spotsRemaining = 15;
const totalSpots = 15;

const PREMIUM_FEATURES = [
  'Unlimited reading',
  'All learning tools',
  'Progress tracking',
];

const FOUNDER_FEATURES = [
  'Everything in Premium',
  'Founder badge',
  'Early access to new features',
  'Help shape Zenzeii',
];

export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState(null);
  const [founderSoldOut, setFounderSoldOut] = useState(spotsRemaining <= 0);

  const handleCheckout = async (tier) => {
    setLoadingTier(tier);
    try {
      const response = await createCheckoutSession(tier);
      window.location.href = response.data.checkout_url;
    } catch (error) {
      const status = error?.response?.status;

      if (status === 400) {
        toast('You already have an active plan.');
      } else if (status === 409) {
        setFounderSoldOut(true);
        toast('Founding member spots are sold out.');
      } else if (status === 503) {
        toast.error('Payment unavailable — try again later.');
      } else {
        toast.error('Something went wrong — please try again.');
      }
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-12">
          <img
            src={founderIllustration}
            alt=""
            className="w-40 h-auto mb-6"
          />
          <h1 className="font-serif text-3xl md:text-4xl text-primary mb-4">
            Continue your reading journey.
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Join Zenzeii and unlock unlimited stories, powerful learning tools,
            and a deeper path to mastering Japanese through literature.
          </p>
        </div>

        {/* Tiers */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Premium */}
          <Card className="border-border flex flex-col">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-primary text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <CardTitle className="font-serif text-2xl text-primary">
                Premium
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <ul className="space-y-3 mb-8">
                {PREMIUM_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <div className="text-center mb-6">
                  <span className="font-serif text-3xl text-foreground">€5.99</span>
                  <span className="text-muted-foreground"> / month</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => handleCheckout('premium')}
                  disabled={loadingTier === 'premium'}
                >
                  {loadingTier === 'premium' ? 'Redirecting…' : 'Start Premium'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Founder Member */}
          <Card className="border-primary relative overflow-hidden flex flex-col">
            {!founderSoldOut && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-8 py-1 translate-x-6 translate-y-3 rotate-45">
                Limited
              </div>
            )}
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-primary text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="font-serif text-2xl text-primary">
                Founder Member
              </CardTitle>
              <span className="inline-block mt-2 text-xs font-medium bg-muted text-muted-foreground rounded-full px-3 py-1">
                Limited to the first {totalSpots} readers
              </span>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <ul className="space-y-3 mb-8">
                {FOUNDER_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <div className="text-center mb-2">
                  <span className="font-serif text-3xl text-foreground">€19.99</span>
                  <span className="text-muted-foreground"> · one-time</span>
                </div>
                <div className="text-center mb-6">
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-muted text-muted-foreground rounded-full px-3 py-1">
                    <Users className="h-3 w-3" />
                    {founderSoldOut
                      ? 'Sold out'
                      : `${spotsRemaining} / ${totalSpots} remaining`}
                  </span>
                </div>
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => handleCheckout('founding_member')}
                  disabled={loadingTier === 'founding_member' || founderSoldOut}
                >
                  {founderSoldOut
                    ? 'Sold out'
                    : loadingTier === 'founding_member'
                    ? 'Redirecting…'
                    : 'Become a Founder'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer note */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-10">
          <ShieldCheck className="h-4 w-4" />
          <span>No commitment. Cancel anytime.</span>
        </div>
      </div>
    </Layout>
  );
}
