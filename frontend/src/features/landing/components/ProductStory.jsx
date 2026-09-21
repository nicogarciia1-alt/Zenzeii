import React from 'react';

/**
 * One column of the product exhibition: a small window into the real
 * product (children), then number + Japanese action, phrase, English line.
 *
 * The visual is decorative and non-interactive by design — `inert` keeps it
 * out of the tab order and the accessibility tree (the text beneath carries
 * the meaning) and stops the static previews behaving like live controls.
 */
export default function ProductStory({ number, action, actionEnglish, phrase, description, children }) {
  return (
    <li className="lp-story">
      <div className="lp-visual" aria-hidden="true" inert>
        {children}
      </div>
      <div className="lp-story__body">
        <div className="lp-story__title">
          <span className="lp-story__num" aria-hidden="true">{number}</span>
          <h3 className="lp-story__action" lang="ja">
            {action}
            <span className="lp-sr-only" lang="en"> ({actionEnglish})</span>
          </h3>
        </div>
        <p className="lp-story__phrase" lang="ja">{phrase}</p>
        <p className="lp-story__desc">{description}</p>
      </div>
    </li>
  );
}
