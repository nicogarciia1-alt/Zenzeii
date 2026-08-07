/**
 * @fileoverview Individual filter chip for the Library filter bar.
 *
 * Renders an icon, filter label, and current selected value. Opens a
 * FilterDropdown on click. Manages open/close state locally, including
 * outside-click and Escape-key closing.
 *
 * Phase 3: filter state is local only, no catalog connection.
 * Phase 6: receives onFilterChange callback to propagate to useCatalog hook.
 */
import { useEffect, useRef, useState } from 'react';
import { FilterDropdown } from './FilterDropdown';

/**
 * @param {Object} props
 * @param {string} props.filterId - Unique ID matching libraryConstants filter keys
 * @param {string} props.label - Display label (e.g. "Genre", "Difficulty")
 * @param {React.ReactNode} props.icon - Icon element (lucide-react icon)
 * @param {import('../../types/catalogTypes').FilterOption[]} props.options - Available options for this filter
 * @param {string|null} props.value - Currently selected option value (null = All)
 * @param {function} props.onChange - Called with new value when selection changes
 * @param {boolean} [props.disabled] - Disables interaction (used during API loading)
 */
export function FilterChip({ filterId, label, icon, options, value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const chipRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (chipRef.current && !chipRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);
  const displayValue = selectedOption ? selectedOption.label : 'All';
  const isActive = value != null;

  const handleSelect = (newValue) => {
    onChange(newValue);
    setIsOpen(false);
  };

  const chipAriaLabel = `${label} filter, currently set to ${displayValue}`;

  return (
    <div ref={chipRef} className="relative h-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`filter-dropdown-${filterId}`}
        aria-label={chipAriaLabel}
        className={`h-full w-full flex flex-col items-center justify-center gap-0.5 px-3 min-w-[80px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-inset ${
          isActive ? 'border-b-2 border-b-library-red' : 'border-b-2 border-b-transparent'
        } ${isActive || isOpen ? 'bg-library-filter-active' : 'hover:bg-library-bg-shelf'}`}
      >
        <span
          className={`transition-colors duration-150 ${isActive ? 'text-library-red' : 'text-library-text-secondary'}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span
          className={`hidden lg:block text-xs transition-colors duration-150 ${
            isActive ? 'text-library-text-primary' : 'text-library-text-secondary'
          }`}
        >
          {label}
        </span>
        <span
          className={`text-xs transition-colors duration-150 ${isActive ? 'text-library-red' : 'text-library-text-muted'}`}
        >
          {displayValue}
        </span>
      </button>

      <FilterDropdown
        filterId={filterId}
        options={options}
        selectedValue={value}
        onSelect={handleSelect}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
