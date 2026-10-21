/**
 * Publish an over-the-air update (JS + assets only) to the phones on a channel:
 *
 *   npm run update:preview -- "Fix cart total"
 *   npm run update:production -- "Fix cart total"
 *
 * The API URL comes from that profile in eas.json, never from .env, so an update can
 * never point phones at localhost or a LAN IP. Only for JS changes: a new native module
 * or an app.json change needs a new build (and a new "version", see runtimeVersion).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';

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
const child = spawn('npx', ['eas-cli', 'update', '--channel', channel, '--message', JSON.stringify(message)], {
  stdio: 'inherit',
  shell: true,
  // Real environment variables win over .env files
  env: { ...process.env, EXPO_PUBLIC_API_URL: apiUrl },
});
child.on('exit', (code) => process.exit(code ?? 1));
