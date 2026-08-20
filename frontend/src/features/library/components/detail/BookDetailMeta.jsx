/**
 * @fileoverview Book metadata panel for the detail page right column.
 *
 * Displays 9 metadata fields in a labeled list, plus a decorative
 * botanical SVG watermark (same inline-SVG pattern as QuizPromptCard).
 * ESTIMATED LENGTH uses estimateReadingHours() (libraryUtils.js) — the
 * established, already-in-production client-side reading-time estimate
 * (see BookInfoBlock.jsx) — rather than a backend field, since no
 * estimated-read-time field exists anywhere in book_catalog.
 */
import { AVAILABILITY_LABELS, LANGUAGE_LABELS } from '../../constants/libraryConstants';
import { estimateReadingHours, resolveEntityNames } from '../../utils/libraryUtils';

/**
 * @param {Object} props
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 * @param {ReturnType<typeof import('../../hooks/useTaxonomy').useTaxonomy>} props.taxonomy
 */
export function BookDetailMeta({ book, taxonomy }) {
  const genreNames = resolveEntityNames(book.genre_ids, taxonomy.genres);
  const themeNames = resolveEntityNames(book.theme_ids, taxonomy.themes);
  const readingHours = estimateReadingHours(book.page_count);

  const fields = [
    { label: 'Availability', value: AVAILABILITY_LABELS[book.availability] ?? book.availability },
    { label: 'Genre', value: genreNames.length ? genreNames.join(', ') : '—' },
    { label: 'Themes', value: themeNames.length ? themeNames.join(', ') : '—' },
    { label: 'JLPT Level', value: book.jlpt_level ?? '—' },
    { label: 'Estimated Length', value: readingHours != null ? `~${readingHours} hours` : '—' },
    { label: 'Pages', value: book.page_count ? `${book.page_count} pages` : '—' },
    { label: 'First Published', value: book.publication_year ?? '—' },
    { label: 'Original Language', value: LANGUAGE_LABELS[book.language] ?? book.language },
    {
      label: 'Translation',
      value: book.has_translation === true ? 'Yes' : book.has_translation === false ? 'No' : '—',
    },
  ];

  return (
    <div className="relative overflow-hidden">
      <dl>
        {fields.map((field) => (
          <div key={field.label} className="mb-4">
            <dt className="text-xs uppercase tracking-wide text-library-text-muted">{field.label}</dt>
            <dd className="text-sm text-library-text-primary font-medium mt-0.5">{field.value}</dd>
          </div>
        ))}
      </dl>

      {/* Decorative botanical line art — bottom-right, purely ornamental */}
      <svg
        aria-hidden="true"
        viewBox="0 0 80 80"
        className="absolute bottom-0 right-0 w-[90px] h-[90px] stroke-library-border opacity-40 pointer-events-none"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M15 75 Q 35 55 30 20" />
        <path d="M30 40 Q 48 34 55 15" />
        <path d="M25 55 Q 8 50 5 62" />
      </svg>
    </div>
  );
}
