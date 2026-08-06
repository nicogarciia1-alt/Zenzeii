/**
 * @fileoverview Dropdown menu for a single Library filter.
 *
 * Renders a floating panel of selectable options below the parent chip.
 * "All" is always the first option (clears the filter). Selected option
 * has a checkmark indicator. Closes on option select or Escape key —
 * outside-click closing is handled by the parent FilterChip, which owns
 * isOpen/onClose.
 *
 * Owns its own roving keyboard-highlight state (highlightedIndex) over
 * the combined [All, ...options] list, exposed to assistive tech via
 * aria-activedescendant rather than moving real DOM focus per option —
 * this is interaction/presentation state, not filter state, so it's
 * fine for this "controlled" component to manage internally.
 */
import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

const ALL_OPTION = { value: null, label: 'All' };

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').FilterOption[]} props.options - Available options
 * @param {string|null} props.selectedValue - Currently selected value
 * @param {function} props.onSelect - Called with selected value (null for "All")
 * @param {boolean} props.isOpen - Controls visibility
 * @param {function} props.onClose - Called to close the dropdown
 * @param {string} props.filterId - Used for positioning and aria relationships
 */
export function FilterDropdown({ options, selectedValue, onSelect, isOpen, onClose, filterId }) {
  const listRef = useRef(null);
  const combined = [ALL_OPTION, ...options];
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const initialIndex = combined.findIndex((o) => o.value === selectedValue);
    setHighlightedIndex(initialIndex === -1 ? 0 : initialIndex);
    listRef.current?.focus();
    // Only re-sync when the dropdown opens, not on every combined/selectedValue re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

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
      className="absolute top-full left-0 mt-2 z-40 min-w-[160px] max-w-[240px] max-h-[280px] overflow-y-auto bg-white rounded-lg border border-library-border shadow-md py-1 animate-in fade-in-0 slide-in-from-top-1 duration-150 focus:outline-none"
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
