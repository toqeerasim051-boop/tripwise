import { useEffect } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';
import AppProviders from './AppProviders.jsx';
import { prefetchRoutes, routes } from './routes.jsx';

const router = createBrowserRouter(routes);

export default function App() {
  // Once the first page has loaded, fetch the other pages' code in the background so later
  // navigation is instant. Failures are ignored: the route loads it again when visited.
  useEffect(() => {
    const timer = setTimeout(() => prefetchRoutes().catch(() => {}), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
