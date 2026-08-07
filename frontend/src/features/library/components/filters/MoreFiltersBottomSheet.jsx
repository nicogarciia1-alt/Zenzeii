/**
 * @fileoverview Mobile bottom sheet container for the advanced filter panel.
 *
 * Slides up from the bottom of the screen on mobile (<1024px). Includes
 * a drag handle (visual affordance only — functional drag-to-dismiss is
 * Phase 11 polish), backdrop overlay, and scroll-locked body. Stays
 * mounted through the closing transition so the slide-down actually
 * plays instead of the sheet just vanishing — same pattern as
 * MoreFiltersPopover.
 *
 * Closes on backdrop click or Escape.
 */
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const EXIT_DURATION_MS = 300;

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls visibility
 * @param {function} props.onClose - Called to close the sheet (backdrop, Escape, X, or panel's own Show results)
 * @param {React.ReactNode} props.children - MoreFiltersPanel content
 */
export function MoreFiltersBottomSheet({ isOpen, onClose, children }) {
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const sheetRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => document.body.classList.remove('overflow-hidden');
  }, [isOpen]);

  useFocusTrap(sheetRef, isOpen, onClose);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Advanced filters"
        className={`fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto bg-white rounded-t-2xl transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div aria-hidden="true" className="w-10 h-1 bg-library-border rounded-full mx-auto mt-3 mb-1" />

        <div className="relative flex items-center justify-center py-3 border-b border-library-border">
          <h2 className="font-garamond text-lg text-library-text-primary">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="absolute right-4 top-4 text-library-text-muted hover:text-library-text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
