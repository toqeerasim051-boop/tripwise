import { useEffect } from 'react';

const APP_NAME = 'TripWise';

/** Sets the browser tab title ("France · TripWise") so each page is identifiable. */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
