/**
 * Snapshot of the curated destinations' country details (the shape getCountry returns), plus the
 * name and flag of each of their neighbours. Explore lists them, and their country pages open,
 * without calling REST Countries. Run after `npm run data:attractions`:
 *   npm run data:countries
 * Reads VITE_RESTCOUNTRIES_API_KEY from .env and writes src/data/curated-countries.json.
 */
import { readFile, writeFile } from 'node:fs/promises';
import {
  BASE_URL,
  DETAIL_FIELDS,
  normalizeCountryDetail,
  normalizeCountrySummary,
} from '../src/services/restCountries.js';

const PAGE_LIMIT = 100;
const key = process.env.VITE_RESTCOUNTRIES_API_KEY;
if (!key) throw new Error('VITE_RESTCOUNTRIES_API_KEY is not set (see .env.example)');

const destinations = JSON.parse(
  await readFile(new URL('../src/data/destinations.json', import.meta.url), 'utf8'),
);
const wanted = new Set(Object.keys(destinations.covers));

async function getPage(offset) {
  const url = new URL(BASE_URL);
  url.search = new URLSearchParams({
    response_fields: DETAIL_FIELDS.join(','),
    limit: String(PAGE_LIMIT),
    offset: String(offset),
  });
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(30_000),
      });
      const body = await response.json();
      if (!response.ok || body.errors) throw new Error(`HTTP ${response.status}`);
      return body.data;
    } catch (error) {
      if (attempt >= 3) throw error;
      console.warn(`Page at offset ${offset} failed (${error.message}), retrying…`);
    }
  }
}

const found = new Map();
const everyone = new Map(); // all countries' summaries, to look up neighbours
for (let offset = 0; ;) {
  const { objects, meta } = await getPage(offset);
  for (const raw of objects) {
    const summary = normalizeCountrySummary(raw);
    if (summary) everyone.set(summary.code, summary);
    const country = normalizeCountryDetail(raw);
    if (country && wanted.has(country.code)) found.set(country.code, country);
  }
  offset += objects.length;
  if (!(meta?.more ?? offset < meta?.total) || objects.length === 0) break;
}

const missing = [...wanted].filter((code) => !found.has(code));
if (missing.length > 0) console.warn(`Not found in REST Countries: ${missing.join(', ')}`);

const countries = [...found.values()].sort((a, b) => a.name.localeCompare(b.name));

// Neighbours that aren't curated themselves: only what NeighbourList shows.
const neighbourCodes = new Set(countries.flatMap((country) => country.borders));
const neighbours = [...neighbourCodes]
  .filter((code) => !found.has(code) && everyone.has(code))
  .map((code) => {
    const { name, flagUrl, flagAlt } = everyone.get(code);
    return { code, name, flagUrl, flagAlt };
  })
  .sort((a, b) => a.code.localeCompare(b.code));
const unknown = [...neighbourCodes].filter((code) => !found.has(code) && !everyone.has(code));
if (unknown.length > 0) console.warn(`Unknown neighbour codes: ${unknown.join(', ')}`);

await writeFile(
  new URL('../src/data/curated-countries.json', import.meta.url),
  `${JSON.stringify({ source: 'REST Countries v5', countries, neighbours }, null, 2)}\n`,
);
console.log(`Saved ${countries.length} curated countries and ${neighbours.length} neighbours.`);
