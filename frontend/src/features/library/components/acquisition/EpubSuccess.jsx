/**
 * @fileoverview Success screen — book imported and ready to read.
 *
 * Screen 4 (final) of the acquisition flow.
 */
import { Check } from 'lucide-react';
import { BookCoverArt } from '../books/BookCoverArt';

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 * @param {function} props.onGoToMyBooks - Navigate to My Books (the shelf at "/")
 * @param {function} props.onViewDetails - Close modal (already on the detail page)
 */
export function EpubSuccess({ book, onGoToMyBooks, onViewDetails }) {
  return (
    <div>
      <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
        <Check className="h-8 w-8 text-green-600" aria-hidden="true" />
      </div>

      <h2 className="font-playfair text-2xl text-center mb-2">{book.title_en} is ready!</h2>
      <p className="text-sm text-library-text-secondary text-center mb-8">You can now read it in your library.</p>

      <div className="flex justify-center mb-8">
        <BookCoverArt
          bookId={book.id}
          titleJp={book.title_jp}
          titleEn={book.title_en}
          authorJp={book.author_name_jp}
          coverImage={book.cover_image}
          size="sm"
        />
      </div>

      <button
        type="button"
        onClick={onGoToMyBooks}
        className="w-full h-12 bg-library-red text-white rounded-library-md text-sm font-medium hover:bg-library-red-hover transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
      >
        Go to My Books
      </button>
      <button
        type="button"
        onClick={onViewDetails}
        className="w-full h-12 border border-library-border text-library-text-primary rounded-library-md text-sm font-medium mt-3 hover:bg-library-bg-shelf transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
      >
        View Book Details
      </button>
    </div>
  );
}
