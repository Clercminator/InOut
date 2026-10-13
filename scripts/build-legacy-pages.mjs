import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../artifacts/legacy-pages/', import.meta.url));
mkdirSync(out, { recursive: true });
const origin = 'https://inout.imrtech.xyz';
const routes = { index: '/', privacy: '/privacy', terms: '/terms', support: '/support', help: '/support', safety: '/safety', security: '/privacy', 'delete-account': '/delete-account', 'delete-data': '/delete-data', 'privacy-data': '/delete-data', 'data-deletion': '/delete-data', 'account-deletion': '/delete-account', reset: '/reset.html', '404': '/support' };
writeFileSync(out + '.nojekyll', '');
writeFileSync(out + 'redirect.js', `const routes=${JSON.stringify(routes)};const slug=location.pathname.replace(/^\\/InOut(?:\\/|$)/,'/').replace(/\\/$/,'').split('/').pop().replace(/\\.html$/,'')||'index';const route=routes[slug]||'/support';location.replace(${JSON.stringify(origin)}+route+(route==='/reset.html'?location.search+location.hash:''));\n`);
for (const [slug, route] of Object.entries(routes)) {
  const url = origin + route;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><link rel="canonical" href="${url}"><title>In/Out has moved</title></head><body><h1>In/Out has moved</h1><p><a href="${url}">Continue to the official In/Out website</a></p><script src="/InOut/redirect.js"></script></body></html>\n`;
  writeFileSync(out + slug + '.html', html);
  if (!['index', '404'].includes(slug)) { mkdirSync(out + slug, { recursive: true }); writeFileSync(out + slug + '/index.html', html); }
}
console.log('Built legacy GitHub Pages redirects to the official In/Out domain.');
