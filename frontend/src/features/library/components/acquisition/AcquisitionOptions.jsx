/**
 * @fileoverview Acquisition options screen — choose Buy or Upload.
 *
 * Screen 1 of the acquisition flow (AcquisitionModal.SCREENS.OPTIONS).
 * Two paths:
 * 1. Buy on Amazon — opens buy_link in a new tab, modal advances to
 *    POST_PURCHASE (same upload zone as "I already own", with the first
 *    two breadcrumb steps shown complete). Per product correction, the
 *    modal does NOT close when this is clicked — the user is expected to
 *    come back to it after buying.
 * 2. I already own this book — advances straight to UPLOAD.
 *
 * If buyLink is null, the Amazon card is omitted entirely rather than
 * rendered disabled — there's nothing useful the user could do with it.
 */
import { ShoppingBag, FileText } from 'lucide-react';

/**
 * @param {Object} props
 * @param {string|null} props.buyLink - book.buy_link (Amazon URL)
 * @param {function} props.onBuyOnAmazon - Opens the Amazon link and advances the modal
 * @param {function} props.onAlreadyOwn - Advances the modal to the upload screen
 */
export function AcquisitionOptions({ buyLink, onBuyOnAmazon, onAlreadyOwn }) {
  return (
    <div>
      <div className="flex flex-col items-center text-center mb-6">
        <ShoppingBag className="h-8 w-8 text-library-text-muted mb-4" aria-hidden="true" />
        <h2 className="font-playfair text-2xl text-library-text-primary mb-2">Get this book</h2>
        <p className="text-sm text-library-text-secondary max-w-xs">
          This title isn&apos;t included in the Zenzeii catalog, but you can read your own EPUB copy here.
        </p>
      </div>

      <div className={`grid gap-3 mb-6 ${buyLink ? 'sm:grid-cols-2' : ''}`}>
        {buyLink && (
          <button
            type="button"
            onClick={onBuyOnAmazon}
            className="flex flex-col items-center text-center gap-2 border border-library-border/40 rounded-library-md p-6 hover:bg-library-bg-shelf cursor-pointer transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
          >
            <ShoppingBag className="h-5 w-5 text-library-text-secondary" aria-hidden="true" />
            <p className="font-medium text-sm text-library-text-primary">Buy on Amazon</p>
            <p className="text-xs text-library-text-muted">Purchase and download the EPUB</p>
          </button>
        )}

        <button
          type="button"
          onClick={onAlreadyOwn}
          className="flex flex-col items-center text-center gap-2 border border-library-border/40 rounded-library-md p-6 hover:bg-library-bg-shelf cursor-pointer transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2"
        >
          <FileText className="h-5 w-5 text-library-text-secondary" aria-hidden="true" />
          <p className="font-medium text-sm text-library-text-primary">I already own this book</p>
          <p className="text-xs text-library-text-muted">I have an EPUB file ready to import</p>
        </button>
      </div>

      <p className="text-xs text-library-text-muted text-center">Zenzeii reads DRM-free .epub files.</p>
    </div>
  );
}
