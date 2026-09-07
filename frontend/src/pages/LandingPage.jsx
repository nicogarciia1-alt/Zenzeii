import React from 'react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';
import DiscoverByFeeling from '@/components/landing/DiscoverByFeeling';
import ExploreStories from '@/components/landing/ExploreStories';
import FeaturesSection from '@/components/landing/FeaturesSection';
import StatsBar from '@/components/landing/StatsBar';
import ClosingSection from '@/components/landing/ClosingSection';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-library-bg-primary">
      <LandingNavbar />
      <HeroSection />
      <DiscoverByFeeling />
      <ExploreStories />
      <FeaturesSection />
      <StatsBar />
      <ClosingSection />
    </div>
  );
};

export default LandingPage;
