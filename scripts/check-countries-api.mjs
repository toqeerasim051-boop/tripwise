/**
 * Verifies the REST Countries v5 response shape against src/services/restCountries.js.
 * Usage: npm run check:api   (reads VITE_RESTCOUNTRIES_API_KEY from .env; never prints the key)
 */
const key = process.env.VITE_RESTCOUNTRIES_API_KEY;
if (!key) {
  console.error(
    'VITE_RESTCOUNTRIES_API_KEY is missing. Copy .env.example to .env and add your key.',
  );
  process.exit(1);
}

const { normalizeCountryDetail } = await import('../src/services/restCountries.js').catch(
  () => ({}),
);

const url =
  'https://api.restcountries.com/countries/v5/codes.alpha_3/FRA?response_fields=' +
  'names.common,names.official,codes.alpha_3,flag.url_svg,flag.url_png,flag.description,' +
  'region,subregion,population,capitals,coordinates.lat,coordinates.lng,currencies,' +
  'languages,borders,timezones,area.kilometers';

const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
const body = await response.json().catch(() => null);
console.log(`HTTP ${response.status}`);

const raw = body?.data?.objects?.[0];
if (!raw) {
  console.error('No country in response:', JSON.stringify(body, null, 2));
  process.exit(1);
}

const sample = (value) => JSON.stringify(Array.isArray(value) ? value.slice(0, 2) : value, null, 2);
console.log('top-level keys:', Object.keys(raw).join(', '));
console.log('capitals:', sample(raw.capitals));
console.log('currencies:', sample(raw.currencies));
console.log('languages:', sample(raw.languages));
console.log('meta:', JSON.stringify(body.data.meta));

if (normalizeCountryDetail) {
  const country = normalizeCountryDetail(raw);
  console.log('\nnormalised:', JSON.stringify(country, null, 2));
  const missing = ['capital', 'lat', 'lon', 'population', 'flagUrl'].filter(
    (k) => country?.[k] == null,
  );
  const empty = ['currencies', 'languages', 'timezones', 'borders'].filter(
    (k) => !country?.[k]?.length,
  );
  if (missing.length || empty.length) {
    console.error(
      `\nNormaliser gaps — missing: ${missing.join(', ') || 'none'}; empty: ${empty.join(', ') || 'none'}`,
    );
    process.exit(1);
  }
  console.log('\nOK: normaliser reads every field.');
}
