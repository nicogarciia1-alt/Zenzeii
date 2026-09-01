import React from 'react';
import Navbar from '@/components/layout/Navbar';
import { ToshokanRail } from './components/ToshokanRail';
import { ToshokanContent } from './ToshokanContent';
import './toshokan.css';

export function ToshokanPassPage() {
  return (
    <>
      <Navbar />
      <div className="toshokan-page">
        <ToshokanRail />
        <ToshokanContent />
      </div>
    </>
  );
}

export default ToshokanPassPage;
