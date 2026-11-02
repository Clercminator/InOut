import config from '../release/sharing.json' with { type: 'json' };
const [environment, command = 'status', readiness] = process.argv.slice(2);
if (!['production', 'sandbox'].includes(environment) || !['status','inactive','active','paused','closed'].includes(command)) {
  throw Error('Usage: node scripts/founder-control.mjs production|sandbox status|inactive|active|paused|closed [--verified-ready]');
}
const token = process.env.INOUT_FOUNDERS_ADMIN_TOKEN;
if (!token || token.length < 32) throw Error('Set INOUT_FOUNDERS_ADMIN_TOKEN in this shell. Never commit it.');
const response = await fetch(config.apiUrl.replace(/\/inout-shares$/, '/inout-founders/admin'), {
  method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ environment, action: command === 'status' ? 'status' : 'control',
    ...(command === 'status' ? {} : { status: command }), ...(readiness === '--verified-ready' ? { ready: true } : {}) }),
  signal: AbortSignal.timeout(15000),
});
const result = await response.json();
if (!response.ok) throw Error(`Campaign operation failed (${response.status}): ${result.error ?? 'unavailable'}`);
console.log(JSON.stringify(result, null, 2));
