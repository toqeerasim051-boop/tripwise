import SettingsProvider from './context/SettingsProvider.jsx';
import TripsProvider from './context/TripsProvider.jsx';
import WishlistProvider from './context/WishlistProvider.jsx';

/** All app-wide context providers. Shared by App and tests so both see the same tree. */
export default function AppProviders({ children }) {
  return (
    <SettingsProvider>
      <TripsProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </TripsProvider>
    </SettingsProvider>
  );
}
