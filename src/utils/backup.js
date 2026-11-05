/**
 * JSON backup of the user's data (trips + wishlist), so it can be moved to another browser or
 * device. Imported files are untrusted: they go through the same sanitisers as stored data.
 */
import { sanitizeTrips } from './tripModel.js';
import { sanitizeWishlist } from './wishlist.js';

export const BACKUP_APP = 'TripWise';
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

/** An import problem with a message that can be shown to the user as-is. */
export class BackupError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BackupError';
  }
}

export function createBackup({ trips, wishlist, exportedAt }) {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt, trips, wishlist };
}

/** "tripwise-backup-2026-10-27.json" */
export function backupFileName(today) {
  return `tripwise-backup-${today}.json`;
}

/**
 * Validates a backup file's text and returns { trips, wishlist }, sanitised.
 * Throws BackupError when the file can't be used. `options` are passed to sanitizeTrips.
 */
export function parseBackup(text, options) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError("This file isn't a TripWise backup (it isn't valid JSON).");
  }

  if (!data || typeof data !== 'object' || data.app !== BACKUP_APP) {
    throw new BackupError("This file isn't a TripWise backup.");
  }
  if (!Number.isInteger(data.version) || data.version < 1) {
    throw new BackupError("This backup file is damaged: its version number can't be read.");
  }
  if (data.version > BACKUP_VERSION) {
    throw new BackupError('This backup was made by a newer version of TripWise.');
  }

  return { trips: sanitizeTrips(data.trips, options), wishlist: sanitizeWishlist(data.wishlist) };
}
