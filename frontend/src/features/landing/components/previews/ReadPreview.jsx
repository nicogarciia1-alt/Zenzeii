import React from 'react';
import { Volume2, X } from 'lucide-react';
import { HighlightedText } from '@/components/reader/HighlightedText';
import { buildVocabIndex } from '@/lib/vocabHighlight';

// Opening of 山月記 (Nakajima Atsushi, public domain), with one saved word
// rendered through the Reader's own HighlightedText.
const PASSAGE =
  '隴西の李徴は博学才穎、天宝の末年、若くして名を虎榜に連ね、ついで江南尉に補せられたが、性、狷介、自ら恃むところすこぶる厚く、賤吏に甘んずるを潔しとしなかった。';
const VOCAB_INDEX = buildVocabIndex([{ word: '博学', type: 'word' }]);
const noop = () => {};

/** 01 — Reader: vertical Japanese page, a saved word, and the lookup surface. */
export default function ReadPreview() {
  return (
    <div className="lp-preview lp-read">
      <p className="lp-read__page" lang="ja">
        <HighlightedText text={PASSAGE} vocabIndex={VOCAB_INDEX} showWords showKanji onWordClick={noop} />
      </p>
      <div className="lp-read__popup">
        <div className="lp-read__popup-head">
          <span className="lp-read__word" lang="ja">博学</span>
          <span className="lp-read__reading" lang="ja">（はくがく）</span>
          <X className="lp-read__close" size={10} aria-hidden="true" />
        </div>
        <p className="lp-read__gloss">erudite; widely read</p>
        <p className="lp-read__detail">Having deep knowledge across many fields of learning.</p>
        <Volume2 className="lp-read__speak" size={11} aria-hidden="true" />
      </div>
    </div>
  );
}
