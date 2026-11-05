import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// findBy*/waitFor default to 1 s, which a busy 4-core machine sometimes misses while lazy
// chunks and mocked requests settle. Wait longer; assertions stay the same.
configure({ asyncUtilTimeout: 5000 });

// Tests must never hit real APIs. Any fetch that isn't mocked (mockFetch / vi.mock of a service)
// lands here and fails the test with the URLs it tried to reach.
const unmockedFetch = vi.fn(() =>
  Promise.reject(new TypeError('Real network request blocked in tests')),
);
globalThis.fetch = unmockedFetch;

// Curated destination data is generated (npm run data:attractions) and changes over time, so tests
// use the small fixture set instead. services/attractions.test.js checks the real data files.
vi.mock('../services/attractions.js', async () => {
  const { attractionsByCountry, destinations, france, japan } = await import('./fixtures.js');
  return {
    getDestinations: vi.fn(() => destinations),
    getCuratedCountries: vi.fn(() => [france, japan]),
    // Off by default, so page tests exercise the REST Countries path; hook tests turn it on.
    getCuratedCountry: vi.fn(() => null),
    getSnapshotNeighbours: vi.fn(() => null),
    getCoverPhoto: (code) => destinations.covers[code?.toUpperCase()] ?? null,
    getAttractions: vi.fn(async (code) => attractionsByCountry[code.toUpperCase()] ?? []),
    getAllAttractions: vi.fn(async () => attractionsByCountry),
  };
});
afterEach(() => {
  const urls = unmockedFetch.mock.calls.map(([url]) => String(url));
  unmockedFetch.mockClear();
  if (urls.length > 0) throw new Error(`Unmocked fetch in test: ${urls.join(', ')}`);
});

// Pure-logic tests opt into `// @vitest-environment node`, where there is no window.
if (typeof window !== 'undefined') {
  // jsdom doesn't implement scrolling; <ScrollRestoration> calls window.scrollTo on navigation.
  window.scrollTo = () => {};

  // jsdom has no <dialog> behaviour. Minimal stand-in: open/close state, the "close" event,
  // and Escape closing the most recently opened modal (browsers also fire "cancel" first).
  if (!HTMLDialogElement.prototype.showModal) {
    const openDialogs = [];
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '');
      openDialogs.push(this);
    };
    HTMLDialogElement.prototype.close = function close() {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      openDialogs.splice(openDialogs.indexOf(this), 1);
      this.dispatchEvent(new Event('close'));
    };
    Object.defineProperty(HTMLDialogElement.prototype, 'open', {
      get() {
        return this.hasAttribute('open');
      },
      configurable: true,
    });
    document.addEventListener('keydown', (event) => {
      const top = openDialogs.at(-1);
      if (event.key !== 'Escape' || !top) return;
      const cancel = new Event('cancel', { cancelable: true });
      top.dispatchEvent(cancel);
      if (!cancel.defaultPrevented) top.close();
    });
  }
}
