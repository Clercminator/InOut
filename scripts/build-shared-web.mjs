import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(root + 'apps/web/public', { recursive: true });
await build({ entryPoints: [root + 'apps/web/src/reset.ts'], outfile: root + 'apps/web/public/reset.js', bundle: true, minify: true, platform: 'browser', target: 'es2022' });
const config = JSON.parse(readFileSync(root + 'release/sharing.json', 'utf8'));
const origin = config.apiUrl ? new URL(config.apiUrl).origin : "'none'";
if (config.apiUrl && !config.apiUrl.startsWith('https://')) throw new Error('Sharing needs HTTPS');
writeFileSync(root + 'apps/web/public/reset.html', readFileSync(root + 'apps/web/reset.html', 'utf8').replace('__SHARING_ORIGIN__', origin));
console.log('Built the shared browser exercise.');

await build({ entryPoints: [root + 'supabase/functions/inout-shares/index.ts'], outfile: root + 'artifacts/inout-shares-edge.ts', bundle: true, format: 'esm', platform: 'neutral', mainFields: ['main'], target: 'es2022' });
await build({ entryPoints: [root + 'supabase/functions/inout-reviewer/index.ts'], outfile: root + 'artifacts/inout-reviewer-edge.ts', bundle: true, format: 'esm', platform: 'neutral', mainFields: ['main'], target: 'es2022' });
