import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsyncResource } from './useAsyncResource.js';
import { ApiError } from '../services/http.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('useAsyncResource', () => {
  it('is idle and does not load for a null key', () => {
    const loader = vi.fn();
    const { result } = renderHook(() => useAsyncResource(null, loader));
    expect(result.current).toMatchObject({ status: 'idle', data: undefined, error: null });
    expect(loader).not.toHaveBeenCalled();
  });

  it('goes from loading to success', async () => {
    const loader = vi.fn(async (key) => `data for ${key}`);
    const { result } = renderHook(() => useAsyncResource('a', loader));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toBe('data for a');
    expect(loader).toHaveBeenCalledWith('a', expect.any(AbortSignal));
  });

  it('reports errors and retries', async () => {
    const error = new ApiError('boom', { kind: 'network' });
    const loader = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');
    const { result } = renderHook(() => useAsyncResource('a', loader));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe(error);
    expect(console.error).toHaveBeenCalledWith(error);

    act(() => result.current.retry());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toBe('ok');
  });

  it('aborts the old request on key change and never shows its stale result', async () => {
    const requests = {};
    const loader = vi.fn((key, signal) => {
      requests[key] = { ...deferred(), signal };
      return requests[key].promise;
    });
    const { result, rerender } = renderHook(({ key }) => useAsyncResource(key, loader), {
      initialProps: { key: 'a' },
    });

    rerender({ key: 'b' });
    expect(requests.a.signal.aborted).toBe(true);

    await act(async () => requests.a.resolve('stale'));
    expect(result.current.status).toBe('loading');

    await act(async () => requests.b.resolve('fresh'));
    expect(result.current).toMatchObject({ status: 'success', data: 'fresh' });
  });

  it('ignores abort errors and aborts on unmount', async () => {
    let signal;
    const loader = vi.fn((_key, s) => {
      signal = s;
      return new Promise((_resolve, reject) =>
        s.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
      );
    });
    const { unmount } = renderHook(() => useAsyncResource('a', loader));

    unmount();
    await Promise.resolve();
    expect(signal.aborted).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });
});
