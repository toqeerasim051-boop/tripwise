import { useRef } from 'react';
import { AlertIcon, DownloadIcon, UploadIcon } from '../common/Icons.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { sectionCard } from '../layout/layoutStyles.js';

/** Export / import controls. `onImport(file)` receives the chosen File; the page parses it. */
export default function BackupPanel({ onExport, onImport, error }) {
  const fileInputRef = useRef(null);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // so choosing the same file again still fires a change
    if (file) onImport(file);
  }

  return (
    <section aria-labelledby="backup-heading" className={`mt-10 ${sectionCard}`}>
      <h2 id="backup-heading" className="text-lg font-semibold text-fg">
        Back up your data
      </h2>
      <p className="mt-1 max-w-prose text-sm text-fg-muted">
        Your trips and wishlist are saved only in this browser. Export them to a file to keep a copy
        or to move them to another browser or device.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={buttonStyles.secondary} onClick={onExport}>
          <DownloadIcon className="size-4" />
          Export to file
        </button>
        <button
          type="button"
          className={buttonStyles.secondary}
          onClick={() => fileInputRef.current.click()}
          aria-describedby="backup-import-hint"
        >
          <UploadIcon className="size-4" />
          Import from file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          aria-label="Backup file"
          hidden
          onChange={handleFileChange}
        />
      </div>
      <p id="backup-import-hint" className="mt-3 max-w-prose text-sm text-fg-muted">
        Importing adds the trips and wishlist destinations from a TripWise backup file. A trip you
        already have is only replaced by a more recently edited copy.
      </p>
      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-medium text-danger">
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </section>
  );
}
