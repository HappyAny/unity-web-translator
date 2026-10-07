import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { unzip } from '../scripts/zip.mjs';
import { extensionFiles } from '../scripts/files.mjs';
import vm from 'node:vm';
const metadata = JSON.parse(await fs.readFile(new URL('../dist/release-manifest.json', import.meta.url))), bytes = await fs.readFile(new URL('../dist/' + metadata.package, import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'), metadata.sha256);
const files = unzip(bytes); assert.equal(files.size, extensionFiles.length + 5);
assert(files.has('update.cmd') && files.has('update.ps1') && files.has('update-files.json') && files.has('LICENSE'));
assert(files.has('update.html'));
assert(!files.get('update.html').toString('utf8').includes('src="update.mjs"'));
const updater = files.get('update.html').toString('utf8');
new vm.Script(updater.match(/<script type="module">([\s\S]+)<\/script>/)[1]);
for (const entry of metadata.files) { assert.equal(createHash('sha256').update(files.get('extension/' + entry.path)).digest('hex'), entry.sha256); assert(!entry.path.includes('..')); }
assert(![...files.keys()].some(path => /settings\.json|sqlite|node_modules|tests\/|\.env/.test(path)));
const update = JSON.parse(files.get('update-files.json')); assert.equal(update.product, 'unity-web-translator'); assert.equal(update.version, metadata.version);
console.log('Release: package checksum, every public file hash, install structure, and private-file exclusion checks passed.');
