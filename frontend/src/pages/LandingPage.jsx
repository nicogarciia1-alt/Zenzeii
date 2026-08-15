import React from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';
import DiscoverByFeeling from '@/components/landing/DiscoverByFeeling';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-library-bg-primary">
      <LandingNavbar />
      <HeroSection />
      <DiscoverByFeeling />
    </div>
  );
};

export default LandingPage;
