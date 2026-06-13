/**
 * Vocabulary highlight utilities.
 * Pure functions — no React, no side effects.
 */

/**
 * Build lookup structures from a savedWords array.
 * Call once per savedWords change (useMemo in the consumer).
 *
 * @param {Array} savedWords  – array of SavedWordResponse objects from the API
 * @returns {{ formEntries: Array<{form: string, word: string}>, kanjiSet: Set<string> }}
 *   formEntries – flat list of {form, word} pairs for all word-type entries,
 *                 sorted longest-first for greedy matching
 *   kanjiSet    – single CJK characters saved as standalone kanji entries
 */
export function buildVocabIndex(savedWords) {
  if (!savedWords || savedWords.length === 0) {
    return { formEntries: [], kanjiSet: new Set() };
  }

  const formEntries = [];
  const kanjiSet = new Set();

  for (const w of savedWords) {
    if (!w.word) continue;

    const isKanji =
      w.type === 'kanji' ||
      (!w.type && w.word.length === 1 && isCJK(w.word));

    if (isKanji) {
      kanjiSet.add(w.word);
      continue;
    }

    // Word entry — collect all available forms, newest fields take priority,
    // fall back to legacy reading/romaji fields for pre-redesign records
    const candidates = [
      w.kanji_form    || w.word,
      w.hiragana_form || w.reading  || null,
      w.katakana_form               || null,
      w.romaji_form   || w.romaji   || null,
    ].filter(f => f && f.length > 0);

    // Deduplicate forms for this entry
    for (const form of new Set(candidates)) {
      formEntries.push({ form, word: w.word });
    }
  }

  // Longest-first so the greedy scanner always prefers longer matches
  formEntries.sort((a, b) => b.form.length - a.form.length);

  return { formEntries, kanjiSet };
}

/**
 * Segment a text string into highlighted and normal parts.
 *
 * @param {string} text
 * @param {{ formEntries: Array<{form, word}>, kanjiSet: Set<string> }} vocabIndex
 * @param {{ showWords?: boolean, showKanji?: boolean }} options
 * @returns {Array<{ text: string, type: 'normal' | 'word' | 'kanji' | 'word-and-kanji' }>}
 *
 * Segment types:
 *   'normal'        – no highlight
 *   'word'          – part of a saved word match
 *   'kanji'         – standalone saved kanji character
 *   'word-and-kanji'– character that is both inside a word match AND a saved kanji
 */
export function segmentText(text, vocabIndex, { showWords = true, showKanji = true } = {}) {
  if (!text) return [{ text: '', type: 'normal' }];

  const { formEntries, kanjiSet } = vocabIndex;
  const hasWords = showWords && formEntries.length > 0;
  const hasKanji = showKanji && kanjiSet.size > 0;

  if (!hasWords && !hasKanji) {
    return [{ text, type: 'normal' }];
  }

  const segments = [];
  let i = 0;

  while (i < text.length) {
    let matched = false;

    if (hasWords) {
      for (const { form } of formEntries) {
        if (
          i + form.length <= text.length &&
          text.slice(i, i + form.length) === form
        ) {
          if (hasKanji) {
            // Walk the matched span char-by-char to surface word-and-kanji overlaps.
            // Merge consecutive characters of the same sub-type into one segment.
            let subtext = '';
            let subtype = null;
            for (const char of form) {
              const charType = kanjiSet.has(char) ? 'word-and-kanji' : 'word';
              if (charType === subtype) {
                subtext += char;
              } else {
                if (subtext) segments.push({ text: subtext, type: subtype });
                subtext = char;
                subtype = charType;
              }
            }
            if (subtext) segments.push({ text: subtext, type: subtype });
          } else {
            segments.push({ text: form, type: 'word' });
          }

          i += form.length;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      const char = text[i];
      if (hasKanji && kanjiSet.has(char)) {
        segments.push({ text: char, type: 'kanji' });
      } else {
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
