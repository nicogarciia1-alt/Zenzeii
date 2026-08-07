/**
 * @fileoverview "Your next book" recommendation section.
 *
 * Renders the featured book recommendation and quiz prompt card directly
 * below the hero. Still hardcoded to the seeded Kokoro entry from
 * mockCatalog.js as of Phase 11 — deliberately not wired to live data.
 * Personalized recommendations need actual user signal (reading history,
 * saved books) to mean anything, which doesn't exist yet; a real
 * catalog fetch here would just swap one arbitrary hardcoded book for
 * another. Revisit once personalization has a real backend to call.
 *
 * No props — data sourced from mock.
 */
import { SectionHeader } from '../shelves/SectionHeader';
import { RecommendationCard } from './RecommendationCard';
import { QuizPromptCard } from './QuizPromptCard';
import { MOCK_CATALOG_BOOKS } from '../../data/mockCatalog';

const featuredBook = MOCK_CATALOG_BOOKS.find((b) => b.id === 'aozora-kokoro');

export function RecommendationSection() {
  return (
    <section className="max-w-[1440px] mx-auto px-5 md:px-12 lg:px-20 py-12">
      <SectionHeader icon="✦" title="Your next book" subtitle="Recommended for you" />
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {featuredBook && (
          <RecommendationCard book={featuredBook} isBookmarked={featuredBook.is_on_shelf} />
        )}
        <QuizPromptCard />
      </div>
    </section>
  );
}
