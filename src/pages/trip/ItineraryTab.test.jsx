import { screen, within } from '@testing-library/react';
import { renderRoute } from '../../test/renderRoute.jsx';
import { forecast, makeTrip, readStoredTrips, storeTrips } from '../../test/fixtures.js';
import { getForecast } from '../../services/openMeteo.js';
import { addDays, todayIso } from '../../utils/dates.js';
import { buildDays } from '../../utils/itinerary.js';

vi.mock('../../services/restCountries.js', () => ({
  getAllCountries: vi.fn(async () => []),
  getCountry: vi.fn(),
  getNeighbours: vi.fn(),
}));
// The fixture forecast covers 2026-11-01 .. 2026-11-16; 1 Nov is rainy (80%), the rest clear.
// Most trips here are in May, outside the window, so they get no weather advice.
vi.mock('../../services/openMeteo.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getForecast: vi.fn(async () => forecast),
}));

const activity = (id, title, extra = {}) => ({
  id,
  title,
  time: null,
  location: '',
  notes: '',
  category: 'sightseeing',
  url: '',
  ...extra,
});

function seed(configure = () => {}) {
  const trip = makeTrip({ id: 'abc' });
  configure(trip);
  storeTrips([trip]);
  return trip;
}

const day = (number) => screen.getByRole('region', { name: new RegExp(`^Day ${number} ·`) });
const titlesIn = (region) =>
  within(region)
    .queryAllByRole('article')
    .map((item) => within(item).getByRole('heading', { level: 4 }).textContent);
const storedTitles = (dayIndex) =>
  readStoredTrips()[0].days[dayIndex].activities.map((item) => item.title);
const status = () => screen.getAllByRole('status').find((el) => el.closest('section'));

beforeEach(() => {
  localStorage.clear();
  getForecast.mockResolvedValue(forecast);
});

