import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const store = process.env.INOUT_RELEASE === '1' || process.env.INOUT_STORE_TEST === '1' || ['production', 'store-test'].includes(process.env.EAS_BUILD_PROFILE);
const result = spawnSync(process.execPath, [fileURLToPath(new URL('./check-parity.mjs', import.meta.url)), ...(store ? ['--build'] : [])], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
if (process.env.INOUT_ARTIFACT_ONLY === '1') process.argv.push('--artifact-only');
await import('./check-release.mjs');
