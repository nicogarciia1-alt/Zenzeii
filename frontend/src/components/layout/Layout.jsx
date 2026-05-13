import React from 'react';
import Navbar from './Navbar';

export const Layout = ({ children, hideNav = false }) => {
  return (
    <div className="min-h-screen bg-background">
      {!hideNav && <Navbar />}
      <main>{children}</main>
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        fontFamily: '"EB Garamond", Georgia, serif',
        fontSize: '0.85rem',
        color: 'hsl(var(--muted-foreground))',
        borderTop: '1px solid hsl(var(--border))',
        marginTop: 'auto',
      }}>
        <span>© 2026 Zenzeii</span>
        {' · '}
        <a href="/privacy" style={{ color: 'hsl(var(--muted-foreground))', textDecoration: 'underline' }}>
          Privacy Policy
        </a>
      </footer>
    </div>
  );
};

export default Layout;
