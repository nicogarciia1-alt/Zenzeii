import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const scriptModes = [
  { value: 'kanji', label: '漢字', description: 'Kanji' },
  { value: 'hiragana', label: 'ひらがな', description: 'Hiragana' },
  { value: 'katakana', label: 'カタカナ', description: 'Katakana' },
  { value: 'romaji', label: 'Romaji', description: 'Romaji' },
  { value: 'english', label: 'EN', description: 'English' },
];

export const ScriptToggle = ({ value, onChange }) => {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">Script Mode</span>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v)}
        className="justify-start flex-wrap"
      >
        {scriptModes.map((mode) => (
          <ToggleGroupItem
            key={mode.value}
            value={mode.value}
            aria-label={mode.description}
            className="px-3 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            data-testid={`script-toggle-${mode.value}`}
          >
            <span className="font-medium">{mode.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

export default ScriptToggle;
