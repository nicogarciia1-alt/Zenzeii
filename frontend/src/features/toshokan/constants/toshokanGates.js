/**
 * @fileoverview Toshokan Pass gate types and copy — the free-tier limits
 * that surface ToshokanGateModal. Kept separate from the presentational
 * modal so call sites (HomePage, ShelvesSection, ReaderPage, ...) can
 * resolve a backend response into one of these types without the modal
 * itself ever parsing a 403 body or usage payload.
 */

export const TOSHOKAN_GATE = {
  LIBRARY_LIMIT: 'library_limit',
  CURATED_COLLECTION: 'curated_collection',
  ASK_ZENZEII_LIMIT: 'ask_zenzeii_limit',
};

export const TOSHOKAN_GATE_COPY = {
  [TOSHOKAN_GATE.LIBRARY_LIMIT]: {
    headline: 'Your reading room is full.',
    body: 'Free readers can keep up to 2 books. Join the Toshokan Pass to read without limits.',
  },
  [TOSHOKAN_GATE.CURATED_COLLECTION]: {
    headline: 'This collection is for Pass members.',
    body: 'Curated reading paths are part of the Toshokan Pass — handpicked shelves that guide you deeper into Japanese literature.',
  },
  [TOSHOKAN_GATE.ASK_ZENZEII_LIMIT]: {
    headline: "You've used today's explanations.",
    body: 'Free readers get 5 Ask Zenzeii answers per day. Pass members ask without limit — every word, every passage, always.',
  },
};
