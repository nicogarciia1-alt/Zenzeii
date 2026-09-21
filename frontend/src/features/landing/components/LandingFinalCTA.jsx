import React from 'react';
import { Link } from 'react-router-dom';
import { LANDING_CTAS, LANDING_IMAGES } from '../data/landingContent';

/** Closing landscape banner — repeats the hero's two actions, nothing else. */
export default function LandingFinalCTA() {
  return (
    <section className="lp-final" aria-labelledby="lp-final-title">
      <img className="lp-final__image" src={LANDING_IMAGES.closing} alt="" loading="lazy" decoding="async" />
      <div className="lp-final__inner">
        <h2 id="lp-final-title" className="lp-final__title" lang="ja">あなたのつぎの一冊が、ここに。</h2>
        <p className="lp-final__sub">Your next great read is waiting.</p>
        <div className="lp-actions lp-actions--center">
          <Link to={LANDING_CTAS.create.to} className="lp-btn lp-btn--primary">
            {LANDING_CTAS.create.label}
          </Link>
          <Link to={LANDING_CTAS.enter.to} className="lp-btn lp-btn--ghost">
            {LANDING_CTAS.enter.label}
          </Link>
        </div>
      </div>
      <p className="lp-final__motto" lang="ja" aria-hidden="true">＋ 読書で、少し、よい世界へ。</p>
      <p className="lp-final__mark" aria-hidden="true">
        <span className="lp-final__mark-name">ZENZEII</span>
        <span className="lp-final__mark-tag">A more thoughtful tomorrow.</span>
      </p>
    </section>
  );
}
