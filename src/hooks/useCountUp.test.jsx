import { act, render, screen } from '@testing-library/react';
import { useCountUp } from './useCountUp.js';

function Counter({ target }) {
  const [ref, value] = useCountUp(target, 1000);
  return <span ref={ref}>{value}</span>;
}

afterEach(() => vi.unstubAllGlobals());

describe('useCountUp', () => {
  it('shows the target at once when IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<Counter target={52} />);
    expect(screen.getByText('52')).toBeInTheDocument();
  });

  it('starts at 0 and counts up once the element is visible', () => {
    let notify;
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback) {
          notify = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const frames = [];
    vi.stubGlobal('requestAnimationFrame', (callback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => {});
    render(<Counter target={250} />);
    expect(screen.getByText('0')).toBeInTheDocument();

    act(() => notify([{ isIntersecting: true }]));
    const start = performance.now();
    act(() => frames.shift()(start + 500)); // halfway, eased: well past half
    expect(Number(screen.getByText(/\d+/).textContent)).toBeGreaterThan(125);
    act(() => frames.shift()(start + 1000));
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(frames).toHaveLength(0); // finished
  });
});
