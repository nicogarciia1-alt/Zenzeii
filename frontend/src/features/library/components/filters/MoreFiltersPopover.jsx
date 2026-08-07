/**
 * @fileoverview Desktop popover container for the advanced filter panel.
 *
 * Renders as a floating panel positioned below the filter bar, aligned
 * to the same max-width content column as the rest of the page. Opens
 * with a fade + slight slide-down; closes the same way in reverse —
 * unlike a naive conditional-render, this component stays mounted for
 * the closing transition's duration so the exit actually animates
 * instead of the panel just vanishing.
 *
 * Closes on outside click or Escape. Does NOT close when the user
 * interacts with filters inside it — liveUpdate=true means those apply
 * live, and staying open is the point.
 */
import { useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const EXIT_DURATION_MS = 200;

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls visibility
 * @param {function} props.onClose - Called to close the popover (outside click, Escape, or panel's own Done/Apply)
 * @param {React.RefObject<HTMLElement>} [props.triggerRef] - Ref to the element that opened the popover — excluded from
 *   outside-click detection so re-clicking it doesn't close-then-reopen in the same gesture
 * @param {React.ReactNode} props.children - MoreFiltersPanel content
 */
export function MoreFiltersPopover({ isOpen, onClose, triggerRef, children }) {
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef(null);

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
    if (!isOpen) return undefined;
    const handleOutsideClick = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (triggerRef?.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose, triggerRef]);

  useFocusTrap(panelRef, isOpen, onClose);

  if (!mounted) return null;

  return (
    <div className="fixed top-14 inset-x-0 z-50 px-5 md:px-12 lg:px-20 pointer-events-none">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-label="Advanced filters"
        className={`max-w-[1440px] mx-auto max-h-[calc(100vh-56px-48px)] overflow-y-auto bg-white border border-library-border rounded-b-lg shadow-lg transition-all duration-200 ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      >
        {children}
      </div>
    </div>
  );
}
