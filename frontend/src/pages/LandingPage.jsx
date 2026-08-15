import React from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-library-bg-primary">
      <LandingNavbar />
      <HeroSection />
    </div>
  );
};

export default LandingPage;
