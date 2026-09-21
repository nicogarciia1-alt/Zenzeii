import React from 'react';
import LandingHeader from '@/features/landing/components/LandingHeader';
import LandingHero from '@/features/landing/components/LandingHero';
import ProductExperience from '@/features/landing/components/ProductExperience';
import ToshokanPassSection from '@/features/landing/components/ToshokanPassSection';
import LandingFinalCTA from '@/features/landing/components/LandingFinalCTA';
import '@/features/landing/landing.css';

/**
 * Logged-out home (`/`). Composition only — every section lives in
 * features/landing. Authenticated users get HomePage (see App.js).
 */
const LandingPage = () => (
  <div className="landing-root">
    <LandingHeader />
    <main>
      <LandingHero />
      <ProductExperience />
      <ToshokanPassSection />
      <LandingFinalCTA />
    </main>
  </div>
);

export default LandingPage;
