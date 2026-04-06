import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Short display labels for each secondary layer option
const SHORT_LABELS = {
  furigana: 'ふり',
  kanji: '漢字',
  english: 'EN',
};

/**
 * Secondary script selector + show/hide toggle.
 * Appears below the primary ScriptToggle in the reading bar.
 *
 * Props:
 *   value          – current secondary layer ('none' | 'furigana' | 'kanji' | 'english')
 *   onChange       – called with new value when an option is clicked
 *   options        – array of { value, label } from getSecondaryOptions() (includes 'none')
 *   show           – boolean: whether subtext is currently visible
 *   onToggleShow   – called when the eye button is clicked
 */
export const SecondaryScriptToggle = ({ value, onChange, options, show, onToggleShow }) => {
  const selectableOptions = options.filter(o => o.value !== 'none');

  // Nothing to offer if there are no valid secondary options
  if (selectableOptions.length === 0) return null;

  const handleOptionClick = (optValue) => {
    if (optValue === value) {
      // Clicking the active option deselects it
      onChange('none');
    } else {
      onChange(optValue);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground shrink-0">Subtext</span>

      <div className="flex items-center gap-1 flex-wrap">
        {selectableOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleOptionClick(opt.value)}
            className={`
              px-2.5 py-1 rounded text-xs font-medium transition-colors
              ${opt.value === value
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
              }
              ${['furigana', 'kanji'].includes(opt.value) ? 'font-serif' : ''}
            `}
            title={opt.label}
          >
            {SHORT_LABELS[opt.value] ?? opt.label}
          </button>
        ))}
      </div>

      {/* Show/hide toggle — only visible when a layer is selected */}
      {value !== 'none' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onToggleShow}
          title={show ? 'Hide subtext' : 'Show subtext'}
        >
          {show ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  );
};

export default SecondaryScriptToggle;
