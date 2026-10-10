import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(root + 'apps/web/public', { recursive: true });
await build({ entryPoints: [root + 'apps/web/src/reset.ts'], outfile: root + 'apps/web/public/reset.js', bundle: true, minify: true, platform: 'browser', target: 'es2022', define: { __IOS_STORE_URL__: JSON.stringify(process.env.APP_STORE_URL || ''), __ANDROID_STORE_URL__: JSON.stringify(process.env.GOOGLE_PLAY_URL || '') } });
const config = JSON.parse(readFileSync(root + 'release/sharing.json', 'utf8'));
const origin = config.apiUrl ? new URL(config.apiUrl).origin : "'none'";
if (config.apiUrl && !config.apiUrl.startsWith('https://')) throw new Error('Sharing needs HTTPS');
const metadata = '<meta name="description" content="An opt-in shared breathing cadence from In/Out by IMR Tech SpA."><link rel="canonical" href="https://inout.imrtech.xyz/reset.html"><meta name="robots" content="noindex"><meta property="og:title" content="A shared breathing practice · In/Out"><meta property="og:description" content="Open a shared breathing cadence. Private history and ratings are never included."><meta property="og:type" content="website"><meta property="og:url" content="https://inout.imrtech.xyz/reset.html"><meta property="og:image" content="https://inout.imrtech.xyz/social.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://inout.imrtech.xyz/social.png">';
writeFileSync(root + 'apps/web/public/reset.html', readFileSync(root + 'apps/web/reset.html', 'utf8').replace('__SHARING_ORIGIN__', origin).replace('</head>', metadata + '</head>').replaceAll('IN/OUT', 'In/Out'));
console.log('Built the shared browser exercise.');

await build({ entryPoints: [root + 'supabase/functions/inout-shares/index.ts'], outfile: root + 'artifacts/inout-shares-edge.ts', bundle: true, format: 'esm', platform: 'neutral', mainFields: ['main'], target: 'es2022' });
await build({ entryPoints: [root + 'supabase/functions/inout-reviewer/index.ts'], outfile: root + 'artifacts/inout-reviewer-edge.ts', bundle: true, format: 'esm', platform: 'neutral', mainFields: ['main'], target: 'es2022' });
