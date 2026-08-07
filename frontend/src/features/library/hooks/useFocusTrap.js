/**
 * @fileoverview Manual focus trap for the Phase 8 advanced-filter
 * containers (MoreFiltersPopover, MoreFiltersBottomSheet). No library —
 * per Phase 8's explicit constraint.
 *
 * While active: focuses the first focusable element inside the
 * container, keeps Tab/Shift+Tab cycling within it, and reports Escape
 * via onEscape. Does not move focus on deactivation — the caller decides
 * where focus goes on close (typically back to the element that opened
 * the container).
 *
 * @param {React.RefObject<HTMLElement>} containerRef
 * @param {boolean} isActive
 * @param {function} [onEscape]
 */
import { useEffect } from 'react';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(containerRef, isActive, onEscape) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return undefined;

    const container = containerRef.current;
    const getFocusable = () => Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));

    getFocusable()[0]?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, containerRef, onEscape]);
}
