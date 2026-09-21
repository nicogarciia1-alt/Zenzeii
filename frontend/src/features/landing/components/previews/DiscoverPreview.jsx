import React from 'react';
import GeneratedBookCover from '@/components/books/GeneratedBookCover';
import { PREVIEW_BOOKS } from '../../data/previewBooks';

// The Library's real filter groups (see FilterSidebar).
const FILTERS = ['Genre', 'Difficulty', 'JLPT', 'Length', 'Theme'];
const COVERS = ['kokoro', 'rashomon', 'sangetsuki'];

/**
 * 06 — Discover: a static, simplified presentation of the Library — filter
 * structure on the left, catalog covers on the right.
 */
export default function DiscoverPreview() {
  return (
    <div className="lp-preview lp-discover">
      <aside className="lp-discover__rail">
        <p className="lp-discover__brand">ZENZEII</p>
        <ul>
          {FILTERS.map((name, i) => (
            <li key={name} data-active={i === 0 ? 'true' : 'false'}>{name}</li>
          ))}
        </ul>
      </aside>
      <div className="lp-discover__main">
        <p className="lp-discover__title">Library</p>
        <div className="lp-discover__grid">
          {COVERS.map((key) => (
            <div key={key} className="lp-discover__cover">
              <GeneratedBookCover book={PREVIEW_BOOKS[key]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
