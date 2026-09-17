import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const info = JSON.parse(readFileSync(root + 'release/public-info.json', 'utf8'));
const listing = JSON.parse(readFileSync(root + 'release/store-listing.json', 'utf8'));
const readiness = JSON.parse(readFileSync(root + 'release/readiness.json', 'utf8'));
const errors = [];
if (process.env.INOUT_RELEASE === '1') {
  for (const key of ['EXPO_PUBLIC_REVENUECAT_IOS_KEY', 'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY', 'ADMOB_IOS_APP_ID', 'ADMOB_ANDROID_APP_ID', 'EXPO_PUBLIC_ADMOB_IOS_BANNER_ID', 'EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID']) {
    if (!process.env[key] || process.env[key].includes('3940256099942544')) errors.push(`Production configuration is missing or uses demo values: ${key}`);
  }
  if (process.env.EXPO_PUBLIC_ADS_MODE !== 'live') errors.push('Production ads must be explicitly configured after acceptance.');
  if (listing.status !== 'approved-commercial-v1') errors.push('Commercial store metadata is still a draft. Do not submit the former free-only release.');
  for (const gate of ['billingVerified', 'adsAndConsentVerified', 'sharingVerified', 'analyticsDecisionVerified', 'nativeDeviceAcceptance', 'metadataAndLegalApproved']) {
    if (readiness.gates?.[gate] !== true) errors.push(`Commercial launch gate is open: ${gate}`);
  }
}
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
for (const [file,width,height,colorType] of [
  ['apps/mobile/assets/icon.png',1024,1024,2],
  ['release/assets/google-play-icon.png',512,512,6],
  ['release/assets/google-play-feature.png',1024,500,2],
]) {
  try {
    const png = readFileSync(root + file);
    if (png.length < 33 || png.subarray(0,8).toString('hex') !== '89504e470d0a1a0a' ||
      png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== height || png[24] !== 8 || png[25] !== colorType)
      errors.push(`${file} has the wrong PNG dimensions or color format.`);
  } catch { errors.push(`Missing or unreadable ${file}`); }
}
if (errors.length) { console.error('Release preparation is incomplete:\n' + errors.map((e) => '- ' + e).join('\n')); process.exit(1); }
console.log('Local release metadata checks passed. Commercial v1 remains a draft; production builds require every release/readiness.json gate and approved metadata.');
