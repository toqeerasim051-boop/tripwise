/**
 * Builds src/data/attractions.json and downloads photos into public/images/attractions/ from the
 * curated list in scripts/attractions-source.mjs, using the public Wikipedia API (no key).
 * Run with: npm run data:attractions
 *
 * For each curated title it stores the name, place, a short description (Wikipedia intro),
 * coordinates, the Wikipedia URL and, when the article's lead image is a freely licensed photo,
 * a local copy with its author and licence for attribution. Photos are self-hosted so the app
 * never depends on Wikimedia being reachable at runtime. Titles that can't be resolved are
 * reported and left out; nothing is guessed.
 *
 * Network responses and downloads are cached, so re-running after a network failure only fetches
 * what is missing. Delete node_modules/.cache/tripwise-attractions to refresh descriptions.
 */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  ATTRACTIONS,
  FEATURED_FIRST,
  HERO_CANDIDATES,
  HERO_SLIDES,
  SLIDE_COUNT,
} from './attractions-source.mjs';

const ROOT = new URL('..', import.meta.url);
const OUT = new URL('src/data/attractions.json', ROOT);
const DESTINATIONS_OUT = new URL('src/data/destinations.json', ROOT);
const PUBLIC_DIR = new URL('public/', ROOT);
const IMAGE_BASE = 'images/attractions';
const CACHE_DIR = new URL('node_modules/.cache/tripwise-attractions/', ROOT);
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT = 'TripWise-data-script/1.0 (travel planner demo; attractions dataset)';
const CARD_WIDTH = 500;
const COVER_WIDTH = 960;
const HERO_WIDTH = 1920;
const NOT_A_PHOTO =
  /(^|[_\s-])(map|flag|logo|coat[_\s]of[_\s]arms|seal|locator|diagram|plan)([_\s.-]|$)/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const execFileAsync = promisify(execFile);
mkdirSync(CACHE_DIR, { recursive: true });

/** Runs curl (it waits longer to connect than Node's fetch, which helps on slow networks). */
async function curl(args) {
  return execFileAsync(
    'curl',
    ['-sS', '--fail', '-L', '--connect-timeout', '40', '-m', '120', '-A', USER_AGENT, ...args],
    { maxBuffer: 50 * 1024 * 1024, encoding: 'buffer' },
  );
}

async function withRetries(label, task) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      const reason = String(error.stderr ?? error.message)
        .trim()
        .split('\n')[0]
        .slice(0, 120);
      if (attempt === 6) throw new Error(`${label}: ${reason}`, { cause: error });
      console.warn(`  retry ${attempt} (${label}): ${reason}`);
      await sleep(3000 * attempt);
    }
  }
}

