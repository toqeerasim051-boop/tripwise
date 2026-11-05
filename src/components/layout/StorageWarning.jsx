import { useStorageStatus } from '../../hooks/useStorageStatus.js';
import { AlertIcon } from '../common/Icons.jsx';

const MESSAGES = {
  quota:
    "Your browser's storage for TripWise is full, so recent changes can't be saved. Remove some items to free up space.",
  unavailable: 'Your browser is blocking storage, so changes will be lost when you close this tab.',
};

/** Persistent banner shown while any save is failing. Clears itself after a successful save. */
export default function StorageWarning() {
  const failures = Object.values(useStorageStatus());
  if (failures.length === 0) return null;

  const reason = failures.includes('quota') ? 'quota' : 'unavailable';
  return (
    <div role="alert" className="border-b border-warning/40 bg-surface">
      <p className="mx-auto flex max-w-content items-start gap-2 px-4 py-3 text-sm text-fg sm:px-6">
        <AlertIcon className="mt-0.5 size-4 shrink-0 text-warning" />
        <span>
          <strong className="font-semibold">Changes not saved.</strong> {MESSAGES[reason]}
        </span>
      </p>
    </div>
  );
}
