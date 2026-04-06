/**
 * Vocabulary highlight utilities.
 * Pure functions — no React, no side effects.
 */

/**
 * Build lookup structures from a savedWords array.
 * Call once per savedWords change (useMemo in the consumer).
 *
 * @param {Array} savedWords  – array of SavedWordResponse objects from the API
 * @returns {{ words: string[], kanji: Set<string> }}
 *   words  – multi-character saved words, sorted longest-first for greedy matching
 *   kanji  – single CJK characters saved as standalone vocabulary entries
 */
export function buildVocabIndex(savedWords) {
  if (!savedWords || savedWords.length === 0) {
    return { words: [], kanji: new Set() };
  }

  const words = savedWords
    .map(w => w.word)
    .filter(w => w && w.length > 1)
    .sort((a, b) => b.length - a.length); // longest first — prevents partial shadowing

  const kanji = new Set(
    savedWords
      .map(w => w.word)
      .filter(w => w && w.length === 1 && isCJK(w))
  );

  return { words, kanji };
}

/**
 * Segment a Japanese text string into highlighted and normal parts.
 *
 * @param {string} text
 * @param {{ words: string[], kanji: Set<string> }} vocabIndex
 * @returns {Array<{ text: string, type: 'normal' | 'word' | 'kanji' }>}
 */
export function segmentText(text, vocabIndex) {
  if (!text) return [{ text: '', type: 'normal' }];

  const { words, kanji } = vocabIndex;
  if (words.length === 0 && kanji.size === 0) {
    return [{ text, type: 'normal' }];
  }

  const segments = [];
  let i = 0;

  while (i < text.length) {
    let matched = false;

    // Try longest multi-character word match first
    for (const word of words) {
      if (
        i + word.length <= text.length &&
        text.slice(i, i + word.length) === word
      ) {
        segments.push({ text: word, type: 'word' });
        i += word.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      const char = text[i];

      if (kanji.has(char)) {
        segments.push({ text: char, type: 'kanji' });
      } else {
        // Merge consecutive normal characters into one segment
        const last = segments[segments.length - 1];
        if (last && last.type === 'normal') {
          last.text += char;
        } else {
          segments.push({ text: char, type: 'normal' });
        }
      }
      i++;
    }
  }

  return segments;
}

/** True if char is in a CJK Unicode block */
function isCJK(char) {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||  // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) ||  // CJK Extension A
    (code >= 0xf900 && code <= 0xfaff)     // CJK Compatibility Ideographs
  );
}
