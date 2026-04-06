import React from 'react';
import { segmentText } from '@/lib/vocabHighlight';

/**
 * Renders a Japanese text string with vocabulary words highlighted.
 *
 * Word matches  (multi-char saved words) → amber highlight
 * Kanji matches (single-char saved kanji) → sky-blue highlight
 *
 * Each highlighted segment is individually clickable (opens dictionary popup).
 * Non-highlighted text is also clickable for ad-hoc lookups via selection.
 *
 * Props:
 *   text        – the sentence string to render
 *   vocabIndex  – { words, kanji } from buildVocabIndex()
 *   onWordClick – (word, event) => void — same signature as ReaderPage's handleWordClick
 */
export const HighlightedText = ({ text, vocabIndex, onWordClick }) => {
  const segments = segmentText(text, vocabIndex);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'normal') {
          return (
            <span
              key={i}
              className="cursor-pointer hover:bg-primary/10 hover:text-primary rounded-sm px-0.5 transition-colors"
              onClick={(e) => {
                const selection = window.getSelection();
                const selected = selection?.toString().trim();
                if (selected) {
                  onWordClick(selected, e);
                } else if (seg.text.trim()) {
                  const firstWord = seg.text.split(/[\s、。！？]/)[0];
                  if (firstWord) onWordClick(firstWord, e);
                }
              }}
            >
              {seg.text}
            </span>
          );
        }

        const isWord = seg.type === 'word';
        return (
          <span
            key={i}
            className={[
              'rounded-sm px-0.5 cursor-pointer transition-colors',
              isWord
                ? 'bg-amber-200/60 text-amber-900 hover:bg-amber-300/70 dark:bg-amber-700/35 dark:text-amber-200 dark:hover:bg-amber-700/50'
                : 'bg-sky-200/60 text-sky-900 hover:bg-sky-300/70 dark:bg-sky-700/35 dark:text-sky-200 dark:hover:bg-sky-700/50',
            ].join(' ')}
            title={isWord ? 'Saved word' : 'Saved kanji'}
            onClick={(e) => {
              e.stopPropagation();
              onWordClick(seg.text, e);
            }}
          >
            {seg.text}
          </span>
        );
      })}
    </>
  );
};

export default HighlightedText;
