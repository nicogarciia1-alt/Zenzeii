import React from 'react';
import { segmentText } from '@/lib/vocabHighlight';

/**
 * Renders a Japanese text string with vocabulary words and kanji highlighted.
 *
 * Segment types and visual treatment:
 *   'word'          → amber background  (saved word match)
 *   'kanji'         → sky background    (standalone saved kanji)
 *   'word-and-kanji'→ amber background + sky underline (both active simultaneously)
 *   'normal'        → no highlight, clickable for ad-hoc lookup
 *
 * Props:
 *   text        – the sentence string to render
 *   vocabIndex  – { formEntries, kanjiSet } from buildVocabIndex()
 *   showWords   – boolean, enable word highlights
 *   showKanji   – boolean, enable kanji highlights
 *   onWordClick – (word, event) => void
 */
export const HighlightedText = ({ text, vocabIndex, showWords, showKanji, onWordClick }) => {
  const segments = segmentText(text, vocabIndex, { showWords, showKanji });

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

        if (seg.type === 'word') {
          return (
            <span
              key={i}
              className="rounded-sm px-0.5 cursor-pointer transition-colors bg-amber-200/60 text-amber-900 hover:bg-amber-300/70 dark:bg-amber-700/35 dark:text-amber-200 dark:hover:bg-amber-700/50"
              title="Saved word"
              onClick={(e) => { e.stopPropagation(); onWordClick(seg.text, e); }}
            >
              {seg.text}
            </span>
          );
        }

        if (seg.type === 'kanji') {
          return (
            <span
              key={i}
              className="rounded-sm px-0.5 cursor-pointer transition-colors bg-sky-200/60 text-sky-900 hover:bg-sky-300/70 dark:bg-sky-700/35 dark:text-sky-200 dark:hover:bg-sky-700/50"
              title="Saved kanji"
              onClick={(e) => { e.stopPropagation(); onWordClick(seg.text, e); }}
            >
              {seg.text}
            </span>
          );
        }

        // 'word-and-kanji': amber background (word) + sky underline (kanji)
        return (
          <span
            key={i}
            className="rounded-sm px-0.5 cursor-pointer transition-colors bg-amber-200/60 text-amber-900 hover:bg-amber-300/70 dark:bg-amber-700/35 dark:text-amber-200 dark:hover:bg-amber-700/50 underline decoration-sky-500 decoration-2 underline-offset-2"
            title="Saved word · Saved kanji"
            onClick={(e) => { e.stopPropagation(); onWordClick(seg.text, e); }}
          >
            {seg.text}
          </span>
        );
      })}
    </>
  );
};

export default HighlightedText;
