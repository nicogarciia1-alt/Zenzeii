import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import ScriptToggle from './ScriptToggle';

export const READER_THEMES = [
  {
    value: 'default',
    name: 'Default',
    description: 'System theme',
    bg: null,
    text: null,
    border: null,
  },
  {
    value: 'washi',
    name: '和紙',
    description: 'Washi — warm cream paper',
    bg: '#f5efe0',
    text: '#3d2b1f',
    border: '#c8b89a',
  },
  {
    value: 'sumi',
    name: '墨',
    description: 'Sumi — dark ink',
    bg: '#1c1a17',
    text: '#e5dfd5',
    border: '#2e2c28',
  },
  {
    value: 'sakura',
    name: '桜',
    description: 'Sakura — soft pink',
    bg: '#fdf0f3',
    text: '#4a1f2e',
    border: '#f0c4d0',
  },
  {
    value: 'take',
    name: '竹',
    description: 'Take — bamboo green',
    bg: '#f0f5ec',
    text: '#1f3d2b',
    border: '#c4d8b8',
  },
];

export const FONT_OPTIONS = [
  { value: 'noto-serif', label: 'Noto Serif JP', css: '"Noto Serif JP", serif' },
  { value: 'noto-sans', label: 'Noto Sans JP', css: '"Noto Sans JP", sans-serif' },
  { value: 'shippori', label: 'Shippori Mincho', css: '"Shippori Mincho", serif' },
  { value: 'zen-mincho', label: 'Zen Old Mincho', css: '"Zen Old Mincho", serif' },
  { value: 'sawarabi', label: 'Sawarabi Mincho', css: '"Sawarabi Mincho", serif' },
  { value: 'klee', label: 'Klee One', css: '"Klee One", cursive' },
  { value: 'm-plus', label: 'M PLUS Rounded 1c', css: '"M PLUS Rounded 1c", sans-serif' },
  { value: 'merriweather', label: 'Merriweather', css: '"Merriweather", serif' },
];

export const FONT_SIZE_STEPS = ['sm', 'base', 'lg', 'xl'];
const FONT_SIZE_LABELS = ['S', 'M', 'L', 'XL'];

export const SENTENCES_PER_PAGE_OPTIONS = [10, 20, 30, 50, 75, 100];

const ReaderCustomizationPanel = ({
  readerTheme,
  onThemeChange,
  fontFamily,
  onFontFamilyChange,
  fontSizeIndex,
  onFontSizeChange,
  sentencesPerPage,
  onSentencesPerPageChange,
  lineHeight,
  onLineHeightChange,
  scriptMode,
  onScriptModeChange,
  secondaryLayer,
  onSecondaryLayerChange,
  secondaryOptions,
  showSecondaryText,
  onToggleSecondaryText,
}) => {
  return (
    <div className="space-y-6 mt-6">
      {/* Theme */}
      <div className="space-y-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Aesthetic Theme</span>
        <div className="grid grid-cols-5 gap-2">
          {READER_THEMES.map((theme) => {
            const isSelected = readerTheme === theme.value;
            return (
              <button
                key={theme.value}
                onClick={() => onThemeChange(theme.value)}
                title={theme.description}
                className={[
                  'flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-all border-2',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-transparent hover:border-border',
                ].join(' ')}
              >
                <div
                  className="w-8 h-8 rounded-md border border-black/10 shadow-sm flex items-center justify-center"
                  style={
                    theme.bg
                      ? { backgroundColor: theme.bg }
                      : { background: 'linear-gradient(135deg, #f5f5f5 50%, #1a1a2e 50%)' }
                  }
                >
                  {theme.text && (
                    <span
                      className="text-[10px] font-bold leading-none"
                      style={{ color: theme.text, fontFamily: '"Noto Serif JP", serif' }}
                    >
                      あ
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground leading-none">
                  {theme.value === 'default' ? 'Auto' : theme.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Font Family */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Font</span>
        <Select value={fontFamily} onValueChange={onFontFamilyChange}>
          <SelectTrigger data-testid="font-family-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.css }}>
                  {font.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Font Size</span>
          <span className="text-xs font-medium text-foreground">
            {FONT_SIZE_LABELS[fontSizeIndex]}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={FONT_SIZE_STEPS.length - 1}
          step={1}
          value={fontSizeIndex}
          onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
          className="w-full accent-primary cursor-pointer"
          data-testid="font-size-slider"
        />
        <div className="flex justify-between text-xs text-muted-foreground select-none">
          {FONT_SIZE_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>

      {/* Line Height */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Line Spacing</span>
        <Select value={lineHeight} onValueChange={onLineHeightChange}>
          <SelectTrigger data-testid="line-height-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="relaxed">Relaxed</SelectItem>
            <SelectItem value="loose">Loose</SelectItem>
          </SelectContent>
        </Select>
      </div>


      <Separator />

      {/* Script Mode */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Script</span>
        <ScriptToggle value={scriptMode} onChange={onScriptModeChange} />
      </div>

      {/* Secondary Layer */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Secondary Layer</span>
        <p className="text-xs text-muted-foreground/70">Show additional text below each sentence</p>
        <Select value={secondaryLayer} onValueChange={onSecondaryLayerChange}>
          <SelectTrigger data-testid="secondary-layer-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {secondaryOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ReaderCustomizationPanel;
