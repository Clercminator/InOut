import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const content = JSON.parse(readFileSync(root + 'release/content.json', 'utf8'));
const info = JSON.parse(readFileSync(root + 'release/public-info.json', 'utf8'));
const escape = (s) => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
mkdirSync(root + 'apps/web/public', { recursive: true });
for (const page of ['privacy', 'safety', 'support']) {
  const contact = info.supportEmail ? `<p>Contact: <a href="mailto:${escape(info.supportEmail)}">${escape(info.supportEmail)}</a></p>` : '<p>Draft: publisher contact details must be completed before publication.</p>';
  const body = content[page].map((section) => `<section><h2>${escape(section.title)}</h2><p>${escape(section.body)}</p></section>`).join('\n');
  writeFileSync(root + `apps/web/public/${page}.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="IN/OUT ${page}"><title>IN/OUT — ${page}</title><style>body{margin:0;background:#111317;color:#fff;font:17px/1.65 system-ui,sans-serif}main{max-width:760px;margin:auto;padding:40px 24px}a{color:#adc6ff}h1{font-size:38px}h2{font-size:21px}p{color:#c4c7c9}section{margin:32px 0}nav{display:flex;gap:24px;flex-wrap:wrap}a:focus-visible{outline:2px solid #adc6ff;outline-offset:5px}</style><main><header><strong>IN<span style="color:#adc6ff">/</span>OUT</strong><nav><a href="privacy.html">Privacy</a><a href="safety.html">Safety</a><a href="support.html">Support</a></nav></header><h1>${page === 'privacy' ? 'Privacy policy' : page === 'safety' ? 'Breathing safety' : 'Help & support'}</h1><p>Effective ${escape(content.updated)}${info.publisherName ? ` · ${escape(info.publisherName)}` : ''}</p>${body}${contact}</main></html>\n`);
}
console.log('Prepared privacy, safety and support pages in apps/web/public.');
