const { readFileSync } = require('node:fs');
const expectedProject = 'poised-epigram-503804-a1';
const bundle = 'com.imrtech.inout';
function firebasePolicy(env, platforms = ['android', 'ios']) {
  const errors = [];
  for (const platform of platforms) {
    const key = platform === 'android' ? 'GOOGLE_SERVICES_JSON' : 'GOOGLE_SERVICES_PLIST';
    if (!env[key]) { errors.push(`${platform}: configure ${key} as an EAS file variable; Firebase is required for store builds.`); continue; }
    try {
      const source = readFileSync(env[key], 'utf8');
      if (platform === 'android') {
        const config = JSON.parse(source);
        if (config.project_info?.project_id !== expectedProject) throw Error('wrong project');
        const client = config.client?.find(c => c.client_info?.android_client_info?.package_name === bundle);
        if (!client?.client_info?.mobilesdk_app_id || !client.api_key?.[0]?.current_key) throw Error('missing Android app');
      } else {
        const value = key => source.match(new RegExp(`<key>\\s*${key}\\s*</key>\\s*<string>([^<]+)</string>`))?.[1];
        if (value('BUNDLE_ID') !== bundle || value('PROJECT_ID') !== expectedProject || !value('GOOGLE_APP_ID') || !value('API_KEY')) throw Error('wrong iOS app');
      }
    } catch { errors.push(`${platform}: ${key} must be a readable Firebase configuration for ${bundle} in ${expectedProject}.`); }
  }
  return errors;
}
module.exports = { firebasePolicy };
