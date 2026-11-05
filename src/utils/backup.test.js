// @vitest-environment node
import {
  BackupError,
  backupFileName,
  createBackup,
  MAX_BACKUP_BYTES,
  parseBackup,
} from './backup.js';
import { makeTrip } from '../test/fixtures.js';

const AT = '2026-10-27T12:00:00.000Z';
const wishlist = [{ countryCode: 'JPN', addedAt: AT }];

describe('createBackup / backupFileName', () => {
  it('wraps the data with the app name and version', () => {
    const trips = [makeTrip()];
    expect(createBackup({ trips, wishlist, exportedAt: AT })).toEqual({
      app: 'TripWise',
      version: 1,
      exportedAt: AT,
      trips,
      wishlist,
    });
    expect(backupFileName('2026-10-27')).toBe('tripwise-backup-2026-10-27.json');
    expect(MAX_BACKUP_BYTES).toBeGreaterThan(1024 * 1024);
  });
});

describe('parseBackup', () => {
  it('round-trips an exported backup', () => {
    const trip = makeTrip();
    const text = JSON.stringify(createBackup({ trips: [trip], wishlist, exportedAt: AT }));
    expect(parseBackup(text)).toEqual({ trips: [trip], wishlist });
  });

  it('sanitises the contents like stored data', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const text = JSON.stringify({
      app: 'TripWise',
      version: 1,
      trips: [makeTrip(), { id: 'broken' }],
      wishlist: [...wishlist, { countryCode: 'bad' }],
    });
    const result = parseBackup(text);
    expect(result.trips.map((trip) => trip.id)).toEqual(['trip-1']);
    expect(result.wishlist).toEqual(wishlist);
  });

  it('treats missing sections as empty', () => {
    expect(parseBackup('{"app":"TripWise","version":1}')).toEqual({ trips: [], wishlist: [] });
  });

  it.each([
    ['not json', "isn't valid JSON"],
    ['null', "isn't a TripWise backup"],
    ['[]', "isn't a TripWise backup"],
    ['{"app":"Other","version":1}', "isn't a TripWise backup"],
    ['{"app":"TripWise"}', 'damaged'],
    ['{"app":"TripWise","version":0}', 'damaged'],
    ['{"app":"TripWise","version":2}', 'newer version'],
  ])('rejects %s with a readable message', (text, message) => {
    expect(() => parseBackup(text)).toThrow(BackupError);
    expect(() => parseBackup(text)).toThrow(message);
  });
});
