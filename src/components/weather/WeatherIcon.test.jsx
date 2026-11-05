import { render } from '@testing-library/react';
import WeatherIcon from './WeatherIcon.jsx';
import { getWeatherInfo } from '../../utils/weatherCodes.js';

describe('WeatherIcon', () => {
  it('draws a hidden illustration for every weather type', () => {
    const icons = new Set(
      [0, 1, 3, 45, 51, 56, 61, 71, 95].map((code) => getWeatherInfo(code).icon),
    );
    icons.forEach((name) => {
      const { container, unmount } = render(<WeatherIcon name={name} className="size-9" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).toHaveClass('size-9');
      expect(svg.querySelector('circle, path')).not.toBeNull();
      unmount();
    });
  });

  it('shows the colours of the weather: sun, rain and snow', () => {
    const { container: clear } = render(<WeatherIcon name="clear" />);
    expect(clear.querySelector('.fill-weather-sun')).not.toBeNull();
    const { container: rain } = render(<WeatherIcon name="rain" />);
    expect(rain.querySelector('.stroke-weather-rain')).not.toBeNull();
    const { container: snow } = render(<WeatherIcon name="snow" />);
    expect(snow.querySelector('.fill-weather-snow')).not.toBeNull();
  });

  it('falls back to a thermometer for unknown weather', () => {
    const { container } = render(<WeatherIcon name="unknown" />);
    expect(container.querySelector('svg')).toHaveClass('text-fg-muted');
  });
});
