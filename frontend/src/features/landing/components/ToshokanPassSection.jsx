import React from 'react';
import { Link } from 'react-router-dom';
import { Headphones, Infinity as InfinityIcon, Star } from 'lucide-react';
import { ToshokanPassCard } from '@/features/toshokan/components/ToshokanPassCard';
import { SakuraBranch } from '@/features/toshokan/components/decorations';
import { MEMBERSHIP_NOTES, TOSHOKAN_LINK } from '../data/landingContent';

const ICONS = { infinity: InfinityIcon, headphones: Headphones, star: Star };

/**
 * The Toshokan Pass — the real ToshokanPassCard is the sales object; the
 * page explains membership in three quiet notes. No pricing, no button.
 */
export default function ToshokanPassSection() {
  return (
    <section className="lp-pass" aria-labelledby="lp-pass-title">
      <div className="lp-pass__branch" aria-hidden="true">
        <SakuraBranch color="#B98080" opacity={0.34} className="lp-pass__branch-svg" />
      </div>
      <div className="lp-container lp-pass__grid">
        <div className="lp-pass__copy">
          <p className="lp-eyebrow">THE TOSHOKAN PASS</p>
          <h2 id="lp-pass-title" className="lp-pass__title" lang="ja">もっと読める。もっと深く。</h2>
          <p className="lp-pass__lede">
            The Toshokan Pass unlocks a fuller experience — unlimited reading and listening, early
            access to new features, and more to come.
          </p>
          <Link to={TOSHOKAN_LINK.to} className="lp-textlink">
            {TOSHOKAN_LINK.label} <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="lp-pass__card" aria-hidden="true">
          <ToshokanPassCard />
        </div>

        <div className="lp-pass__aside">
          <ul className="lp-pass__notes">
            {MEMBERSHIP_NOTES.map(({ key, icon, japanese, english }) => {
              const Icon = ICONS[icon];
              return (
                <li key={key} className="lp-pass__note">
                  <Icon className="lp-pass__note-icon" size={26} strokeWidth={1.25} aria-hidden="true" />
                  <span>
                    <span className="lp-pass__note-jp" lang="ja">{japanese}</span>
                    <span className="lp-pass__note-en">{english}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
