// @vitest-environment node
import { getTripForecastView } from './tripForecast.js';
import { forecast, makeTrip } from '../test/fixtures.js';
import { buildDays } from './itinerary.js';

// Fixture forecast covers 2026-11-01 .. 2026-11-16.
function trip(startDate, endDate) {
  let n = 0;
  return makeTrip({
    startDate,
    endDate,
    days: buildDays(startDate, endDate, () => `d${(n += 1)}`),
  });
}

describe('getTripForecastView', () => {
  it('shows exactly the trip days inside the window', () => {
    const view = getTripForecastView(forecast, trip('2026-11-03', '2026-11-05'));
    expect(view).toMatchObject({
      mode: 'trip',
      coveredDays: 3,
      tripDays: 3,
      todayDate: '2026-11-01',
    });
    expect(view.days.map((day) => day.date)).toEqual(['2026-11-03', '2026-11-04', '2026-11-05']);
  });

  it('reports partial coverage when the trip runs past the window', () => {
    const view = getTripForecastView(forecast, trip('2026-11-15', '2026-11-20'));
    expect(view).toMatchObject({ mode: 'trip', coveredDays: 2, tripDays: 6 });
  });

  it('includes an ongoing trip that started before the window', () => {
    const view = getTripForecastView(forecast, trip('2026-10-28', '2026-11-02'));
    expect(view.days.map((day) => day.date)).toEqual(['2026-11-01', '2026-11-02']);
  });

  it('falls back to the current week for later trips, with days until start', () => {
    const view = getTripForecastView(forecast, trip('2026-12-24', '2026-12-26'));
    expect(view).toMatchObject({ mode: 'later', daysUntilStart: 53 });
    expect(view.days).toHaveLength(7);
  });

  it('falls back to the current week for past trips', () => {
    const view = getTripForecastView(forecast, trip('2026-05-01', '2026-05-03'));
    expect(view.mode).toBe('past');
    expect(view.days[0].date).toBe('2026-11-01');
  });
});
