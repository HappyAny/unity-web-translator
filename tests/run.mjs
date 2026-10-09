import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await fs.mkdir(new URL('../.test-output/', import.meta.url), { recursive: true });
for (const file of ['scripts/build.mjs', 'tests/native-wasm.test.mjs', 'tests/native-message.test.mjs', 'tests/native-prefetch.test.mjs', 'tests/native-reveal.test.mjs', 'tests/native-ui.test.mjs', 'tests/native-font.test.mjs', 'tests/native-font-compat.test.mjs', 'tests/native-resources.test.mjs', 'tests/native-xhr.test.mjs', 'tests/native-runtime.test.mjs',
  'tests/runtime-queue.test.mjs', 'tests/engine.test.mjs', 'tests/cache.test.mjs', 'tests/hot-cache.test.mjs', 'tests/profiles.test.mjs', 'tests/shared-settings.test.mjs',
  'tests/profile-ui.test.mjs', 'tests/sites.test.mjs', 'tests/background.test.mjs', 'tests/popup.test.mjs', 'tests/browser-updater.test.mjs', 'tests/package.test.mjs']) {
  const result = spawnSync(process.execPath, [file], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
if (process.platform === 'win32') {
  const result = spawnSync('python', ['-B', 'tests/updater.py'], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
} else console.log('Windows updater checks run in the Windows CI job.');
console.log('All applicable checks passed.');
