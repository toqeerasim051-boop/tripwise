// @vitest-environment node
import {
  applySavedLinkValues,
  createSavedLink,
  linkTypeLabel,
  savedLinkToValues,
} from './savedLinks.js';

describe('saved links', () => {
  it('creates links with a trimmed label and normalised URL', () => {
    expect(
      createSavedLink(
        { type: 'hotel', label: '  Hotel conf ', url: 'booking.com/c/1' },
        () => 'l1',
      ),
    ).toEqual({ id: 'l1', type: 'hotel', label: 'Hotel conf', url: 'https://booking.com/c/1' });
  });

  it('round-trips through form values and keeps the id on edit', () => {
    const link = { id: 'l1', type: 'flight', label: 'Flight', url: 'https://air.example/x' };
    expect(applySavedLinkValues(link, savedLinkToValues(link))).toEqual(link);
    expect(applySavedLinkValues(link, { ...savedLinkToValues(link), label: 'New' }).id).toBe('l1');
  });

  it('labels link types', () => {
    expect(linkTypeLabel('activity')).toBe('Activity');
    expect(linkTypeLabel('weird')).toBe('Other');
  });
});
