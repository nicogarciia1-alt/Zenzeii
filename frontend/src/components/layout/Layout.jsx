import React from 'react';
import Navbar from './Navbar';

export const Layout = ({ children, hideNav = false }) => {
  return (
    <div className="min-h-screen bg-background">
      {!hideNav && <Navbar />}
      <main>{children}</main>
    </div>
  );
};

export default Layout;
