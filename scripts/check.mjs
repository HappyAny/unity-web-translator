import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { extensionFiles } from './files.mjs';
import { contentScripts } from '../extension/site-access.mjs';
import { messages } from '../extension/i18n.mjs';
const root = new URL('../', import.meta.url), extension = new URL('extension/', root);
const manifest = JSON.parse(await fs.readFile(new URL('manifest.json', extension))), project = JSON.parse(await fs.readFile(new URL('package.json', root)));
assert.equal(manifest.version, project.version); assert.equal(manifest.manifest_version, 3); assert.equal(manifest.background.type, 'module');
assert.deepEqual(manifest.host_permissions, ['https://api.mymemory.translated.net/*']);
assert(!manifest.content_scripts); assert(!manifest.key);
for (const name of extensionFiles) await fs.access(new URL(name, extension));
for (const file of [manifest.background.service_worker, manifest.options_ui.page, manifest.action.default_popup, ...Object.values(manifest.icons), ...contentScripts(['https://canvas.example.test']).flatMap(script => script.js)]) assert(extensionFiles.includes(file), file);
for (const [key, message] of Object.entries(messages)) assert(message['zh-CN'] && message.en, key);
for (const name of ['options.html', 'popup.html', 'update.html']) {
  const html = await fs.readFile(new URL(name, extension), 'utf8');
  assert(!/<script(?![^>]*src=)[^>]*>/.test(html));
  for (const match of html.matchAll(/data-i18n(?:-placeholder|-label)?="([^"]+)"/g)) assert(Object.hasOwn(messages, match[1]), match[1]);
  for (const match of html.matchAll(/(?:src|href)="([^":]+\.(?:js|mjs|css))"/g)) assert(extensionFiles.includes(match[1]), match[1]);
}
assert((await fs.readFile(new URL('runtime.js', extension), 'utf8')).includes("version: '" + manifest.version + "'"));
for (const directory of ['extension', 'scripts', 'tests', 'tests/fixtures']) {
  for (const name of await fs.readdir(new URL(directory + '/', root))) if (/\.(mjs|js)$/.test(name)) {
    const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(directory + '/' + name, root))], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
}
console.log('Syntax, packaging references, versions, and bilingual UI checks passed.');
