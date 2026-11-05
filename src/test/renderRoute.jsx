import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import AppProviders from '../AppProviders.jsx';
import { preloadRoutes, routes } from '../routes.jsx';

// Pages are lazy-loaded chunks in the app; load them up front so tests render synchronously.
await preloadRoutes();

/** Renders the real route table and providers at `path` using an in-memory router. */
export function renderRoute(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const user = userEvent.setup();
  return {
    user,
    router,
    ...render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}
