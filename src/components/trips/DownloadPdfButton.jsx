import { useState } from 'react';
import { DownloadIcon } from '../common/Icons.jsx';
import { buttonStyles } from '../common/buttonStyles.js';
import { downloadTripPdf } from '../../utils/tripPdf.js';

/** Saves the trip plan as a PDF file (jsPDF loads on the first click). */
export default function DownloadPdfButton({ trip }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'busy' | 'error'

  async function handleClick() {
    setStatus('busy');
    try {
      await downloadTripPdf(trip);
      setStatus('idle');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }

  return (
    <>
      <button
        type="button"
        className={buttonStyles.secondary}
        onClick={handleClick}
        disabled={status === 'busy'}
      >
        <DownloadIcon className="size-4" />
        {status === 'busy' ? 'Preparing PDF…' : 'Download PDF'}
      </button>
      {status === 'error' && (
        <p role="alert" className="self-center text-sm font-medium text-danger">
          Couldn&apos;t create the PDF. Please try again.
        </p>
      )}
    </>
  );
}
