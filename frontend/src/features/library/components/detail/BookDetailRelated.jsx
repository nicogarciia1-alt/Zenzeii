/**
 * @fileoverview Related Books tab — always shows a coming-soon state until
 * a real recommendation engine exists. No fake/mock data here by design.
 */
export function BookDetailRelated() {
  return (
    <div className="py-16 text-center">
      <p className="font-garamond text-xl text-library-text-secondary">Coming soon</p>
      <p className="text-sm text-library-text-muted mt-2">
        We're building a recommendation engine to find your next perfect book.
      </p>
    </div>
  );
}
