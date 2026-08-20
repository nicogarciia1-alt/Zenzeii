/**
 * @fileoverview Tab system for the book detail page.
 *
 * Three tabs: About, Reviews, Related Books. Cultural Context does not
 * exist anywhere in this build — eliminated per product decision.
 */
import { useState } from 'react';
import { BookDetailAbout } from './BookDetailAbout';
import { BookDetailReviews } from './BookDetailReviews';
import { BookDetailRelated } from './BookDetailRelated';

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'related', label: 'Related Books' },
];

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 * @param {function} props.onBookUpdate
 */
export function BookDetailTabs({ book, onBookUpdate }) {
  const [activeTab, setActiveTab] = useState('about');

  return (
    <div>
      <div role="tablist" aria-label="Book details" className="flex items-center gap-8 border-b border-library-border/40">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 pt-2 text-sm transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 rounded-t ${
                isActive
                  ? 'font-semibold text-library-red border-b-2 border-library-red -mb-px'
                  : 'text-library-text-muted hover:underline'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {activeTab === 'about' && <BookDetailAbout book={book} />}
        {activeTab === 'reviews' && <BookDetailReviews book={book} onBookUpdate={onBookUpdate} />}
        {activeTab === 'related' && <BookDetailRelated />}
      </div>
    </div>
  );
}
