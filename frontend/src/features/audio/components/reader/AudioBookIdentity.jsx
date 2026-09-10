import GeneratedBookCover from '@/components/books/GeneratedBookCover';

/**
 * Left-hand identity block shared by all three console states (idle,
 * generating, playback) — cover, title, author, chapter stay visually
 * stable while only the right-hand action region changes between them.
 * Reuses the project's existing generated-cover placeholder rather than
 * inventing a cover URL (backend cover_image is unrelated stock art —
 * see the same caveat in BookCard.jsx).
 */
export function AudioBookIdentity({ book, chapterLabel }) {
  const title = book?.title_jp || book?.title || 'Untitled';
  const author = book?.author_jp || book?.author || '';

  return (
    <div className="reader-audio-identity">
      <div className="reader-audio-cover" aria-hidden="true">
        {book && <GeneratedBookCover book={book} />}
      </div>
      <div className="reader-audio-identity-text">
        <p className="reader-audio-book-title">{title}</p>
        {author && <p className="reader-audio-book-author">{author}</p>}
        {chapterLabel && <p className="reader-audio-book-chapter">{chapterLabel}</p>}
      </div>
    </div>
  );
}
