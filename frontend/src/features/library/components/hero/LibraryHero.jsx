/**
 * @fileoverview Zenzeii Library hero section.
 *
 * Responsibility: full-width hero container with two zones — dark content
 * zone (left) and artwork zone (right). Composes HeroContent and
 * HeroImage; owns no state.
 *
 * Layout: mobile hides the artwork entirely (dark content zone, full
 * width, auto height). Tablet renders the artwork as a full-bleed
 * absolute background behind the content with a dark tint over it.
 * Desktop switches to a real two-column CSS Grid (45/55 split) with the
 * artwork as its own column. Heights: 480px desktop / 360px tablet /
 * auto mobile.
 *
 * Static in Phase 1. Phase 2+ passes onExplore/onSurpriseMe callbacks
 * down to HeroContent.
 */
import HeroContent from './HeroContent';
import HeroImage from './HeroImage';

export default function LibraryHero() {
  return (
    <section className="relative w-full h-auto md:h-[360px] lg:h-[480px] overflow-hidden bg-library-bg-hero-dark lg:grid lg:grid-cols-[45fr_55fr]">
      {/* Artwork: hidden on mobile, full-bleed absolute background on tablet, real right column on desktop */}
      <div className="hidden md:block absolute inset-0 lg:static lg:col-start-2 lg:row-start-1">
        <HeroImage alt="Zenzeii Library — Japanese literary landscape" />
      </div>

      {/* Tablet-only dark tint over the full-bleed image — desktop's content column has its own dark background instead */}
      <div
        aria-hidden="true"
        className="hidden md:block lg:hidden absolute inset-0 bg-library-bg-hero-dark/85"
      />

      {/* Content: full width on mobile/tablet, left column on desktop */}
      <div className="relative z-10 lg:col-start-1 lg:row-start-1 lg:bg-library-bg-hero-dark h-full">
        <HeroContent />
      </div>
    </section>
  );
}
