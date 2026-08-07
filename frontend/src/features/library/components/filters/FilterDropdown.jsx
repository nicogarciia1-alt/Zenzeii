/**
 * @fileoverview Dropdown menu for a single Library filter.
 *
 * Renders a floating panel of selectable options below the parent chip.
 * "All" is always the first option (clears the filter). Selected option
 * has a checkmark indicator. Closes on option select or Escape key —
 * outside-click closing is handled by the parent FilterChip, which owns
 * isOpen/onClose.
 *
 * position: fixed, anchored via anchorRef.getBoundingClientRect() rather
 * than the usual absolute + relative-parent pattern. FilterBar's toolbar
 * row needs overflow-x-auto for horizontal chip scroll on narrow
 * viewports, and per the CSS overflow spec, an element with overflow-x
 * set to anything but visible has its overflow-y computed as auto too —
 * there is no way to keep one axis scrollable and the other visible on
 * the same element. An absolutely-positioned dropdown nested inside that
 * row is clipped by it regardless. Fixed positioning sidesteps the rule
 * entirely: its containing block is the viewport (nothing in the
 * FilterBar/LibraryPage/Layout ancestor chain sets a transform, filter,
 * or will-change that would capture it instead), so no ancestor's
 * overflow or stacking context can clip it.
 *
 * Owns its own roving keyboard-highlight state (highlightedIndex) over
 * the combined [All, ...options] list, exposed to assistive tech via
 * aria-activedescendant rather than moving real DOM focus per option —
 * this is interaction/presentation state, not filter state, so it's
 * fine for this "controlled" component to manage internally.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

const ALL_OPTION = { value: null, label: 'All' };
/** Gap between the chip's bottom edge and the dropdown — matches the old mt-2. */
const DROPDOWN_GAP_PX = 8;
/** Upper bound on dropdown height when there's plenty of room below the chip. */
const MAX_DROPDOWN_HEIGHT_PX = 280;
/** Breathing room between the dropdown's bottom edge and the viewport edge. */
const VIEWPORT_MARGIN_PX = 8;

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').FilterOption[]} props.options - Available options
 * @param {string|null} props.selectedValue - Currently selected value
 * @param {function} props.onSelect - Called with selected value (null for "All")
 * @param {boolean} props.isOpen - Controls visibility
 * @param {function} props.onClose - Called to close the dropdown
 * @param {string} props.filterId - Used for positioning and aria relationships
 * @param {React.RefObject<HTMLElement>} props.anchorRef - Ref to the chip element the dropdown is measured against
 */
export function FilterDropdown({ options, selectedValue, onSelect, isOpen, onClose, filterId, anchorRef }) {
  const listRef = useRef(null);
  const combined = [ALL_OPTION, ...options];
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const initialIndex = combined.findIndex((o) => o.value === selectedValue);
    setHighlightedIndex(initialIndex === -1 ? 0 : initialIndex);
    listRef.current?.focus();
    // Only re-sync when the dropdown opens, not on every combined/selectedValue re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // useLayoutEffect (not useEffect): measures and commits the position
  // synchronously before the browser paints, so the dropdown never
  // flashes at (0,0) or its previous position for a frame before jumping
  // to the right place.
  useLayoutEffect(() => {
    if (!isOpen || !anchorRef?.current) return undefined;

    const updatePosition = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const top = rect.bottom + DROPDOWN_GAP_PX;
      // A static max-h-* class can't know how much room is actually left
      // below `top` — if the chip sits low in the viewport (e.g. the
      // filter bar hasn't stuck to the top yet), a fixed 280px budget
      // would run the dropdown past the viewport edge, and the part
      // beyond that edge is genuinely unreachable: page scroll doesn't
      // move a position:fixed element, and overflow-y-auto only scrolls
      // content overflowing the box's own height, not the part of the
      // box rendered off-screen. Clamping to whatever room actually
      // exists keeps the whole list reachable via the internal scrollbar
      // instead of silently clipping it.
      const maxHeight = Math.max(0, Math.min(MAX_DROPDOWN_HEIGHT_PX, window.innerHeight - top - VIEWPORT_MARGIN_PX));
      setPosition({ top, left: rect.left, maxHeight });
    };

    updatePosition();
    // capture:true so this also fires for scrolls on any scrollable
    // ancestor, not just window — the chip's own position in the
    // viewport can change from either.
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, anchorRef]);

  if (!isOpen || !position) return null;

  const optionId = (i) => `${filterId}-option-${i}`;

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, combined.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelect(combined[highlightedIndex].value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      ref={listRef}
      id={`filter-dropdown-${filterId}`}
      role="listbox"
      tabIndex={-1}
      aria-activedescendant={optionId(highlightedIndex)}
      onKeyDown={handleKeyDown}
      style={{ top: position.top, left: position.left, maxHeight: position.maxHeight }}
      className="fixed z-40 min-w-[160px] max-w-[240px] overflow-y-auto bg-white rounded-lg border border-library-border shadow-md py-1 animate-in fade-in-0 slide-in-from-top-1 duration-150 focus:outline-none"
    >
      {combined.map((option, i) => {
        const isSelected = option.value === selectedValue;
        const isHighlighted = i === highlightedIndex;
        return (
          <div
            key={option.value ?? '__all__'}
            id={optionId(i)}
            role="option"
            aria-selected={isSelected}
            onMouseEnter={() => setHighlightedIndex(i)}
            onClick={() => onSelect(option.value)}
            className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm cursor-pointer ${
              isSelected ? 'text-library-red' : 'text-library-text-primary'
            } ${isHighlighted ? 'bg-library-bg-shelf' : 'hover:bg-library-bg-shelf'}`}
          >
            <span>{option.label}</span>
            {isSelected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}
