import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
if (['production', 'store-test'].includes(process.env.EAS_BUILD_PROFILE)) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./check-parity.mjs', import.meta.url)), '--receipt'], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
}