describe('ItineraryTab', () => {
  it('lists every day with its date and an empty state', () => {
    seed();
    renderRoute('/trips/abc/itinerary');

    expect(screen.getByRole('heading', { level: 2, name: 'Itinerary' })).toBeInTheDocument();
    expect(screen.getByText('0 activities across 0 of 3 days')).toBeInTheDocument();
    expect(screen.getAllByRole('region', { name: /^Day \d ·/ })).toHaveLength(3);
    expect(within(day(1)).getByText('No activities planned yet.')).toBeInTheDocument();
  });

  it('adds an activity through the dialog, with validation', async () => {
    seed();
    const { user } = renderRoute('/trips/abc/itinerary');
    const addButton = within(day(2)).getByRole('button', { name: 'Add activity to Day 2' });

    await user.click(addButton);
    const dialog = screen.getByRole('dialog', { name: 'Add activity to Day 2' });
    expect(within(dialog).getByLabelText('Title')).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Add activity' }));
    expect(within(dialog).getByText('Title is required.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Title'), 'Louvre');
    await user.type(within(dialog).getByLabelText('Time', { exact: false }), '09:30');
    await user.type(within(dialog).getByLabelText('Link', { exact: false }), 'louvre.fr');
    await user.click(within(dialog).getByRole('button', { name: 'Add activity' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(addButton).toHaveFocus();
    expect(titlesIn(day(2))).toEqual(['Louvre']);
    expect(within(day(2)).getByRole('link', { name: /louvre\.fr/ })).toHaveAttribute(
      'href',
      'https://louvre.fr',
    );
    expect(status()).toHaveTextContent('Added “Louvre” to Day 2.');
    expect(readStoredTrips()[0].days[1].activities[0]).toMatchObject({
      title: 'Louvre',
      time: '09:30',
      url: 'https://louvre.fr',
    });
  });

  it('rejects unsafe links', async () => {
    seed();
    const { user } = renderRoute('/trips/abc/itinerary');
    await user.click(within(day(1)).getByRole('button', { name: 'Add activity to Day 1' }));
    const dialog = screen.getByRole('dialog');

    await user.type(within(dialog).getByLabelText('Title'), 'Trap');
    await user.type(within(dialog).getByLabelText('Link', { exact: false }), 'javascript:alert(1)');
    await user.click(within(dialog).getByRole('button', { name: 'Add activity' }));

    expect(within(dialog).getByText(/valid web address/)).toBeInTheDocument();
    expect(storedTitles(0)).toEqual([]);
  });

  it('edits an activity', async () => {
    seed((trip) => {
      trip.days[0].activities = [activity('a1', 'Louvre')];
    });
    const { user } = renderRoute('/trips/abc/itinerary');
    const editButton = screen.getByRole('button', { name: 'Edit Louvre' });

    await user.click(editButton);
    const dialog = screen.getByRole('dialog', { name: 'Edit “Louvre”' });
    const title = within(dialog).getByLabelText('Title');
    expect(title).toHaveValue('Louvre');
    await user.clear(title);
    await user.type(title, 'Musée du Louvre');
    await user.click(within(dialog).getByRole('button', { name: 'Save activity' }));

    expect(titlesIn(day(1))).toEqual(['Musée du Louvre']);
    expect(screen.getByRole('button', { name: 'Edit Musée du Louvre' })).toHaveFocus();
  });

  it('reorders with move up/down, keeping focus and announcing the position', async () => {
    seed((trip) => {
      trip.days[0].activities = [activity('a', 'A'), activity('b', 'B'), activity('c', 'C')];
    });
    const { user } = renderRoute('/trips/abc/itinerary');

    expect(screen.getByRole('button', { name: 'Move A up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move C down' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Move A down' }));
    expect(titlesIn(day(1))).toEqual(['B', 'A', 'C']);
    expect(screen.getByRole('button', { name: 'Move A down' })).toHaveFocus();
    expect(status()).toHaveTextContent('Moved “A” to position 2 of 3 in Day 1.');

    await user.click(screen.getByRole('button', { name: 'Move A up' }));
    expect(titlesIn(day(1))).toEqual(['A', 'B', 'C']);
    // "up" is now disabled at the top, so focus falls back to "down".
    expect(screen.getByRole('button', { name: 'Move A down' })).toHaveFocus();
    expect(storedTitles(0)).toEqual(['A', 'B', 'C']);
  });

  it('moves an activity to another day', async () => {
    seed((trip) => {
      trip.days[0].activities = [activity('a', 'Louvre')];
      trip.days[2].activities = [activity('x', 'Eiffel Tower')];
    });
    const { user } = renderRoute('/trips/abc/itinerary');
    const moveButton = screen.getByRole('button', { name: 'Move Louvre to another day…' });

    await user.click(moveButton);
    const dialog = screen.getByRole('dialog', { name: 'Move “Louvre” to…' });
    expect(within(dialog).queryByRole('button', { name: /^Day 1 ·/ })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^Day 3 ·.*1 activity$/ }));

    expect(titlesIn(day(1))).toEqual([]);
    expect(titlesIn(day(3))).toEqual(['Eiffel Tower', 'Louvre']);
    expect(moveButton).not.toBeInTheDocument(); // re-created in Day 3's list
    expect(screen.getByRole('button', { name: 'Move Louvre to another day…' })).toHaveFocus();
    expect(status()).toHaveTextContent('Moved “Louvre” to Day 3.');
    expect(storedTitles(2)).toEqual(['Eiffel Tower', 'Louvre']);
  });

  it('deletes after confirmation and moves focus to the next activity', async () => {
    seed((trip) => {
      trip.days[0].activities = [activity('a', 'A'), activity('b', 'B')];
    });
    const { user } = renderRoute('/trips/abc/itinerary');

    await user.click(screen.getByRole('button', { name: 'Delete A' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete “A”?' })).getByRole('button', {
        name: 'Delete activity',
      }),
    );

    expect(titlesIn(day(1))).toEqual(['B']);
    expect(screen.getByRole('button', { name: 'Edit B' })).toHaveFocus();
    expect(status()).toHaveTextContent('Deleted “A”.');

    await user.click(screen.getByRole('button', { name: 'Delete B' }));
    await user.click(screen.getByRole('button', { name: 'Delete activity' }));
    expect(screen.getByRole('button', { name: 'Add activity to Day 1' })).toHaveFocus();
    expect(storedTitles(0)).toEqual([]);
  });

  it('sorts a day by time', async () => {
    seed((trip) => {
      trip.days[0].activities = [
        activity('a', 'Dinner', { time: '19:00' }),
        activity('b', 'Stroll'),
        activity('c', 'Breakfast', { time: '08:00' }),
      ];
    });
    const { user } = renderRoute('/trips/abc/itinerary');

    await user.click(within(day(1)).getByRole('button', { name: 'Sort by time for Day 1' }));

    expect(titlesIn(day(1))).toEqual(['Breakfast', 'Dinner', 'Stroll']);
    expect(within(day(2)).queryByRole('button', { name: /Sort by time/ })).not.toBeInTheDocument();
  });

  it('adds and edits day notes', async () => {
    seed();
    const { user } = renderRoute('/trips/abc/itinerary');

    await user.click(within(day(1)).getByRole('button', { name: 'Add notes for Day 1' }));
    const textarea = within(day(1)).getByLabelText('Notes for Day 1');
    expect(textarea).toHaveFocus();
    await user.type(textarea, 'Arrive at CDG 10:00');
    await user.click(within(day(1)).getByRole('button', { name: 'Save notes' }));

    expect(within(day(1)).getByText('Arrive at CDG 10:00')).toBeInTheDocument();
    expect(within(day(1)).getByRole('button', { name: 'Edit notes for Day 1' })).toHaveFocus();
    expect(readStoredTrips()[0].days[0].notes).toBe('Arrive at CDG 10:00');
  });

  it('updates the trip summary counts and last-edited time', async () => {
    const trip = seed();
    const { user } = renderRoute('/trips/abc/itinerary');

    await user.click(within(day(1)).getByRole('button', { name: 'Add activity to Day 1' }));
    await user.type(screen.getByLabelText('Title'), 'Louvre');
    await user.click(screen.getByRole('button', { name: 'Add activity' }));

    expect(screen.getByText('1 activity across 1 of 3 days')).toBeInTheDocument();
    expect(readStoredTrips()[0].updatedAt > trip.updatedAt).toBe(true);
  });
});

describe('ItineraryTab — attraction suggestions', () => {
  it('suggests top attractions for the destination and adds one to a chosen day', async () => {
    seed();
    const { user } = renderRoute('/trips/abc/itinerary');

    const suggestions = await screen.findByRole('region', { name: 'Top attractions in France' });
    await user.click(within(suggestions).getByRole('button', { name: 'Add Louvre' }));
    const dialog = screen.getByRole('dialog', { name: 'Add “Louvre” to a trip' });
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Day' }), 'abc-day-3');
    await user.click(within(dialog).getByRole('button', { name: 'Add to Day 3' }));

    expect(titlesIn(day(3))).toEqual(['Louvre']);
    expect(storedTitles(2)).toEqual(['Louvre']);
    expect(status()).toHaveTextContent('Added “Louvre” to Day 3.');
  });

  it('shows no suggestions for destinations without curated attractions', async () => {
    storeTrips([makeTrip({ id: 'abc', countryCode: 'TUV', destinationName: 'Tuvalu' })]);
    renderRoute('/trips/abc/itinerary');
    await screen.findByRole('heading', { name: 'Itinerary' });
    expect(screen.queryByRole('region', { name: /Top attractions/ })).not.toBeInTheDocument();
  });

  describe('auto-plan', () => {
    // Only days from today on are planned, so these trips start next month.
    function seedUpcoming() {
      const startDate = addDays(todayIso(), 30);
      const endDate = addDays(startDate, 2);
      let n = 0;
      storeTrips([
        makeTrip({
          id: 'abc',
          startDate,
          endDate,
          days: buildDays(startDate, endDate, () => `d${(n += 1)}`),
        }),
      ]);
    }

    it('is not offered when every day is in the past', async () => {
      seed(); // the fixture trip is in May 2026
      renderRoute('/trips/abc/itinerary');
      expect(await screen.findByText('Top attractions in France')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Auto-plan my days' })).not.toBeInTheDocument();
    });

    it('previews a plan and adds the sights only after confirming', async () => {
      seedUpcoming();
      const { user } = renderRoute('/trips/abc/itinerary');
      const open = await screen.findByRole('button', { name: 'Auto-plan my days' });

      await user.click(open);
      const dialog = screen.getByRole('dialog', { name: 'Auto-plan my days' });
      expect(dialog).toHaveTextContent('Day 1');
      expect(dialog).toHaveTextContent('Eiffel Tower');
      expect(dialog).toHaveTextContent('Louvre');
      expect(storedTitles(0)).toEqual([]);

      await user.click(within(dialog).getByRole('button', { name: 'Add 2 sights to itinerary' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(titlesIn(day(1))).toEqual(['Eiffel Tower']);
      expect(titlesIn(day(2))).toEqual(['Louvre']);
      expect(readStoredTrips()[0].days[0].activities[0]).toMatchObject({
        category: 'sightseeing',
        location: 'Paris',
        url: '',
      });
      expect(status()).toHaveTextContent('Added 2 sights across 2 days.');
      // Everything is planned now, so the offer goes away.
      expect(screen.queryByRole('button', { name: 'Auto-plan my days' })).not.toBeInTheDocument();
    });

    it('cancels without changing the trip', async () => {
      seedUpcoming();
      const { user } = renderRoute('/trips/abc/itinerary');
      await user.click(await screen.findByRole('button', { name: 'Auto-plan my days' }));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(storedTitles(0)).toEqual([]);
      expect(screen.getByRole('button', { name: 'Auto-plan my days' })).toHaveFocus();
    });
  });

  describe('weather advice', () => {
    function seedNovember(configure = () => {}) {
      const trip = makeTrip({
        id: 'abc',
        startDate: '2026-11-01',
        endDate: '2026-11-03',
        days: ['2026-11-01', '2026-11-02', '2026-11-03'].map((date, index) => ({
          id: `d${index + 1}`,
          date,
          notes: '',
          activities: [],
        })),
      });
      configure(trip);
      storeTrips([trip]);
    }

    it('shows the forecast on each day inside the forecast window', async () => {
      seedNovember();
      renderRoute('/trips/abc/itinerary');
      expect(await within(day(1)).findByText(/Light rain/)).toHaveTextContent('80% chance of rain');
      expect(within(day(2)).getByText(/Clear sky/)).toBeInTheDocument();
    });

    it('warns about outdoor plans on a wet day and moves them to a dry day', async () => {
      seedNovember((trip) => {
        trip.days[0].activities = [
          activity('walk', 'Seine walk'),
          activity('lunch', 'Lunch', { category: 'food' }),
        ];
        trip.days[1].activities = [activity('x', 'Busy day')];
      });
      const { user } = renderRoute('/trips/abc/itinerary');

      expect(
        await within(day(1)).findByText(
          'Bad weather is forecast for Day 1. You have 1 outdoor plan that day.',
        ),
      ).toBeInTheDocument();
      expect(within(day(2)).queryByText(/Bad weather/)).not.toBeInTheDocument();

      // Day 3 is dry and emptier than Day 2.
      await user.click(within(day(1)).getByRole('button', { name: 'Move outdoor plans to Day 3' }));
      expect(titlesIn(day(1))).toEqual(['Lunch']);
      expect(titlesIn(day(3))).toEqual(['Seine walk']);
      expect(within(day(1)).queryByText(/Bad weather/)).not.toBeInTheDocument();
      expect(status()).toHaveTextContent('Moved 1 outdoor plan from Day 1 to Day 3.');
      expect(screen.getByRole('button', { name: /Move Seine walk to another day/ })).toHaveFocus();
    });

    it('shows no advice when the forecast fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      getForecast.mockRejectedValue(new Error('offline'));
      seedNovember((trip) => {
        trip.days[0].activities = [activity('walk', 'Seine walk')];
      });
      renderRoute('/trips/abc/itinerary');

      expect(await screen.findByText('Top attractions in France')).toBeInTheDocument();
      expect(screen.queryByText(/Bad weather/)).not.toBeInTheDocument();
      expect(screen.queryByText(/chance of rain/)).not.toBeInTheDocument();
    });
  });
});
