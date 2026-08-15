import React from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';
import DiscoverByFeeling from '@/components/landing/DiscoverByFeeling';
import ExploreStories from '@/components/landing/ExploreStories';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-library-bg-primary">
      <LandingNavbar />
      <HeroSection />
      <DiscoverByFeeling />
      <ExploreStories />
    </div>
  );
};

export default LandingPage;
