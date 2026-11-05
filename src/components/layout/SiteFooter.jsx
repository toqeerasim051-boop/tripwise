import { Link } from 'react-router';
import WaveDivider from '../common/WaveDivider.jsx';
import Logo from '../common/Logo.jsx';

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { to: '/', label: 'Destinations' },
      { to: '/wishlist', label: 'Wishlist' },
    ],
  },
  {
    title: 'Plan',
    links: [
      { to: '/trips', label: 'My trips' },
      { to: '/trips/new', label: 'New trip' },
    ],
  },
];

/** Dark footer with a wave edge: brand, app links in columns, and a bottom bar. */
export default function SiteFooter() {
  return (
    <footer className="mt-10 print:hidden">
      <WaveDivider className="text-scrim" />
      <div className="bg-scrim text-on-scrim">
        <div className="mx-auto grid max-w-content gap-10 px-4 pt-8 pb-10 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex rounded-md">
              <Logo tone="onScrim" />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-on-scrim/80">
              Plan smarter trips. Free, private and no sign-up: your plans stay in your browser.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={`${column.title} links`}>
              <h2 className="font-sans text-sm font-semibold tracking-widest text-on-scrim-accent uppercase">
                {column.title}
              </h2>
              <ul role="list" className="mt-3 grid gap-2">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-on-scrim/85 transition-colors hover:text-on-scrim hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-t border-on-scrim/15">
          <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-xs text-on-scrim/70 sm:px-6">
            <p>© {new Date().getFullYear()} TripWise. Made for curious travellers.</p>
            {/* The photo licences (CC BY-SA) require a reachable attribution. */}
            <Link
              to="/about"
              className="rounded-sm underline-offset-4 hover:text-on-scrim hover:underline"
            >
              Photo credits
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
