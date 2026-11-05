import { vi } from 'vitest';

/** Minimal stand-in for a fetch Response. */
export function jsonResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body instanceof Error) throw body;
      return body;
    },
  };
}

/** Replaces global fetch for the current test (restored automatically via unstubGlobals). */
export function mockFetch(implementation) {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** A fetch that never settles until its signal aborts — for timeout/abort tests. */
export function hangingFetch() {
  return (_url, { signal } = {}) =>
    new Promise((_resolve, reject) => {
      signal?.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted.', 'AbortError')),
      );
    });
}
