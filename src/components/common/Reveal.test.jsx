import { act, render, screen } from '@testing-library/react';
import Reveal from './Reveal.jsx';

afterEach(() => vi.unstubAllGlobals());

describe('Reveal', () => {
  it('shows the content at once when IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(
      <Reveal as="section" aria-label="Intro">
        Hello
      </Reveal>,
    );
    expect(screen.getByRole('region', { name: 'Intro' })).toHaveAttribute('data-shown', 'true');
  });

  it('reveals the content once it scrolls into view, with the given delay', () => {
    let notify;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback) {
          notify = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    render(
      <ul>
        <Reveal as="li" delay={160}>
          Card
        </Reveal>
      </ul>,
    );
    const item = screen.getByRole('listitem');
    expect(item).toHaveClass('reveal');
    expect(item).not.toHaveAttribute('data-shown');
    expect(item.style.getPropertyValue('--reveal-delay')).toBe('160ms');

    act(() => notify([{ isIntersecting: false }]));
    expect(item).not.toHaveAttribute('data-shown');
    act(() => notify([{ isIntersecting: true }]));
    expect(item).toHaveAttribute('data-shown', 'true');
    expect(disconnect).toHaveBeenCalled();
  });
});
