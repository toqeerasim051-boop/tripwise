/** Chooses which forecast days to show for a trip. Pure; dates are destination-local ISO dates. */
import { diffInDays } from './dates.js';

export const FALLBACK_FORECAST_DAYS = 7;

/**
 * - 'trip':  some trip dates fall inside the forecast window -> show exactly those days
 *            (`coveredDays` of `tripDays`)
 * - 'later': the trip starts after the window -> show the current week, `daysUntilStart` away
 * - 'past':  the trip ended before the window -> show the current week
 */
export function getTripForecastView(forecast, trip) {
  const tripDays = trip.days.length;
  const daily = forecast.daily;
  const inTrip = daily.filter((day) => day.date >= trip.startDate && day.date <= trip.endDate);
  const firstDate = daily[0]?.date;

  if (inTrip.length > 0) {
    return {
      mode: 'trip',
      days: inTrip,
      coveredDays: inTrip.length,
      tripDays,
      todayDate: firstDate,
    };
  }

  const currentWeek = daily.slice(0, FALLBACK_FORECAST_DAYS);
  if (firstDate && trip.endDate < firstDate) {
    return { mode: 'past', days: currentWeek, todayDate: firstDate };
  }
  return {
    mode: 'later',
    days: currentWeek,
    todayDate: firstDate,
    daysUntilStart: firstDate ? diffInDays(firstDate, trip.startDate) : null,
  };
}
