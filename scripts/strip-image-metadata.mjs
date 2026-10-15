import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const folder = fileURLToPath(new URL('../src/assets/screenshots/', import.meta.url));
const supported = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
let cleaned = 0;

for (const entry of readdirSync(folder, { withFileTypes: true })) {
  if (!entry.isFile() || !supported.has(extname(entry.name).toLowerCase())) continue;
  const path = join(folder, entry.name);
  const input = sharp(readFileSync(path));
  const meta = await input.metadata();
  const hasMetadata = Boolean(meta.exif || meta.icc || meta.xmp || meta.iptc || (meta.orientation && meta.orientation !== 1));
  if (!hasMetadata) continue;
  writeFileSync(path, await input.rotate().toBuffer());
  cleaned += 1;
  console.log(`[images] removed metadata from ${entry.name}`);
}

if (cleaned === 0) console.log('[images] no metadata found in src/assets/screenshots/');
