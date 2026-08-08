/**
 * @fileoverview Zenzeii Library hero section.
 *
 * Responsibility: full-width hero container with two zones — dark content
 * zone (left) and artwork zone (right). Composes HeroContent and
 * HeroImage; owns no state.
 *
 * Layout: mobile hides the artwork entirely (dark content zone, full
 * width, auto height). Tablet and desktop both render the artwork as a
 * full-bleed absolute background spanning the entire section — not a
 * desktop grid column confined to the right 45%. The lg: grid
 * (55/45 split) only positions the *content* into a left column; the
 * image sits behind all of it as one continuous layer, edge to edge.
 * Heights: 600px desktop / 480px tablet / auto mobile (UI Refinement
 * Brief Rev 1 — was 480/360).
 *
 * Static in Phase 1. Phase 2+ passes onExplore/onSurpriseMe callbacks
 * down to HeroContent. Phase 7 adds searchProps, forwarded to HeroContent
 * unchanged — LibraryHero owns no search state itself.
 *
 * Sato's final artwork landed (2026-08-07) — a Japanese scholar's study
 * overlooking Mount Fuji with cherry blossoms, frontend/public/assets/
 * hero-library.webp (converted from the delivered PNG via Pillow,
 * quality=85 -> 135KB, well under the 500KB budget). Its own dark left
 * portion (bookshelf) IS the text-legibility mechanism at desktop —
 * see the content div below, which deliberately carries no background
 * of its own so the real photo shows through behind it.
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
      {/* Artwork: hidden on mobile, full-bleed absolute background at every breakpoint it's visible.
          No lg:static/col-start override — the image is never a grid item, so it's never confined
          to the second column. It spans the whole section at every size from md up. */}
      <div className="hidden md:block absolute inset-0">
        <HeroImage
          src="/assets/hero-library.webp"
          alt="Zenzeii Library — a Japanese scholar's study overlooking Mount Fuji with cherry blossoms"
        />
      </div>

      {/* Tablet-only dark tint: at md (no column split yet), content spans the image's full width,
          including its brighter right portion, so it needs a flat assist. Desktop doesn't get this —
          content there sits only over the image's own naturally-dark left portion, already dark
          enough on its own (see fileoverview). */}
      <div
        aria-hidden="true"
        className="hidden md:block lg:hidden absolute inset-0 bg-library-bg-hero-dark/85"
      />

      {/* Content: full width on mobile/tablet, left column on desktop. Deliberately no background
          of its own at any breakpoint — mobile/tablet already get theirs from the section's base
          bg-library-bg-hero-dark or the tint above; desktop relies on the real image's own dark
          left portion showing through directly behind the text. */}
      <div className="relative z-10 lg:col-start-1 lg:row-start-1 h-full">
        <HeroContent searchProps={searchProps} />
      </div>
    </section>
  );
}
