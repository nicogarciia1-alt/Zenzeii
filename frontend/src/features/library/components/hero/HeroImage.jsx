/**
 * @fileoverview HeroImage — right-zone artwork for LibraryHero.
 *
 * Renders a warm placeholder gradient, close enough to the intended
 * artwork palette that the hero feels intentional, not empty, plus a
 * soft upper-right radial highlight (UI Refinement Brief Rev 1) so it
 * reads as deliberate rather than "broken." When Sato delivers the
 * final artwork, only the caller changes — pass `src={HERO_IMAGE_URL}`
 * to <HeroImage /> in LibraryHero.jsx. This file's placeholder branch
 * and everything else in the hero stays identical.
 */

/**
 * @param {Object} props
 * @param {string} [props.src] - Image URL. If null/undefined, renders placeholder gradient.
 * @param {string} [props.alt] - Image alt text for accessibility (applies to both the
 *   real image and the placeholder, via aria-label — a div has no native alt attribute).
 */
export default function HeroImage({ src, alt }) {
  return (
    <div className="w-full h-full">
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="eager"
          fetchPriority="high"
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="relative w-full h-full bg-gradient-to-br from-[#2C2418]/80 via-[#3D3020]/60 to-[#1A1208]/40"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(210,180,140,0.15),transparent_60%)]"
          />
        </div>
      )}
    </div>
  );
}
