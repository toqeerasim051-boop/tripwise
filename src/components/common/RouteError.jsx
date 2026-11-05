import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { buttonStyles } from './buttonStyles.js';

/** Router error boundary: catches render and loader errors so users never see a blank screen. */
export default function RouteError() {
  const error = useRouteError();
  console.error(error);

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong while showing this page.';

  return (
    <div role="alert" className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 tabIndex={-1} className="text-2xl font-bold text-fg">
        Oops — something broke
      </h1>
      <p className="mt-2 text-fg-muted">{message}</p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          className={buttonStyles.secondary}
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
        <Link to="/" className={buttonStyles.primary}>
          Go to Explore
        </Link>
      </div>
    </div>
  );
}
