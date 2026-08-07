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
 * Desktop switches to a real two-column CSS Grid (55/45 split — content
 * gets the wider column so the title reads as monumental, not cramped)
 * with the artwork as its own column. Heights: 600px desktop / 480px
 * tablet / auto mobile (UI Refinement Brief Rev 1 — was 480/360).
 *
 * Static in Phase 1. Phase 2+ passes onExplore/onSurpriseMe callbacks
 * down to HeroContent. Phase 7 adds searchProps, forwarded to HeroContent
 * unchanged — LibraryHero owns no search state itself.
 */
import HeroContent from './HeroContent';
import HeroImage from './HeroImage';

/**
 * @param {Object} [props]
 * @param {Object} [props.searchProps] - Forwarded to HeroContent → SearchBar (Phase 7)
 */
export default function LibraryHero({ searchProps }) {
  return (
    <section className="relative w-full h-auto md:h-[480px] lg:h-[600px] overflow-hidden bg-library-bg-hero-dark lg:grid lg:grid-cols-[55fr_45fr]">
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
        <HeroContent searchProps={searchProps} />
      </div>
    </section>
  );
}
