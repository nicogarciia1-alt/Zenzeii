/**
 * @fileoverview Zenzeii Library — book detail page.
 *
 * New route (/library/:bookId), not a modal. Renders full book information
 * from GET /api/catalog/{bookId} and composes the detail component tree:
 *
 *   BookDetailPage
 *     BookDetailBack
 *     BookDetailHero (cover / info / metadata, three columns)
 *     BookDetailTabs (About / Reviews / Related Books)
 *     BookDetailStickyBar
 *
 * `book` state lives here, not in useBookDetail — BookmarkButton owns its
 * own local optimistic state, but ImportButton's completion and rating
 * submission both need to update fields the rest of the page reads
 * (is_on_shelf, rating_avg/count/distribution, my_rating), so those flow
 * up through onBookUpdate rather than each child keeping a disconnected
 * copy.
 */
import { useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useBookDetail } from '@/features/library/hooks/useBookDetail';
import { useTaxonomy } from '@/features/library/hooks/useTaxonomy';
import { BookDetailBack } from '@/features/library/components/detail/BookDetailBack';
import { BookDetailHero } from '@/features/library/components/detail/BookDetailHero';
import { BookDetailTabs } from '@/features/library/components/detail/BookDetailTabs';
import { BookDetailStickyBar } from '@/features/library/components/detail/BookDetailStickyBar';

export default function BookDetailPage() {
  const { bookId } = useParams();
  const { book, loading, error, setBook } = useBookDetail(bookId);
  const taxonomy = useTaxonomy();

  const handleBookUpdate = (partial) => {
    setBook((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const handleImported = () => handleBookUpdate({ is_on_shelf: true });

  return (
    <Layout>
      <div className="bg-library-bg-primary min-h-screen pb-24">
        <div className="max-w-[1440px] mx-auto px-5 md:px-12 lg:px-20 pt-8">
          <BookDetailBack />

          {loading && (
            <div className="py-24 text-center" aria-live="polite">
              <p className="text-library-text-muted">Loading book...</p>
            </div>
          )}

          {!loading && error && (
            <div className="py-24 text-center">
              <p className="font-garamond text-xl text-library-text-secondary">Something went wrong</p>
              <p className="text-sm text-library-text-muted mt-2">{error}</p>
            </div>
          )}

          {!loading && !error && book && (
            <>
              <div className="mt-6">
                <BookDetailHero book={book} taxonomy={taxonomy} onImported={handleImported} />
              </div>

              <div className="mt-12">
                <BookDetailTabs book={book} onBookUpdate={handleBookUpdate} />
              </div>
            </>
          )}
        </div>

        {!loading && !error && book && <BookDetailStickyBar book={book} onImported={handleImported} />}
      </div>
    </Layout>
  );
}
