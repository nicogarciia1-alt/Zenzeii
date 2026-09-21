import React from 'react';
import GeneratedBookCover from '@/components/books/GeneratedBookCover';
import { PREVIEW_BOOKS } from '../../data/previewBooks';

const STRIP = ['sangetsuki', 'rashomon', 'kokoro', 'melos', 'ginga'];

/**
 * 05 — Community: a shelf shown as cover strip, name, owner, book count,
 * followers and a restrained Follow control. No hearts, likes or feed.
 *
 * NOTE: public community shelves (owners / followers / Follow) are not yet
 * a shipped feature — the owner, counts and Follow control are illustrative
 * demo data for this presentation, not read from any API.
 */
export default function CommunityPreview() {
  return (
    <div className="lp-preview lp-community">
      <div className="lp-community__head">
        <span className="lp-community__title">Community Shelves</span>
        <span className="lp-community__all">See all →</span>
      </div>
      <div className="lp-community__strip">
        {STRIP.map((key) => (
          <div key={key} className="lp-community__cover">
            <GeneratedBookCover book={PREVIEW_BOOKS[key]} />
          </div>
        ))}
      </div>
      <div className="lp-community__owner">
        <span className="lp-community__avatar" aria-hidden="true">h</span>
        <span className="lp-community__who">
          <strong>haruka</strong>
          <small>27 books · 1.4K followers</small>
        </span>
        <span className="lp-community__follow">Follow</span>
      </div>
    </div>
  );
}
