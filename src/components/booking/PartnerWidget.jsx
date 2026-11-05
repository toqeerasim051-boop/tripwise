import { useEffect, useRef, useState } from 'react';
import { AlertIcon } from '../common/Icons.jsx';
import {
  WIDGET_MESSAGE_SOURCE,
  WIDGET_SANDBOX,
  buildWidgetDocument,
} from '../../utils/partnerWidgets.js';

const MIN_HEIGHT = 160;
const MAX_HEIGHT = 2400;
const INITIAL_HEIGHT = 420;

/**
 * A partner search widget in a sandboxed iframe (see utils/partnerWidgets.js). The frame grows to
 * fit its content from the height messages it posts. Render with `key={src}` so a new search
 * starts from a fresh state.
 */
export default function PartnerWidget({ src, title }) {
  const frameRef = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'loaded' | 'error'
  const [height, setHeight] = useState(INITIAL_HEIGHT);

  useEffect(() => {
    function handleMessage(event) {
      // Only trust messages from our own frame; its origin is opaque ("null"), so check the source.
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      const { data } = event;
      if (data?.source !== WIDGET_MESSAGE_SOURCE) return;

      if (data.type === 'height' && Number.isFinite(data.height)) {
        setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, data.height)));
      } else if (data.type === 'loaded') {
        setStatus((current) => (current === 'error' ? current : 'loaded'));
      } else if (data.type === 'error') {
        setStatus('error');
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div>
      <div aria-live="polite">
        {status === 'loading' && <p className="mb-2 text-sm text-fg-muted">Loading search…</p>}
        {status === 'error' && (
          <p className="flex items-start gap-2 text-sm font-medium text-danger">
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            The partner search couldn&apos;t load. Use the search links below instead.
          </p>
        )}
      </div>
      {status !== 'error' && (
        <iframe
          ref={frameRef}
          title={title}
          srcDoc={buildWidgetDocument(src)}
          sandbox={WIDGET_SANDBOX}
          style={{ height }}
          className="block w-full rounded-lg border border-line"
        />
      )}
    </div>
  );
}
