/**
 * @fileoverview Quiz prompt card — static secondary CTA.
 *
 * Encourages users to take a book-matching quiz. Fully static in all
 * current phases — no quiz logic implemented, and none scheduled in the
 * current 11-phase plan (quiz is a future product feature). The
 * "Find My Book" button logs to console only.
 *
 * No props — entirely static content.
 */

const handleFindMyBook = () => {
  console.log('[QuizPromptCard] Find My Book clicked — quiz feature not yet implemented (not scheduled in the current phase plan)');
};

export function QuizPromptCard() {
  return (
    <div
      role="region"
      aria-label="Book recommendation quiz"
      className="relative overflow-hidden bg-library-bg-card rounded-lg border border-library-border shadow-sm p-6 h-full flex flex-col gap-3"
    >
      <p className="text-xs uppercase tracking-wide text-library-text-muted">Not sure what to read?</p>

      <h3 className="font-playfair text-xl font-semibold text-library-text-primary">
        Take our 30-second quiz
      </h3>

      <p className="text-sm text-library-text-secondary leading-relaxed">
        We'll find the perfect book for your level and interests.
      </p>

      <button
        type="button"
        onClick={handleFindMyBook}
        className="self-start border border-library-border text-library-text-primary hover:bg-library-bg-shelf px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
      >
        Find My Book
        <span aria-hidden="true">→</span>
      </button>

      {/* Decorative botanical line art — bottom-right, purely ornamental */}
      <svg
        aria-hidden="true"
        viewBox="0 0 80 80"
        className="absolute bottom-2 right-2 w-[70px] h-[70px] stroke-library-border pointer-events-none"
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
