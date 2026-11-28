/**
 * Publish an over-the-air update (JS + assets only) to the phones on a channel:
 *
 *   npm run update:preview -- "Fix cart total"
 *   npm run update:production -- "Fix cart total"
 *
 * The API URL comes from that profile in eas.json, never from .env, so an update can
 * never point phones at localhost or a LAN IP. Only for JS changes: a new native module
 * or an app.json change needs a new build (and a new "version", see runtimeVersion).
 *
 * With SENTRY_AUTH_TOKEN set (in the shell or .env.local), the update's source maps go to
 * Sentry, so its errors show the real source lines. A failed upload doesn't undo the update.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const [channel, ...words] = process.argv.slice(2);
const eas = JSON.parse(fs.readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const profile = Object.values(eas.build).find((p) => p.channel === channel);
const apiUrl = profile?.env?.EXPO_PUBLIC_API_URL;
if (!apiUrl) {
  console.error(`No build profile with channel "${channel}" and an EXPO_PUBLIC_API_URL in eas.json.`);
  process.exit(1);
}
const message = words.join(' ').trim();
if (!message) {
  console.error('Say what changed: npm run update:' + channel + ' -- "Fix cart total"');
  process.exit(1);
}

console.log(`OTA update → channel "${channel}", API ${apiUrl}`);
const child = spawn('npx', ['eas-cli', 'update', '--channel', channel, '--environment', channel, '--message', JSON.stringify(message)], {
  stdio: 'inherit',
  shell: true,
  // Real environment variables win over .env files
  env: { ...process.env, EXPO_PUBLIC_API_URL: apiUrl, EXPO_PUBLIC_SENTRY_DSN: profile.env.EXPO_PUBLIC_SENTRY_DSN ?? '' },
});
child.on('exit', (code) => {
  if (code !== 0) process.exit(code ?? 1);
  const hasToken = process.env.SENTRY_AUTH_TOKEN || (fs.existsSync('.env.local') && fs.readFileSync('.env.local', 'utf8').includes('SENTRY_AUTH_TOKEN='));
  if (!hasToken) {
    console.warn('No SENTRY_AUTH_TOKEN: source maps not sent, errors from this update will show minified code.');
    process.exit(0);
  }
  // The uploader spawns bin/sentry-cli (a Node launcher) without a shell, which fails on Windows (ENOENT):
  // hand it the real binary (sentry-cli.exe on Windows) through the variable it supports
  const sentryCli = process.env.SENTRY_CLI_EXECUTABLE || createRequire(import.meta.url)('@sentry/cli').SentryCli.getPath();
  const upload = spawn('npx', ['sentry-expo-upload-sourcemaps', 'dist'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, SENTRY_CLI_EXECUTABLE: sentryCli },
  });
  upload.on('exit', (uploadCode) => {
    if (uploadCode !== 0) console.warn('The update is live, but its source maps did not reach Sentry.');
    process.exit(0);
  });
});
