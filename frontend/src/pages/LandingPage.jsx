import React from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';
import DiscoverByFeeling from '@/components/landing/DiscoverByFeeling';
import ExploreStories from '@/components/landing/ExploreStories';
import FeaturesSection from '@/components/landing/FeaturesSection';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-library-bg-primary">
      <LandingNavbar />
      <HeroSection />
      <DiscoverByFeeling />
      <ExploreStories />
      <FeaturesSection />
    </div>
  );
};

export default LandingPage;
