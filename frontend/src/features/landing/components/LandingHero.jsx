import React from 'react';
import { Link } from 'react-router-dom';
import { SakuraBranch } from '@/features/toshokan/components/decorations';
import { LANDING_CTAS, LANDING_IMAGES } from '../data/landingContent';

/**
 * Hero — sits directly beneath LandingHeader.
 * Desktop: copy ~40% / photograph ~60%, the photograph fading into the paper.
 * Mobile: copy, then image.
 */
export default function LandingHero() {
  return (
    <section className="lp-hero" aria-labelledby="lp-hero-title">
      <div className="lp-hero__branch" aria-hidden="true">
        <SakuraBranch color="#B98080" opacity={0.32} className="lp-hero__branch-svg" />
      </div>

      <div className="lp-hero__media">
        <img className="lp-hero__image" src={LANDING_IMAGES.hero} alt="" decoding="async" fetchPriority="high" />
        <p className="lp-hero__caption" aria-hidden="true">
          <span className="lp-hero__caption-jp" lang="ja">
            いい本が、<br />いい時間をつくる。
          </span>
          <span className="lp-hero__caption-en">
            Better books.<br />A richer you.
          </span>
        </p>
      </div>

      <div className="lp-hero__copy">
        <h1 id="lp-hero-title" className="lp-hero__title" lang="ja">
          <span>読むことで、</span>
          <span>世界が少し広がる。</span>
        </h1>
        <p className="lp-hero__tagline">Japanese literature, for a more thoughtful world.</p>
        <p className="lp-hero__lede">
          Zenzeii is a home for Japanese literature. Read, listen, explore, and share — from
          timeless classics to hidden gems.
        </p>
        <div className="lp-actions">
          <Link to={LANDING_CTAS.create.to} className="lp-btn lp-btn--primary">
            {LANDING_CTAS.create.label}
          </Link>
          <Link to={LANDING_CTAS.enter.to} className="lp-btn lp-btn--secondary">
            {LANDING_CTAS.enter.label}
          </Link>
        </div>
        <p className="lp-hero__note">
          <span className="lp-hero__note-rule" aria-hidden="true" />
          Books are never read alone.
        </p>
      </div>
    </section>
  );
}
