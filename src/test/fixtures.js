/** Normalised country/forecast objects (the shapes services return), for component tests. */

function country(overrides) {
  return {
    officialName: overrides.name,
    flagUrl: `https://flags.example/${overrides.code.toLowerCase()}.svg`,
    flagAlt: `Flag of ${overrides.name}`,
    subregion: null,
    areaKm2: null,
    coordsSource: 'capital',
    currencies: [],
    ...overrides,
  };
}

export const france = country({
  code: 'FRA',
  name: 'France',
  officialName: 'French Republic',
  flagAlt: 'Three vertical bands of blue, white and red',
  region: 'Europe',
  subregion: 'Western Europe',
  population: 68_000_000,
  capital: 'Paris',
  lat: 48.87,
  lon: 2.33,
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
});
export const germany = country({
  code: 'DEU',
  name: 'Germany',
  region: 'Europe',
  population: 83_000_000,
  capital: 'Berlin',
  lat: 52.52,
  lon: 13.4,
});
export const belgium = country({
  code: 'BEL',
  name: 'Belgium',
  region: 'Europe',
  population: 11_700_000,
  capital: 'Brussels',
  lat: 50.85,
  lon: 4.35,
});
export const japan = country({
  code: 'JPN',
  name: 'Japan',
  region: 'Asia',
  population: 125_000_000,
  capital: 'Tokyo',
  lat: 35.68,
  lon: 139.69,
});
export const coteDivoire = country({
  code: 'CIV',
  name: "Côte d'Ivoire",
  region: 'Africa',
  population: 28_000_000,
  capital: 'Yamoussoukro',
  lat: 6.82,
  lon: -5.28,
});
export const tuvalu = country({
  code: 'TUV',
  name: 'Tuvalu',
  region: 'Oceania',
  population: 11_000,
  capital: 'Funafuti',
  lat: -8.52,
  lon: 179.2,
});

export const allCountries = [belgium, coteDivoire, france, germany, japan, tuvalu];

export const franceDetail = {
  ...france,
  languages: ['French'],
  timezones: ['UTC+01:00'],
  borders: ['BEL', 'DEU'],
  areaKm2: 551_695,
};

export const forecast = {
  timezone: 'Europe/Paris',
  units: { temperature: '°C', windSpeed: 'km/h' },
  // 21°C now is deliberately distinct from every daily high/low below.
  current: { time: '2026-10-27T13:15', temperature: 21.4, weatherCode: 3, windSpeed: 10.8 },
  daily: Array.from({ length: 16 }, (_, index) => ({
    date: `2026-11-${String(index + 1).padStart(2, '0')}`,
    max: 18 - index * 0.5,
    min: 10 - index * 0.5,
    weatherCode: index === 0 ? 61 : 0,
    precipitationProbability: index === 0 ? 80 : null,
  })),
};

/** A stored-shape trip with predictable ids. Override any field. */
export function makeTrip(overrides = {}) {
  const base = {
    id: 'trip-1',
    title: 'Paris getaway',
    countryCode: 'FRA',
    destinationName: 'France',
    lat: 48.87,
    lon: 2.33,
    flagUrl: 'https://flags.example/fra.svg',
    startDate: '2026-05-01',
    endDate: '2026-05-03',
    currency: 'EUR',
    budget: { totalCents: 0 },
    expenses: [],
    savedLinks: [],
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
  base.days ??= ['2026-05-01', '2026-05-02', '2026-05-03'].map((date, index) => ({
    id: `${base.id}-day-${index + 1}`,
    date,
    notes: '',
    activities: [],
  }));
  return base;
}

export function storeTrips(trips) {
  localStorage.setItem('tripwise:v1:trips', JSON.stringify({ version: 1, data: trips }));
}

export function readStoredTrips() {
  return JSON.parse(localStorage.getItem('tripwise:v1:trips'))?.data;
}

// ---------- curated attractions (services/attractions.js is mocked with these in setup.js) ----------

const credit = {
  artist: 'A. Photographer',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  filePage: 'https://commons.wikimedia.org/wiki/File:Example.jpg',
};

export const eiffelTower = {
  id: 'eiffel-tower',
  name: 'Eiffel Tower',
  place: 'Paris',
  description: 'The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris.',
  lat: 48.85822,
  lon: 2.2945,
  wikipediaUrl: 'https://en.wikipedia.org/wiki/Eiffel_Tower',
  image: {
    src: '/images/attractions/fra/eiffel-tower-500.jpg',
    large: '/images/attractions/fra/eiffel-tower-960.jpg',
    width: 1000,
    height: 1500,
    credit,
  },
};

export const louvre = {
  id: 'louvre',
  name: 'Louvre',
  place: 'Paris',
  description: "The Louvre is a national art museum in Paris and the world's most-visited museum.",
  lat: 48.86111,
  lon: 2.33639,
  wikipediaUrl: 'https://en.wikipedia.org/wiki/Louvre',
  image: null,
};

export const destinations = {
  hero: { name: 'Moraine Lake', src: '/images/attractions/hero-moraine-lake.jpg', credit },
  slides: [
    {
      name: 'Mount Fuji',
      country: 'JPN',
      src: '/images/attractions/hero-mount-fuji.jpg',
      credit,
    },
  ],
  featured: ['JPN', 'FRA'],
  covers: {
    FRA: { name: 'Eiffel Tower', ...eiffelTower.image },
    JPN: {
      name: 'Mount Fuji',
      src: '/images/attractions/jpn/mount-fuji-500.jpg',
      large: '/images/attractions/jpn/mount-fuji-960.jpg',
      credit,
    },
  },
};

export const attractionsByCountry = { FRA: [eiffelTower, louvre] };
