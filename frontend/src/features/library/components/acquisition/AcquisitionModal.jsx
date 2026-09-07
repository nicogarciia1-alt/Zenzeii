/**
 * @fileoverview Root modal for the book acquisition flow (availability="buy").
 *
 * Manages navigation between the acquisition screens — the only component
 * that owns screen state; every screen component below it is presentational
 * and reports back via callbacks rather than navigating itself.
 *
 *   OPTIONS ──"Buy on Amazon"──▶ POST_PURCHASE ──▶ PROCESSING ──▶ SUCCESS
 *      └──────"I already own"──▶ UPLOAD ─────────▶ PROCESSING ──▶ SUCCESS
 *
 * UPLOAD and POST_PURCHASE both render EpubUploadZone — the same drag & drop
 * component — differing only in the `fromPurchase` flag, which controls
 * whether the "Purchase complete / Download the EPUB / Import into Zenzeii"
 * breadcrumb is shown. "Buy on Amazon" opens book.buy_link in a new tab and
 * keeps the modal open on POST_PURCHASE per product decision — no assumption
 * that closing and reopening the flow is required.
 *
 * The uploaded EPUB becomes an entirely separate book record from the
 * catalog entry (see server.py's upload_book/process_upload_fast — a 'buy'
 * catalog book has no chapters/sentences of its own to read). onComplete
 * reports { linkedUploadId, linkedUploadStatus, linkedUploadAt } up to
 * BookDetailPage so the rest of the page (AcquisitionButton's "Read now",
 * the sticky bar's post-import state) knows which book to actually open.
 *
 * Modal container follows MoreFiltersPopover's fixed/backdrop pattern
 * (frontend/src/features/library/components/filters/MoreFiltersPopover.jsx)
 * rather than the shadcn Dialog used elsewhere in the app — the Library
 * feature's own convention. Escape/focus-trap via the existing
 * useFocusTrap hook, no new dependency.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { uploadBook, isLibraryLimitError } from '@/lib/api';
import { useToshokanGate } from '@/features/toshokan/context/ToshokanGateContext';
import { TOSHOKAN_GATE } from '@/features/toshokan/constants/toshokanGates';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { AcquisitionOptions } from './AcquisitionOptions';
import { EpubUploadZone } from './EpubUploadZone';
import { EpubProcessing } from './EpubProcessing';
import { EpubSuccess } from './EpubSuccess';

const SCREENS = {
  OPTIONS: 'options',
  UPLOAD: 'upload',
  POST_PURCHASE: 'post_purchase',
  PROCESSING: 'processing',
  SUCCESS: 'success',
};

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {function} props.onClose
 * @param {import('../../types/catalogTypes').BookCatalogDetail} props.book
 * @param {function} props.onImported - Called with { linkedUploadId, linkedUploadStatus, linkedUploadAt } once the EPUB import completes
 */
export function AcquisitionModal({ isOpen, onClose, book, onImported }) {
  const navigate = useNavigate();
  const { openGate } = useToshokanGate();
  const panelRef = useRef(null);

  const [screen, setScreen] = useState(SCREENS.OPTIONS);
  const [uploadedBookId, setUploadedBookId] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState(null);
  // Which upload screen PROCESSING was entered from, so a processing
  // failure returns to the right breadcrumb state instead of always UPLOAD.
  const [uploadOrigin, setUploadOrigin] = useState(SCREENS.UPLOAD);

  // Fresh state every time the modal is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setScreen(SCREENS.OPTIONS);
      setUploadedBookId(null);
      setFileName('');
      setUploadError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (screen === SCREENS.PROCESSING) {
      const confirmed = window.confirm(
        "Your book is still importing. Closing won't stop it — check My Books in a moment. Close anyway?"
      );
      if (!confirmed) return;
    }
    onClose();
  };

  useFocusTrap(panelRef, isOpen, handleClose);

  if (!isOpen) return null;

  const handleBuyOnAmazon = () => {
    if (book.buy_link) window.open(book.buy_link, '_blank', 'noopener,noreferrer');
    setScreen(SCREENS.POST_PURCHASE);
  };

  const handleAlreadyOwn = () => setScreen(SCREENS.UPLOAD);
  const handleBackToOptions = () => setScreen(SCREENS.OPTIONS);

  const handleFileSelected = async (file) => {
    setUploadError(null);
    try {
      const res = await uploadBook(file, book.title_en, book.author_name, book.id);
      setUploadedBookId(res.data.book_id);
      setFileName(file.name);
      setUploadOrigin(screen);
      setScreen(SCREENS.PROCESSING);
    } catch (err) {
      if (isLibraryLimitError(err)) {
        openGate(TOSHOKAN_GATE.LIBRARY_LIMIT);
        return;
      }
      setUploadError(err.response?.data?.detail || err.message || 'Upload failed. Please try again.');
    }
  };

  const handleProcessingComplete = () => {
    setScreen(SCREENS.SUCCESS);
    onImported?.({
      linkedUploadId: uploadedBookId,
      linkedUploadStatus: 'completed',
      linkedUploadAt: new Date().toISOString(),
    });
  };

  const handleProcessingError = (message) => {
    setUploadError(message);
    setScreen(uploadOrigin);
  };

  const handleGoToMyBooks = () => {
    onClose();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Get this book"
        className="relative bg-white rounded-library-lg shadow-library-card-lg w-full max-w-md mx-4 p-8"
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-library-text-muted hover:text-library-text-primary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 rounded"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {screen === SCREENS.OPTIONS && (
          <AcquisitionOptions
            buyLink={book.buy_link}
            onBuyOnAmazon={handleBuyOnAmazon}
            onAlreadyOwn={handleAlreadyOwn}
          />
        )}

        {(screen === SCREENS.UPLOAD || screen === SCREENS.POST_PURCHASE) && (
          <EpubUploadZone
            fromPurchase={screen === SCREENS.POST_PURCHASE}
            uploadError={uploadError}
            onBack={handleBackToOptions}
            onFileSelected={handleFileSelected}
          />
        )}

        {screen === SCREENS.PROCESSING && (
          <EpubProcessing
            bookId={uploadedBookId}
            fileName={fileName}
            onComplete={handleProcessingComplete}
            onError={handleProcessingError}
          />
        )}

        {screen === SCREENS.SUCCESS && (
          <EpubSuccess book={book} onGoToMyBooks={handleGoToMyBooks} onViewDetails={onClose} />
        )}
      </div>
    </div>
  );
}
