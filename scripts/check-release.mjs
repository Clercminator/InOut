import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const info = JSON.parse(readFileSync(root + 'release/public-info.json', 'utf8'));
const listing = JSON.parse(readFileSync(root + 'release/store-listing.json', 'utf8'));
const errors = [];
if (!info.publisherName.trim()) errors.push('Publisher name is missing.');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.supportEmail)) errors.push('A verified public support email is required.');
for (const key of ['privacyUrl','supportUrl']) {
  try { if (new URL(info[key]).protocol !== 'https:') throw new Error(); }
  catch { errors.push(`${key} must point to a published HTTPS page.`); }
}
for (const [key,max] of [['name',30],['subtitle',30],['shortDescription',80],['description',4000],['keywords',100]]) {
  if (!listing[key] || listing[key].length > max) errors.push(`${key} must contain 1–${max} characters.`);
}
for (const file of ['icon.png','adaptive-icon.png','monochrome-icon.png']) if (!existsSync(root + 'apps/mobile/assets/' + file)) errors.push(`Missing ${file}`);
if (errors.length) { console.error('Release preparation is incomplete:\n' + errors.map((e) => '- ' + e).join('\n')); process.exit(1); }
console.log('Local release metadata checks passed. Store credentials, live URLs and device acceptance still require verification.');
