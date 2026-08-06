/**
 * @fileoverview Reusable horizontal scroll container for Library shelves.
 *
 * Provides a horizontally scrollable row with hidden scrollbar,
 * scroll-snap alignment, and optional navigation arrow buttons.
 *
 * Wraps every child in a snap-aligned div itself, rather than requiring
 * each card component (FeelingCard, BookCardPlaceholder, and whatever
 * Phase 5+ adds) to remember snap-start/shrink-0 individually — one
 * place owns the scroll-snap contract. Those same wrapper divs carry
 * role="listitem" (the row itself is role="list"), applied uniformly
 * regardless of card type — a role="list" container with only some
 * children marked listitem would be invalid ARIA structure.
 *
 * Used by: FeelingShelves/DiscoverJapan sections, BookShelf.
 */
import { Children, useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * @param {Object} props
 * @param {React.ReactNode} props.children - Cards to render in the scroll row
 * @param {boolean} [props.showArrows] - Whether to show left/right nav arrows
 * @param {string} [props.className] - Additional classes for the container
 */
export function ShelfScrollContainer({ children, showArrows = false, className = '' }) {
  const scrollRef = useRef(null);
  const scrollId = 'shelf-scroll-' + useId();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState);
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [children]);

  const scrollByPage = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    if (direction < 0 && !canScrollLeft) return;
    if (direction > 0 && !canScrollRight) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        id={scrollId}
        role="list"
        className={`flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide pb-2 ${className}`}
      >
        {Children.map(children, (child) => (
          <div role="listitem" className="snap-start shrink-0">
            {child}
          </div>
        ))}
      </div>

      {showArrows && (
        <>
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            aria-label="Scroll left"
            aria-controls={scrollId}
            aria-disabled={!canScrollLeft}
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md transition-opacity ${
              canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronLeft className="w-4 h-4 text-library-text-primary" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => scrollByPage(1)}
            aria-label="Scroll right"
            aria-controls={scrollId}
            aria-disabled={!canScrollRight}
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md transition-opacity ${
              canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ChevronRight className="w-4 h-4 text-library-text-primary" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
