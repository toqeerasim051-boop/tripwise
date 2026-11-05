import { Navigate } from 'react-router';
import AppLayout from './components/layout/AppLayout.jsx';
import PageLoading from './components/layout/PageLoading.jsx';
import RouteError from './components/common/RouteError.jsx';
import ExplorePage from './pages/ExplorePage.jsx';

/**
 * Code splitting: every page except the home page is its own chunk, loaded when its route is
 * first visited (React Router `lazy`). The router keeps showing the current page meanwhile
 * (AppLayout shows a progress bar), and `prefetchRoutes` warms the chunks once the app is idle.
 */
const loaders = [];
function page(load) {
  loaders.push(load);
  return { lazy: async () => ({ Component: (await load()).default }) };
}

/** Starts downloading every lazy page chunk (call when the app is idle). */
export function prefetchRoutes() {
  return Promise.all(loaders.map((load) => load()));
}

/**
 * Loads every lazy route now and makes it a normal one, so a router created afterwards renders
 * synchronously. For tests (src/test/renderRoute.jsx); the app uses the lazy routes.
 */
export async function preloadRoutes(list = routes) {
  for (const route of list) {
    if (route.lazy) {
      Object.assign(route, await route.lazy());
      delete route.lazy;
    }
    if (route.children) await preloadRoutes(route.children);
  }
}

/**
 * Route table shared by the app (browser router) and tests (memory router).
 * The pathless child route keeps the header/footer visible when a page throws.
 */
export const routes = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteError />,
    // Shown instead of the whole app while a directly opened page's chunk loads.
    HydrateFallback: PageLoading,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          // fullBleed: the page draws its own full-width hero and page container.
          { index: true, element: <ExplorePage />, handle: { fullBleed: true } },
          {
            path: 'countries/:code',
            handle: { fullBleed: true },
            ...page(() => import('./pages/CountryPage.jsx')),
          },
          { path: 'wishlist', ...page(() => import('./pages/WishlistPage.jsx')) },
          { path: 'trips', ...page(() => import('./pages/TripsPage.jsx')) },
          { path: 'trips/new', ...page(() => import('./pages/TripFormPage.jsx')) },
          { path: 'trips/:tripId/edit', ...page(() => import('./pages/TripFormPage.jsx')) },
          {
            path: 'trips/:tripId',
            ...page(() => import('./pages/trip/TripLayout.jsx')),
            children: [
              { index: true, ...page(() => import('./pages/trip/OverviewTab.jsx')) },
              { path: 'itinerary', ...page(() => import('./pages/trip/ItineraryTab.jsx')) },
              { path: 'budget', ...page(() => import('./pages/trip/BudgetTab.jsx')) },
              { path: 'bookings', ...page(() => import('./pages/trip/BookingsTab.jsx')) },
            ],
          },
          { path: 'about', ...page(() => import('./pages/AboutPage.jsx')) },
          // Old address of the attribution page.
          { path: 'credits', element: <Navigate to="/about" replace /> },
          { path: '*', ...page(() => import('./pages/NotFoundPage.jsx')) },
        ],
      },
    ],
  },
];
