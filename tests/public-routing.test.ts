import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import '../scripts/build-legacy-pages.mjs';

test('all public app URLs stay on the canonical InOut domain', () => {
  const info = JSON.parse(readFileSync('release/public-info.json','utf8'));
  const expected = {privacyUrl:'/privacy',termsUrl:'/terms',supportUrl:'/support',safetyUrl:'/safety',deleteAccountUrl:'/delete-account',deleteDataUrl:'/delete-data'};
  for (const [key,path] of Object.entries(expected)) assert.equal(info[key], 'https://inout.imrtech.xyz'+path);
  const config=JSON.parse(readFileSync('vercel.json','utf8'));
  for (const [source,destination] of Object.entries({'/security':'/privacy','/help':'/support','/privacy-data':'/delete-data','/data-deletion':'/delete-data'})) assert.ok(config.redirects.some(r=>r.source===source&&r.destination===destination&&r.permanent));
});
test('legacy Pages redirects preserve shared exercises and never redirect to user-supplied hosts', () => {
  const code=readFileSync('artifacts/legacy-pages/redirect.js','utf8');
  for (const [pathname,search,hash,expected] of [
    ['/InOut/privacy.html','?next=https://attacker.test','#secret','/privacy'],
    ['/InOut/support/','','','/support'],
    ['/InOut/delete-data.html','','','/delete-data'],
    ['/InOut/security.html','','','/privacy'],
    ['/InOut/reset.html','?s=fixture&lang=es','#cadence','/reset.html?s=fixture&lang=es#cadence'],
    ['/InOut/','','','/'],
    ['/InOut/unknown','','','/support'],
  ]) {
    let redirected=''; runInNewContext(code,{location:{pathname,search,hash,replace:value=>{redirected=value;}}});
    assert.equal(redirected,'https://inout.imrtech.xyz'+expected);
  }
});
