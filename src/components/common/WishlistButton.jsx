import { useWishlist } from '../../hooks/useWishlist.js';
import { HeartIcon } from './Icons.jsx';
import { buttonStyles } from './buttonStyles.js';

/**
 * Saves/removes a country. The accessible name states the action ("Save France to wishlist" /
 * "Remove France from wishlist") and contains the visible text. `variant="icon"` is the
 * compact heart used on cards.
 */
export default function WishlistButton({
  countryCode,
  countryName,
  variant = 'text',
  className = '',
}) {
  const wishlist = useWishlist();
  const saved = wishlist.has(countryCode);
  const onClick = () => wishlist.toggle(countryCode);

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface/90 transition-colors hover:bg-surface-muted ${saved ? 'text-danger' : 'text-fg-muted'} ${className}`}
      >
        <HeartIcon filled={saved} className="size-5" />
        <span className="sr-only">
          {saved ? `Remove ${countryName} from wishlist` : `Save ${countryName} to wishlist`}
        </span>
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} className={`${buttonStyles.secondary} ${className}`}>
      <HeartIcon filled={saved} className={`size-5 ${saved ? 'text-danger' : ''}`} />
      {saved ? (
        // Spaces sit outside the sr-only span: trailing spaces inside it get trimmed from the name.
        <span>
          Remove <span className="sr-only">{countryName}</span> from wishlist
        </span>
      ) : (
        <span>
          Save <span className="sr-only">{countryName}</span> to wishlist
        </span>
      )}
    </button>
  );
}
