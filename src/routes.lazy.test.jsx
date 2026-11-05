import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import AppProviders from './AppProviders.jsx';
import { prefetchRoutes, routes } from './routes.jsx';

// This file must not import test/renderRoute.jsx, which turns the lazy routes into normal ones.

const pageRoutes = routes[0].children[0].children;

describe('code-split routes', () => {
  it('bundles only the home page; every other page is lazy', () => {
    const home = pageRoutes.find((route) => route.index);
    expect(home.element).toBeTruthy();
    expect(home.lazy).toBeUndefined();
    // Pages only: the index (home) is bundled and redirects have an element instead.
    for (const route of pageRoutes.filter((item) => !item.index && !item.element)) {
      expect(route.lazy, route.path).toEqual(expect.any(Function));
    }
  });

  it('shows the loading screen, then the page once its code has loaded', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/trips'] });
    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading TripWise…');
    expect(await screen.findByRole('heading', { level: 1, name: 'My trips' })).toBeInTheDocument();
  });

  it('prefetches every page chunk', async () => {
    await expect(prefetchRoutes()).resolves.toHaveLength(12);
  });
});