async function api(params) {
  const url = new URL(WIKI_API);
  Object.entries({ format: 'json', formatversion: '2', ...params }).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  const cacheFile = new URL(`${createHash('sha1').update(url.href).digest('hex')}.json`, CACHE_DIR);
  if (existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8'));

  const data = await withRetries('Wikipedia API', async () => {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch {
      return JSON.parse((await curl([url.href])).stdout.toString('utf8'));
    }
  });
  writeFileSync(cacheFile, JSON.stringify(data));
  return data;
}

async function download(remoteUrl, publicPath) {
  const target = new URL(publicPath, PUBLIC_DIR);
  if (existsSync(target)) return true;
  mkdirSync(new URL('.', target), { recursive: true });
  try {
    // Write to a temporary file first so an interrupted download never looks complete.
    const partial = `${fileURLToPath(target)}.part`;
    await withRetries(`download ${publicPath}`, () => curl(['-o', partial, remoteUrl]));
    renameSync(partial, target);
    return true;
  } catch (error) {
    console.warn(`  ${error.message}`);
    return false;
  }
}

function chunks(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

/** Follows `normalized` and `redirects` so each requested title maps to its page. */
function resolveTitles(query, requested) {
  const pagesByTitle = new Map(query.pages.map((page) => [page.title, page]));
  const step = (list, title) => list?.find((entry) => entry.from === title)?.to ?? title;
  return new Map(
    requested.map((title) => [
      title,
      pagesByTitle.get(step(query.redirects, step(query.normalized, title))),
    ]),
  );
}

// A parenthetical is dropped when it holds pronunciation (IPA), non-Latin script or language labels.
const NOT_ENGLISH_ASIDE =
  /[;:[\]/]|listen|pronounced|lit\.|^\s*$|[\u0250-\u02AF\u02C8]|[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/iu;

/** Removes top-level "( … )" groups (nested brackets included) that match NOT_ENGLISH_ASIDE. */
function dropAsides(text) {
  let output = '';
  let depth = 0;
  let group = '';
  for (const char of text) {
    if (char === '(') {
      depth += 1;
      if (depth === 1) {
        group = '';
        continue;
      }
    } else if (char === ')' && depth > 0) {
      depth -= 1;
      if (depth === 0) {
        if (!NOT_ENGLISH_ASIDE.test(group)) output += `(${group})`;
        else output = output.replace(/\s+$/, '');
        continue;
      }
    }
    if (depth > 0) group += char;
    else output += char;
  }
  return depth > 0 ? `${output}(${group}` : output; // unbalanced: keep the rest as-is
}

/** Wikipedia intros start with pronunciations and native names in parentheses; drop those. */
function cleanDescription(text) {
  let result = dropAsides(text ?? '');
  result = result
    .replace(/\s*\[[^\]]*\]/g, '') // [IPA pronunciations]
    .replace(/^([^,]{1,60}), (is|are|was|were) /, '$1 $2 ') // "Name, is" left after removals
    .replace(/\s+([,.;])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (result.length > 320) {
    const cut = result.slice(0, 320);
    const end = cut.lastIndexOf('. ');
    result = end > 80 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, '')}…`;
  }
  return result;
}

function stripHtml(html) {
  return (html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchArticles(titles) {
  const articles = new Map();
  for (const batch of chunks(titles, 20)) {
    const data = await api({
      action: 'query',
      redirects: '1',
      prop: 'extracts|pageimages|coordinates|info',
      exintro: '1',
      explaintext: '1',
      exsentences: '2',
      exlimit: '20',
      piprop: 'name',
      pilicense: 'free',
      pilimit: '20',
      colimit: '20',
      inprop: 'url',
      titles: batch.join('|'),
    });
    resolveTitles(data.query, batch).forEach((page, title) => articles.set(title, page));
  }
  return articles;
}

/** File name -> { url (thumbnail at `width`), originalWidth/Height, credit } via imageinfo. */
async function fetchImageInfo(fileNames, width) {
  const images = new Map();
  for (const batch of chunks(fileNames, 20)) {
    const titles = batch.map((name) => `File:${name}`);
    const data = await api({
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: String(width),
      iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl',
      titles: titles.join('|'),
    });
    resolveTitles(data.query, titles).forEach((page, title) => {
      const info = page?.imageinfo?.[0];
      if (!info) return;
      const meta = info.extmetadata ?? {};
      images.set(title.slice('File:'.length), {
        url: (info.thumburl ?? info.url).split('?')[0],
        originalWidth: info.width,
        originalHeight: info.height,
        credit: {
          artist: stripHtml(meta.Artist?.value) || 'Unknown author',
          license: meta.LicenseShortName?.value ?? 'See file page',
          licenseUrl: meta.LicenseUrl?.value ?? null,
          filePage: info.descriptionurl,
        },
      });
    });
  }
  return images;
}

const isPhoto = (file) => /\.(jpe?g|webp)$/i.test(file) && !NOT_A_PHOTO.test(file);

const notes = [];
const allTitles = [
  ...new Set([
    ...Object.values(ATTRACTIONS)
      .flat()
      .map(([title]) => title),
    ...HERO_CANDIDATES,
  ]),
];
console.log(`Fetching ${allTitles.length} Wikipedia articles…`);
const articles = await fetchArticles(allTitles);

const photoFiles = [...new Set([...articles.values()].map((page) => page?.pageimage))].filter(
  (file) => file && isPhoto(file),
);
console.log(`Fetching details for ${photoFiles.length} photos…`);
const cardInfo = await fetchImageInfo(photoFiles, CARD_WIDTH);
const coverInfo = await fetchImageInfo(photoFiles, COVER_WIDTH);

/** Runs async `jobs` with at most `limit` at a time. */
async function runPool(jobs, limit) {
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next];
      next += 1;
      await job();
      done += 1;
      process.stdout.write(`\r  photos downloaded: ${done}/${jobs.length}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  console.log();
}

// 1. Build entries and collect photo downloads (the first photo of each country is its cover).
const countries = {};
const downloadJobs = [];
for (const [code, list] of Object.entries(ATTRACTIONS)) {
  countries[code] = [];
  const dir = `${IMAGE_BASE}/${code.toLowerCase()}`;
  let hasCover = false;
  for (const [title, place, overrides = {}] of list) {
    const page = articles.get(title);
    if (!page || page.missing || page.invalid) {
      notes.push(`${code}: "${title}" not found on Wikipedia — remove or fix the title`);
      continue;
    }
    const id = slugify(page.title);
    const coordinates = page.coordinates?.[0];
    const entry = {
      id,
      name: page.title.replace(/\s*\((?:statue|geothermal spa|Venice|Bath|Victoria)\)$/, ''),
      place,
      description: overrides.description ?? cleanDescription(page.extract),
      lat: coordinates ? Number(coordinates.lat.toFixed(5)) : null,
      lon: coordinates ? Number(coordinates.lon.toFixed(5)) : null,
      wikipediaUrl: page.fullurl,
      image: null,
    };
    countries[code].push(entry);
    if (!coordinates) notes.push(`${code}: "${title}" has no coordinates`);

    const file = page.pageimage;
    if (!file) notes.push(`${code}: "${title}" has no free lead image`);
    else if (!isPhoto(file)) notes.push(`${code}: "${title}" lead image is not a photo (${file})`);
    else if (!cardInfo.get(file)) notes.push(`${code}: "${title}" image details unavailable`);
    else {
      const card = cardInfo.get(file);
      const isCover = !hasCover;
      hasCover = true;
      const cardPath = `${dir}/${id}-${CARD_WIDTH}.jpg`;
      const coverPath = `${dir}/${id}-${COVER_WIDTH}.jpg`;
      downloadJobs.push(async () => {
        const okCard = await download(card.url, cardPath);
        const okCover = isCover && (await download(coverInfo.get(file).url, coverPath));
        if (!okCard) {
          notes.push(`${code}: "${title}" photo download failed — run the script again`);
          return;
        }
        entry.image = {
          src: `/${cardPath}`,
          ...(okCover && { large: `/${coverPath}` }),
          width: card.originalWidth,
          height: card.originalHeight,
          credit: card.credit,
        };
      });
    }
  }
}

// 2. Download photos in parallel (already-downloaded files are skipped).
await runPool(downloadJobs, 6);

// Hero: the first candidate whose lead photo is wide (landscape).
let hero = null;
for (const title of HERO_CANDIDATES) {
  const file = articles.get(title)?.pageimage;
  const info = file && isPhoto(file) && cardInfo.get(file);
  if (!info || info.originalWidth < info.originalHeight * 1.3) continue;
  const big = (await fetchImageInfo([file], HERO_WIDTH)).get(file);
  const path = `${IMAGE_BASE}/hero-${slugify(title)}.jpg`;
  if (big && (await download(big.url, path))) {
    hero = { name: articles.get(title).title, src: `/${path}`, credit: big.credit };
    break;
  }
}
if (!hero) notes.push('No landscape hero photo found among HERO_CANDIDATES');

// Slideshow: full-screen (1920px) versions of famous attractions' landscape lead photos.
const slides = [];
for (const title of HERO_SLIDES) {
  if (slides.length >= SLIDE_COUNT) break;
  const country = Object.keys(ATTRACTIONS).find((code) =>
    ATTRACTIONS[code].some(([attraction]) => attraction === title),
  );
  const file = articles.get(title)?.pageimage;
  const info = file && isPhoto(file) && cardInfo.get(file);
  if (!country || !info || info.originalWidth < info.originalHeight * 1.2) {
    notes.push(`Slide skipped (not in ATTRACTIONS or no landscape photo): ${title}`);
    continue;
  }
  const big = (await fetchImageInfo([file], HERO_WIDTH)).get(file);
  const path = `${IMAGE_BASE}/hero-${slugify(title)}.jpg`;
  if (big && (await download(big.url, path))) {
    slides.push({ name: articles.get(title).title, country, src: `/${path}`, credit: big.credit });
  } else {
    notes.push(`Slide skipped (download failed): ${title}`);
  }
}

const SOURCE =
  'Descriptions: Wikipedia (CC BY-SA 4.0). Photos: Wikimedia Commons, credited per photo.';
writeFileSync(OUT, `${JSON.stringify({ source: SOURCE, countries }, null, 2)}\n`);

// Small file loaded with the app: hero, one cover photo per country, featured order.
const covers = {};
for (const [code, list] of Object.entries(countries)) {
  const cover = list.find((item) => item.image?.large);
  if (cover) covers[code] = { name: cover.name, ...cover.image };
}
const featured = [
  ...FEATURED_FIRST,
  ...Object.keys(countries).filter((code) => !FEATURED_FIRST.includes(code)),
].filter((code) => countries[code]?.length);
writeFileSync(
  DESTINATIONS_OUT,
  `${JSON.stringify({ source: SOURCE, hero, slides, featured, covers }, null, 2)}\n`,
);

const all = Object.values(countries).flat();
console.log(
  `Wrote ${all.length} attractions in ${Object.keys(countries).length} countries (${all.filter((item) => item.image).length} with photos).`,
);
console.log(hero ? `Hero: ${hero.name}` : 'Hero: none');
console.log(`Slides: ${slides.map((slide) => slide.name).join(', ') || 'none'}`);
if (notes.length) console.log(`\n${notes.length} notes:\n- ${notes.join('\n- ')}`);
