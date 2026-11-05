// @vitest-environment node
import {
  ApiError,
  getErrorMessage,
  getJson,
  isAbortError,
  isTemporaryError,
  withAbort,
} from './http.js';
import { hangingFetch, jsonResponse, mockFetch } from '../test/fetchMocks.js';

const URL = 'https://api.example.com/data';

describe('getJson', () => {
  it('returns parsed JSON and sends Accept plus custom headers', async () => {
    const fetchMock = mockFetch(async () => jsonResponse({ hello: 'world' }));

    await expect(getJson(URL, { headers: { Authorization: 'Bearer x' } })).resolves.toEqual({
      hello: 'world',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({
        headers: { Accept: 'application/json', Authorization: 'Bearer x' },
      }),
    );
  });

  it('throws an http ApiError with the API message for non-2xx responses', async () => {
    mockFetch(async () => jsonResponse({ errors: [{ message: 'Bad key' }] }, { status: 401 }));

    const error = await getJson(URL).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ kind: 'http', status: 401, message: 'Bad key', url: URL });
  });

  it('keeps the API error code (real REST Countries 403 body)', async () => {
    mockFetch(async () =>
      jsonResponse(
        {
          errors: [
            { message: 'Origin is not allowed for this API key.', code: 'originNotAllowed' },
          ],
        },
        { status: 403 },
      ),
    );

    const error = await getJson(URL).catch((e) => e);
    expect(error).toMatchObject({ status: 403, code: 'originNotAllowed' });
    expect(getErrorMessage(error)).toMatch(/allowed origins/);
    expect(getErrorMessage(new ApiError('x', { kind: 'http', status: 403 }))).toMatch(
      /limit has been reached/,
    );
  });

  it('reads Open-Meteo style { reason } error bodies', async () => {
    mockFetch(async () =>
      jsonResponse({ error: true, reason: 'Latitude out of range' }, { status: 400 }),
    );
    await expect(getJson(URL)).rejects.toMatchObject({
      status: 400,
      message: 'Latitude out of range',
    });
  });

  it('keeps the http error when a non-2xx body is not JSON', async () => {
    mockFetch(async () => jsonResponse(new SyntaxError('bad'), { status: 502 }));
    await expect(getJson(URL)).rejects.toMatchObject({ kind: 'http', status: 502 });
  });

  it('throws a parse ApiError for invalid JSON on success', async () => {
    mockFetch(async () => jsonResponse(new SyntaxError('Unexpected token')));
    await expect(getJson(URL)).rejects.toMatchObject({ kind: 'parse' });
  });

  it('throws a network ApiError when fetch rejects', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(getJson(URL)).rejects.toMatchObject({ kind: 'network' });
  });

  it('throws a timeout ApiError after timeoutMs', async () => {
    vi.useFakeTimers();
    try {
      mockFetch(hangingFetch());
      const result = getJson(URL, { timeoutMs: 5000 }).catch((e) => e);

      await vi.advanceTimersByTimeAsync(5000);

      expect(await result).toMatchObject({ kind: 'timeout' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('rethrows the AbortError untouched when the caller aborts', async () => {
    mockFetch(hangingFetch());
    const controller = new AbortController();
    const result = getJson(URL, { signal: controller.signal }).catch((e) => e);

    controller.abort();

    const error = await result;
    expect(isAbortError(error)).toBe(true);
    expect(error).not.toBeInstanceOf(ApiError);
  });

  it('does not call fetch when the signal is already aborted', async () => {
    const fetchMock = mockFetch(async () => jsonResponse({}));
    const controller = new AbortController();
    controller.abort();

    const error = await getJson(URL, { signal: controller.signal }).catch((e) => e);
    expect(isAbortError(error)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('withAbort', () => {
  it('passes the value through when not aborted', async () => {
    await expect(withAbort(Promise.resolve(42), new AbortController().signal)).resolves.toBe(42);
  });

  it('rejects for this caller only, leaving the shared promise intact', async () => {
    let resolveShared;
    const shared = new Promise((resolve) => {
      resolveShared = resolve;
    });
    const controller = new AbortController();
    const aborted = withAbort(shared, controller.signal).catch((e) => e);
    const other = withAbort(shared, new AbortController().signal);

    controller.abort();
    resolveShared('data');

    expect(isAbortError(await aborted)).toBe(true);
    await expect(other).resolves.toBe('data');
  });
});

describe('getErrorMessage', () => {
  it.each([
    [new ApiError('x', { kind: 'timeout' }), /took too long/],
    [new ApiError('x', { kind: 'network' }), /internet connection/],
    [new ApiError('x', { kind: 'config' }), /not configured/],
    [new ApiError('x', { kind: 'http', status: 404 }), /couldn't find/],
    [new ApiError('x', { kind: 'http', status: 429 }), /Too many requests/],
    [new ApiError('x', { kind: 'http', status: 503 }), /having problems/],
    [new ApiError('x', { kind: 'parse' }), /unexpected response/],
    [new Error('boom'), /Something went wrong/],
  ])('maps %o to a friendly message', (error, expected) => {
    expect(getErrorMessage(error)).toMatch(expected);
  });
});

describe('isTemporaryError', () => {
  it('is true for offline, timeouts, rate limits and server errors', () => {
    expect(isTemporaryError(new ApiError('x', { kind: 'network' }))).toBe(true);
    expect(isTemporaryError(new ApiError('x', { kind: 'timeout' }))).toBe(true);
    expect(isTemporaryError(new ApiError('x', { kind: 'http', status: 429 }))).toBe(true);
    expect(isTemporaryError(new ApiError('x', { kind: 'http', status: 503 }))).toBe(true);
  });

  it('is false for client errors, bad data, config and non-API errors', () => {
    expect(isTemporaryError(new ApiError('x', { kind: 'http', status: 404 }))).toBe(false);
    expect(isTemporaryError(new ApiError('x', { kind: 'parse' }))).toBe(false);
    expect(isTemporaryError(new ApiError('x', { kind: 'config' }))).toBe(false);
    expect(isTemporaryError(new Error('x'))).toBe(false);
  });
});
