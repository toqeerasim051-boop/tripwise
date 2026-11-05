import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { CloseIcon, MenuIcon, SearchIcon } from '../common/Icons.jsx';
import Logo from '../common/Logo.jsx';
import HeaderSearch from './HeaderSearch.jsx';
import ThemeSwitcher from './ThemeSwitcher.jsx';
import { useElementVisible } from '../../hooks/useElementVisible.js';
import { useWishlist } from '../../hooks/useWishlist.js';

const NAV_ITEMS = [
  { to: '/', label: 'Explore', end: true },
  { to: '/trips', label: 'My trips' },
  { to: '/wishlist', label: 'Wishlist' },
];

function navLinkClass({ isActive }) {
  return [
    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-primary-soft text-fg' : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
  ].join(' ');
}

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const wishlistCount = useWishlist().count;
  // Explore has its own big search in the hero: the header search appears once it scrolls away.
  const isExplore = useLocation().pathname === '/';
  const heroSearchVisible = useElementVisible(isExplore ? 'explore-search' : null);
  const showSearch = !isExplore || !heroSearchVisible;
  const searchStateClass = showSearch
    ? 'visible opacity-100 translate-y-0'
    : 'invisible opacity-0 -translate-y-1';

  return (
    <header
      className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur print:hidden"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        closeMenu();
        setSearchOpen(false);
      }}
    >
      <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link to="/" onClick={closeMenu} className="rounded-md text-fg">
          <Logo />
        </Link>

        {/* Hidden (not just transparent) while the hero search is on screen, so it can't be focused. */}
        <div
          aria-hidden={!showSearch || undefined}
          className={`hidden max-w-xs flex-1 transition-[opacity,translate,visibility] duration-300 sm:mx-4 sm:block ${searchStateClass}`}
        >
          <HeaderSearch />
        </div>

        <div className="flex items-center gap-1 sm:hidden">
          {showSearch && (
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-md text-fg hover:bg-surface-muted"
              aria-expanded={searchOpen}
              aria-controls="mobile-search"
              onClick={() => {
                setSearchOpen((open) => !open);
                closeMenu();
              }}
            >
              <span className="sr-only">{searchOpen ? 'Close search' : 'Search'}</span>
              {searchOpen ? <CloseIcon className="size-5" /> : <SearchIcon className="size-5" />}
            </button>
          )}
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-fg hover:bg-surface-muted"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => {
              setMenuOpen((open) => !open);
              setSearchOpen(false);
            }}
          >
            <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
            {menuOpen ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6" />}
          </button>
        </div>

        {searchOpen && showSearch && (
          <div id="mobile-search" className="w-full pt-2 sm:hidden">
            <HeaderSearch autoFocus onSearch={() => setSearchOpen(false)} />
          </div>
        )}

        {/* On small screens the nav and the theme switcher collapse into the menu. */}
        <div
          id="site-menu"
          className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-3 pt-2 sm:flex sm:w-auto sm:flex-row sm:items-center sm:gap-4 sm:pt-0`}
        >
          <nav aria-label="Primary">
            <ul className="flex flex-col gap-1 sm:flex-row">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={navLinkClass} onClick={closeMenu}>
                    {item.label}
                    {item.to === '/wishlist' && wishlistCount > 0 && (
                      // Accessible name: "Wishlist (2 saved)"; the visual badge is hidden from AT.
                      <>
                        {' '}
                        <span
                          aria-hidden="true"
                          className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-on-primary"
                        >
                          {wishlistCount}
                        </span>
                        <span className="sr-only">({wishlistCount} saved)</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
