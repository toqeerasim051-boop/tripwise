import { useRef } from 'react';
import { Outlet, ScrollRestoration, useMatches, useNavigation } from 'react-router';
import SiteHeader from './SiteHeader.jsx';
import SiteFooter from './SiteFooter.jsx';
import StorageWarning from './StorageWarning.jsx';
import { useRouteFocus } from '../../hooks/useRouteFocus.js';
import { pageContainer } from './layoutStyles.js';

export default function AppLayout() {
  const mainRef = useRef(null);
  useRouteFocus(mainRef);
  const fullBleed = useMatches().some((match) => match.handle?.fullBleed);
  // A page's code (and nothing else) may still be loading after a click: show a thin bar.
  const isLoadingPage = useNavigation().state === 'loading';

  return (
    <div className="flex min-h-dvh flex-col">
      {isLoadingPage && (
        <div
          role="progressbar"
          aria-label="Loading page"
          className="fixed inset-x-0 top-0 z-50 h-1 animate-pulse bg-primary motion-reduce:animate-none"
        />
      )}
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-4 py-2 font-medium text-on-primary focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <StorageWarning />
      <main
        id="main"
        ref={mainRef}
        className={fullBleed ? 'flex-1' : `${pageContainer} flex-1 py-6 sm:py-8`}
      >
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  );
}
