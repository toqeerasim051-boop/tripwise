import { act, renderHook } from '@testing-library/react';
import { useDebounce } from './useDebounce.js';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only updates after the value stops changing for the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'abc' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('abc');
  });

  it('applies flushed values at once, so an old value never comes back', () => {
    const isBlank = (value) => value.trim() === '';
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300, { flushWhen: isBlank }),
      { initialProps: { value: 'fra' } },
    );

    rerender({ value: '' });
    expect(result.current).toBe('');

    rerender({ value: 'g' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(''); // not the old "fra"

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('g');
  });
});
