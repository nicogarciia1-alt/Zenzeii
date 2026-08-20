/**
 * @fileoverview EPUB file upload screen — drag & drop or click to browse.
 *
 * Shared by two states in AcquisitionModal's screen state machine:
 * UPLOAD (from "I already own this book") and POST_PURCHASE (from "Buy on
 * Amazon", after the user returns from the external tab). Both render this
 * same component — the only difference is the `fromPurchase` prop, which
 * controls whether the 3-step breadcrumb is shown at all. Per product
 * decision, the breadcrumb only renders when fromPurchase=true; the
 * "I already own" path has no purchase/download steps to reference, so it
 * shows no breadcrumb rather than one with two permanently-incomplete steps.
 *
 * Validates the file (`.epub` extension, <=50MB — the backend's own hard
 * limit in server.py's upload_book, so this mirrors reality rather than an
 * aspirational client-side number) before handing off. The actual
 * POST /api/books/upload call happens in AcquisitionModal, not here — this
 * component only picks and validates a file, consistent with "no screen
 * component manages its own navigation."
 */
import { useRef, useState } from 'react';
import { ArrowLeft, Upload } from 'lucide-react';

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * @param {Object} props
 * @param {boolean} props.fromPurchase - Whether this screen was reached via "Buy on Amazon"
 * @param {string|null} [props.uploadError] - Error from a failed backend upload attempt, if any
 * @param {function} props.onBack - Returns to the options screen
 * @param {function} props.onFileSelected - Called with the validated File once chosen
 */
export function EpubUploadZone({ fromPurchase, uploadError, onBack, onFileSelected }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);

  const validateAndSelect = (file) => {
    if (!file) return;
    setValidationError(null);

    if (!file.name.toLowerCase().endsWith('.epub')) {
      setValidationError('Please select a .epub file.');
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setValidationError('File too large. Maximum upload size is 50MB.');
      return;
    }

    onFileSelected(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    validateAndSelect(e.dataTransfer.files?.[0]);
  };

  const handleFileSelect = (e) => {
    validateAndSelect(e.target.files?.[0]);
    e.target.value = '';
  };

  const displayError = validationError || uploadError;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="mb-4 text-library-text-muted hover:text-library-text-primary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library-red focus-visible:ring-offset-2 rounded"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      {fromPurchase && (
        <div className="flex items-center justify-center gap-2 mb-8 text-xs">
          <span className="text-library-text-muted line-through">1. Purchase complete</span>
          <span className="text-library-text-muted">·</span>
          <span className="text-library-text-muted line-through">2. Download the EPUB</span>
          <span className="text-library-text-muted">·</span>
          <span className="text-library-red font-semibold">3. Import into Zenzeii</span>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
        }}
        className={`border-2 border-dashed rounded-library-md p-12 text-center cursor-pointer transition-colors duration-base ${
          isDragActive ? 'border-library-red bg-library-bg-shelf' : 'border-library-border hover:border-library-red hover:bg-library-bg-shelf'
        }`}
      >
        <Upload className="h-8 w-8 text-library-text-muted mx-auto mb-4" aria-hidden="true" />
        <p className="text-sm font-medium text-library-text-primary">Drag and drop your EPUB file here</p>
        <p className="text-xs text-library-text-muted mt-1">or click to browse</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".epub"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {displayError && (
        <p className="text-xs text-library-red text-center mt-3" role="alert">
          {displayError}
        </p>
      )}

      <p className="text-xs text-library-text-muted text-center mt-4">Only DRM-free .epub files are supported.</p>
    </div>
  );
}
