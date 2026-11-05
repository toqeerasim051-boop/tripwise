/** Fixed option lists and limits for the data model. */

export const ACTIVITY_CATEGORIES = [
  { value: 'sightseeing', label: 'Sightseeing' },
  { value: 'food', label: 'Food & drink' },
  { value: 'transport', label: 'Transport' },
  { value: 'lodging', label: 'Lodging' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

export const EXPENSE_CATEGORIES = [
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'transport', label: 'Transport' },
  { value: 'food', label: 'Food & drink' },
  { value: 'activities', label: 'Activities' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'other', label: 'Other' },
];

export const LINK_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'flight', label: 'Flight' },
  { value: 'activity', label: 'Activity' },
  { value: 'other', label: 'Other' },
];

export const LIMITS = {
  tripTitle: 80,
  tripMaxDays: 60,
  dayNotes: 2000,
  activityTitle: 100,
  activityLocation: 100,
  activityNotes: 1000,
  expenseDescription: 100,
  linkLabel: 60,
  urlLength: 2000,
  maxAmountCents: 1_000_000_000, // 10,000,000.00
};
