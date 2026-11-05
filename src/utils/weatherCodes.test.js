// @vitest-environment node
import { getWeatherInfo } from './weatherCodes.js';

describe('getWeatherInfo', () => {
  it.each([
    [0, 'Clear sky', 'clear'],
    [3, 'Overcast', 'cloudy'],
    [63, 'Rain', 'rain'],
    [75, 'Heavy snow', 'snow'],
    [95, 'Thunderstorm', 'thunderstorm'],
  ])('maps code %i', (code, label, icon) => {
    expect(getWeatherInfo(code)).toMatchObject({ label, icon });
  });

  it.each([[4], [null], [undefined], ['0x']])('falls back for unknown code %s', (code) => {
    expect(getWeatherInfo(code)).toMatchObject({ label: 'Unknown conditions', icon: 'unknown' });
  });
});
