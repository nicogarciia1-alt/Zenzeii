import React from 'react';
import { Sparkles, X } from 'lucide-react';

/**
 * 04 — Understand: a selected word in the text, and the "Ask Zenzeii"
 * explanation panel that answers it without leaving the book. Mirrors the
 * DictionaryPopup's AI section (Sparkles + Ask Zenzeii) as a static view.
 */
export default function ExplainPreview() {
  return (
    <div className="lp-preview lp-explain">
      <p className="lp-explain__line" lang="ja">
        …そこに<mark className="lp-explain__selection">侘び寂び</mark>の心を見て、
      </p>
      <div className="lp-explain__panel">
        <div className="lp-explain__head">
          <span className="lp-explain__ask"><Sparkles size={11} aria-hidden="true" />Ask Zenzeii</span>
          <X size={10} aria-hidden="true" />
        </div>
        <p className="lp-explain__word">
          <span lang="ja">侘び寂び</span> <span className="lp-explain__reading" lang="ja">（わびさび）</span>
        </p>
        <p className="lp-explain__romaji">wabi-sabi</p>
        <p className="lp-explain__body">
          A Japanese aesthetic of finding beauty in imperfection, transience, and the natural cycle of life.
        </p>
      </div>
    </div>
  );
}
