if (process.env.INOUT_ARTIFACT_ONLY === '1') process.argv.push('--artifact-only');
await import('./check-release.mjs');
