/**
 * @fileoverview About tab — full description and a featured-quote block.
 */

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 */
export function BookDetailAbout({ book }) {
  const description = book.description_long || book.description_short;
  const paragraphs = description ? description.split('\n\n').filter(Boolean) : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[60%_35%] gap-8 py-8">
      <div className="flex flex-col gap-4">
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, i) => (
            <p key={i} className="text-body text-library-text-secondary leading-relaxed">
              {paragraph}
            </p>
          ))
        ) : (
          <p className="text-body text-library-text-muted">No description available yet.</p>
        )}
      </div>

      {book.featured_quote && (
        <div>
          <blockquote className="border-l-4 border-library-red pl-6 py-2 bg-library-bg-shelf rounded-r-library-sm">
            <p className="font-garamond text-lg italic text-library-text-primary leading-relaxed">
              "{book.featured_quote}"
            </p>
            <cite className="text-sm text-library-text-muted mt-2 block not-italic">
              — {book.featured_quote_source || book.title_en}
            </cite>
          </blockquote>
        </div>
      )}
    </div>
  );
}
