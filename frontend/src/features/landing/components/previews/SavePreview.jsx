import React from 'react';
import { HighlightedText } from '@/components/reader/HighlightedText';
import { buildVocabIndex } from '@/lib/vocabHighlight';

const VOCAB_INDEX = buildVocabIndex([
  { word: '博学', type: 'word' },
  { word: '才穎', type: 'word' },
  { word: '狷介', type: 'word' },
  { word: '恃', type: 'kanji' },
]);
const noop = () => {};

const SAVED = [
  { word: '博学', gloss: 'erudite' },
  { word: '才穎', gloss: 'gifted' },
  { word: '狷介', gloss: 'aloof' },
];

/**
 * 02 — Save: saved words listed beside the passage they came from, with the
 * Reader's real saved-word / saved-kanji highlighting. On hover the last
 * phrase becomes highlighted too — the "mark it for later" moment.
 */
export default function SavePreview() {
  return (
    <div className="lp-preview lp-save">
      <aside className="lp-save__rail">
        <p className="lp-save__label">SAVED</p>
        <ul className="lp-save__list">
          {SAVED.map(({ word, gloss }) => (
            <li key={word} className="lp-save__item">
              <span lang="ja">{word}</span>
              <small>{gloss}</small>
            </li>
          ))}
        </ul>
      </aside>
      <div className="lp-save__page" lang="ja">
        <p><HighlightedText text="隴西の李徴は博学才穎、" vocabIndex={VOCAB_INDEX} showWords showKanji onWordClick={noop} /></p>
        <p><HighlightedText text="性、狷介、自ら恃むところ" vocabIndex={VOCAB_INDEX} showWords showKanji onWordClick={noop} /></p>
        <p>すこぶる厚く、</p>
        <p><mark className="lp-save__pending">賤吏</mark>に甘んずるを…</p>
      </div>
    </div>
  );
}
