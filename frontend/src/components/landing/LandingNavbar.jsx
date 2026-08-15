import React from 'react';
import { Link } from 'react-router-dom';

const navLinks = [
  { label: 'Library', href: '/auth' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'For readers', href: '#for-readers' },
  { label: 'Pricing', href: '/pricing' },
];

const LandingNavbar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full bg-library-bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-library-bg-primary/80">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-serif text-library-text-primary">読</span>
            <span className="text-lg font-medium text-library-text-primary tracking-wide">Zenzeii</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-library-text-secondary hover:text-library-text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <Link
            to="/auth"
            className="inline-flex items-center rounded-full bg-library-text-primary text-library-bg-primary px-5 py-2.5 text-sm font-medium hover:bg-black transition-colors"
          >
            Enter the Library
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default LandingNavbar;
