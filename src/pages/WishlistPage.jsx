import { Link } from 'react-router';
import PageHeader from '../components/common/PageHeader.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import { buttonStyles } from '../components/common/buttonStyles.js';
import CountryCard from '../components/countries/CountryCard.jsx';
import CountryGrid, { CountryGridSkeleton } from '../components/countries/CountryGrid.jsx';
import { useCountries } from '../hooks/useCountries.js';
import { useWishlist } from '../hooks/useWishlist.js';

const smallButton = 'px-3 py-1.5';

/** Shown for a saved code that no longer exists in the country data. */
function UnknownCountryCard({ countryCode, onRemove }) {
  return (
    <article className="flex h-full flex-col justify-between gap-3 rounded-xl border border-dashed border-line bg-surface p-4">
      <div>
        <h2 className="font-semibold text-fg">Unknown country ({countryCode})</h2>
        <p className="mt-1 text-sm text-fg-muted">This destination is no longer available.</p>
      </div>
      <button
        type="button"
        className={`${buttonStyles.secondary} ${smallButton}`}
        onClick={() => onRemove(countryCode)}
      >
        <span>
          Remove <span className="sr-only">{countryCode}</span> from wishlist
        </span>
      </button>
    </article>
  );
}

const getKey = (item) => item.countryCode;

export default function WishlistPage() {
  const wishlist = useWishlist();
  const { data: countries, status, error, retry } = useCountries();

  const description =
    wishlist.count === 0
      ? 'Destinations you want to visit. Start planning a trip from any of them.'
      : `${wishlist.count} saved ${wishlist.count === 1 ? 'destination' : 'destinations'}. Start planning a trip from any of them.`;

  let content;
  if (wishlist.count === 0) {
    content = (
      <EmptyState
        title="Your wishlist is empty"
        description="Select the heart button on any country to save it here."
        action={
          <Link to="/" className={buttonStyles.primary}>
            Explore destinations
          </Link>
        }
      />
    );
  } else if (status === 'error') {
    content = <ErrorState title="Couldn't load your wishlist" error={error} onRetry={retry} />;
  } else if (status !== 'success') {
    content = <CountryGridSkeleton count={wishlist.count} label="Loading your wishlist…" />;
  } else {
    const byCode = new Map(countries.map((country) => [country.code, country]));
    content = (
      <CountryGrid
        items={wishlist.items}
        getKey={getKey}
        renderItem={({ countryCode }) => {
          const country = byCode.get(countryCode);
          if (!country) {
            return <UnknownCountryCard countryCode={countryCode} onRemove={wishlist.remove} />;
          }
          return (
            <CountryCard country={country}>
              <Link
                to={`/trips/new?country=${country.code}`}
                className={`${buttonStyles.primary} ${smallButton}`}
              >
                Plan a trip <span className="sr-only">to {country.name}</span>
              </Link>
            </CountryCard>
          );
        }}
      />
    );
  }

  return (
    <>
      <PageHeader eyebrow="Saved for later" title="Wishlist" description={description} />
      {content}
    </>
  );
}
