const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../apps/mobile/src/locales');
const catalogs = { es: {}, pt: {} };
const content = require('../release/content.json');
for (const file of fs.readdirSync(root).filter(file => file.endsWith('.tsv'))) {
  for (const line of fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/).filter(Boolean)) {
    let [en, es, pt, ...extra] = line.split('\t');
    if (/^(privacy|safety|support)\.\d+\.(title|body)$/.test(en)) {
      const [section, index, field] = en.split('.');
      en = content[section][Number(index)][field];
    }
    if (!en || !es || !pt || extra.length) throw new Error(`Invalid translation: ${file}: ${en}`);
    for (const [language, text] of Object.entries({ es, pt })) {
      if (catalogs[language][en] && catalogs[language][en] !== text) throw new Error(`Conflicting translation: ${en}`);
      const slots = text => [...text.matchAll(/\{\d+\}/g)].map(m => m[0]).sort().join(',');
      if (slots(en) !== slots(text)) throw new Error(`Interpolation mismatch: ${language}: ${en}`);
      catalogs[language][en] = text;
    }
  }
}
for (const [language, catalog] of Object.entries(catalogs)) {
  const file = path.join(root, `${language}.json`);
  const generated = JSON.stringify(catalog, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(file, 'utf8') !== generated) throw new Error(`Stale catalog: run npm run locales:build (${language})`);
  } else fs.writeFileSync(file, generated);
}
console.log(`${Object.keys(catalogs.es).length} messages in each language`);
