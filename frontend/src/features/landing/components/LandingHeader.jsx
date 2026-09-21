import React from 'react';
import { Link } from 'react-router-dom';
import { LANDING_CTAS, TOSHOKAN_LINK } from '../data/landingContent';

/**
 * The landing page's own top strip, as drawn in the approved mockup:
 * ZENZEII wordmark, Library / Toshokan / About, the tagline, and the
 * account button. Logged-out visitors only — the app Navbar is not used here.
 */
export default function LandingHeader() {
  return (
    <header className="lp-header">
      <div className="lp-header__inner">
        <Link to="/" className="lp-header__brand" aria-label="Zenzeii home">ZENZEII</Link>
        <nav className="lp-header__nav" aria-label="Primary">
          <Link to={LANDING_CTAS.enter.to}>Library</Link>
          <Link to={TOSHOKAN_LINK.to}>Toshokan</Link>
          <a href="#explore">About</a>
        </nav>
        <p className="lp-header__tagline" lang="ja">日本の文学を、もっと近くに。</p>
        <Link to={LANDING_CTAS.create.to} className="lp-btn lp-btn--primary lp-btn--sm">
          {LANDING_CTAS.create.label}
        </Link>
      </div>
    </header>
  );
}
