// @vitest-environment node
import { attractionToActivityValues, dayHasAttraction, photoCreditText } from './attractions.js';
import { validateActivity } from './validators.js';
import { eiffelTower, louvre } from '../test/fixtures.js';

describe('attractionToActivityValues', () => {
  it('builds valid sightseeing activity values without a link', () => {
    const values = attractionToActivityValues(eiffelTower);
    expect(values).toEqual({
      title: 'Eiffel Tower',
      category: 'sightseeing',
      time: '',
      location: 'Paris',
      url: '',
      notes: '',
    });
    expect(validateActivity(values)).toEqual({});
  });

  it('clips long names so the activity stays valid', () => {
    const values = attractionToActivityValues({ ...louvre, name: 'x'.repeat(150), place: null });
    expect(values.title).toHaveLength(100);
    expect(values.location).toBe('');
    expect(validateActivity(values)).toEqual({});
  });
});

describe('dayHasAttraction', () => {
  const day = (titles) => ({ activities: titles.map((title, i) => ({ id: String(i), title })) });

  it('matches activity titles ignoring case and spaces around them', () => {
    expect(dayHasAttraction(day([' eiffel tower ']), eiffelTower)).toBe(true);
    expect(dayHasAttraction(day(['Louvre']), eiffelTower)).toBe(false);
    expect(dayHasAttraction(day([]), eiffelTower)).toBe(false);
  });
});

describe('photoCreditText', () => {
  it('names the author and licence', () => {
    expect(photoCreditText(eiffelTower.image.credit)).toBe('Photo: A. Photographer, CC BY-SA 4.0');
    expect(photoCreditText(null)).toBe('');
  });
});
