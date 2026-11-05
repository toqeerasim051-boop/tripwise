/**
 * Creates a WebP copy next to every JPEG in public/images (usually 30–50% smaller), plus smaller
 * widths of the full-screen hero photo for phones. Photo.jsx serves the WebP and keeps the JPEG
 * as the fallback. Run after `npm run data:attractions`:
 *   npm run images:webp
 * Existing, up-to-date WebP files are skipped.
 */
import { readdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../public/images/', import.meta.url));
const QUALITY = 72;
const HERO_WIDTHS = [960, 1280]; // the original (1920) is converted too

async function* jpegs(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* jpegs(path);
    else if (/\.jpe?g$/i.test(entry.name)) yield path;
  }
}

async function isFresh(source, target) {
  try {
    return (await stat(target)).mtimeMs >= (await stat(source)).mtimeMs;
  } catch {
    return false;
  }
}

let created = 0;
let before = 0;
let after = 0;
for await (const jpeg of jpegs(ROOT)) {
  const base = jpeg.replace(/\.jpe?g$/i, '');
  const targets = [{ path: `${base}.webp` }];
  if (basename(base).startsWith('hero-')) {
    targets.push(...HERO_WIDTHS.map((width) => ({ path: `${base}-${width}.webp`, width })));
  }
  for (const { path, width } of targets) {
    if (await isFresh(jpeg, path)) continue;
    const image = sharp(jpeg);
    if (width) image.resize({ width, withoutEnlargement: true });
    await image.webp({ quality: QUALITY, effort: 5 }).toFile(path);
    created += 1;
    if (!width) {
      before += (await stat(jpeg)).size;
      after += (await stat(path)).size;
    }
  }
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);
const saving = before > 0 ? ` (${mb(before)} MB of JPEG -> ${mb(after)} MB of WebP)` : '';
console.log(
  created === 0 ? 'All WebP files are up to date.' : `Created ${created} WebP files${saving}.`,
);
