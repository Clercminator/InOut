import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
const links = JSON.parse(readFileSync(new URL('../release/links.json', import.meta.url)));
export function associations(c) {
  const url = new URL(c.origin);
  if (url.protocol !== 'https:' || url.origin !== c.origin || !/^\/[\w/.-]+$/.test(c.path) || !/^[A-Z0-9]{10}$/.test(c.appleTeamId)
    || !c.androidSha256.length || !c.androidSha256.every(s => /^([A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(s))) throw Error('Supply the real HTTPS origin, path, Team ID and Play app-signing SHA-256.');
  return { apple: { applinks: { details: [{ appIDs: [`${c.appleTeamId}.com.imrtech.inout`], components: [{ '/': c.path }] }] } },
    android: [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: 'com.imrtech.inout', sha256_cert_fingerprints: c.androidSha256 } }] };
}
if (process.argv[1]?.endsWith('build-link-associations.mjs')) {
  if (!links.origin || !links.appleTeamId || !links.androidSha256.length) {
    const dir = new URL('../apps/web/public/.well-known/', import.meta.url);
    mkdirSync(dir, { recursive: true });
    // Empty declarations do not falsely authorize an unknown signing identity.
    writeFileSync(new URL('apple-app-site-association', dir), JSON.stringify({ applinks: { details: [] } }));
    writeFileSync(new URL('assetlinks.json', dir), '[]');
    console.log('Association endpoints generated without claims: real Team ID/signing SHA-256 still required.');
  }
  else {
    const result = associations(links), dir = new URL('../apps/web/public/.well-known/', import.meta.url);
    mkdirSync(dir, { recursive: true });
    writeFileSync(new URL('apple-app-site-association', dir), JSON.stringify(result.apple));
    writeFileSync(new URL('assetlinks.json', dir), JSON.stringify(result.android));
  }
}
