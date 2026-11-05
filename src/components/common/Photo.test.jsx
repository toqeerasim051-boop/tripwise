import { fireEvent, render, screen } from '@testing-library/react';
import Photo from './Photo.jsx';

describe('Photo', () => {
  it('renders the image, then the fallback if it fails to load', () => {
    const { container } = render(<Photo src="/broken.jpg" alt="Lake" fallback={<p>No photo</p>} />);
    const image = screen.getByRole('img', { name: 'Lake' });
    expect(image).toHaveAttribute('loading', 'lazy');

    fireEvent.error(image);

    expect(screen.getByText('No photo')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders the fallback when there is no source, and loads eagerly when asked', () => {
    const { rerender } = render(<Photo src={null} alt="" fallback={<p>No photo</p>} />);
    expect(screen.getByText('No photo')).toBeInTheDocument();

    rerender(<Photo src="/hero.jpg" alt="Hero" eager />);
    expect(screen.getByRole('img', { name: 'Hero' })).toHaveAttribute('loading', 'eager');
  });

  it('serves our own photos as WebP with the JPEG as fallback', () => {
    const { container } = render(<Photo src="/images/attractions/a.jpg" alt="A lake" />);
    const source = container.querySelector('picture source');
    expect(source).toHaveAttribute('type', 'image/webp');
    expect(source).toHaveAttribute('srcset', '/images/attractions/a.webp');
    expect(screen.getByRole('img', { name: 'A lake' })).toHaveAttribute(
      'src',
      '/images/attractions/a.jpg',
    );
  });

  it('passes a responsive srcset and sizes, and leaves external images alone', () => {
    const { container, rerender } = render(
      <Photo src="/images/hero.jpg" webpSrcSet="/images/hero-960.webp 960w" sizes="100vw" alt="" />,
    );
    expect(container.querySelector('source')).toHaveAttribute('sizes', '100vw');
    expect(container.querySelector('source')).toHaveAttribute(
      'srcset',
      '/images/hero-960.webp 960w',
    );

    rerender(<Photo src="https://example.com/x.jpg" alt="" />);
    expect(container.querySelector('picture')).toBeNull();
  });
});
