import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { IDBFactory } from 'fake-indexeddb';
import { zip, unzip } from '../scripts/zip.mjs';
import { readRelease, applyRelease, inspectDirectory, updaterDirectoryStore, compareVersions } from '../extension/updater-core.mjs';
const metadata = JSON.parse(await fs.readFile(new URL('../dist/release-manifest.json', import.meta.url)));
const bytes = await fs.readFile(new URL('../dist/' + metadata.package, import.meta.url)), raw = unzip(bytes), release = await readRelease(bytes);
assert.equal(release.version, metadata.version); assert.equal(release.entries.length, metadata.files.length);
const encoder = new TextEncoder(), decoder = new TextDecoder();
const notFound = () => Object.assign(new Error('Missing'), { name: 'NotFoundError' });
function directoryFixture(key) {
  const oldManifest = { ...release.manifest, version: '0.0.1' }; if (key) oldManifest.key = key;
  const files = new Map(Object.entries({ 'manifest.json': JSON.stringify(oldManifest), 'engine.mjs': 'OLD ENGINE', 'core.mjs': 'OLD CORE', 'popup.js': 'OLD POPUP', 'settings.json': 'PERSONAL SETTINGS', 'personal.json': 'PERSONAL EDITS' }).map(([path, text]) => [path, encoder.encode(text)]));
  const folders = new Set(['']), fault = { path: null, once: false };
  function directory(path) {
    return { kind: 'directory', name: path.split('/').at(-1) || 'original-extension',
      async getDirectoryHandle(name, { create = false } = {}) {
        const child = path ? path + '/' + name : name;
        if (!folders.has(child)) { if (!create) throw notFound(); folders.add(child); }
        return directory(child);
      },
      async getFileHandle(name, { create = false } = {}) {
        const child = path ? path + '/' + name : name;
        if (!files.has(child)) { if (!create) throw notFound(); files.set(child, new Uint8Array()); }
        return { kind: 'file', name, getFile: async () => new Blob([files.get(child)]),
          createWritable: async () => {
            let pending;
            return { write: async value => { pending = new Uint8Array(value); }, close: async () => {
              if (child === fault.path) { if (fault.once) fault.path = null; throw new Error('Injected disk failure'); }
              files.set(child, pending);
            }, abort: async () => {} };
          } };
      },
      async removeEntry(name) { const child = path ? path + '/' + name : name; if (!files.delete(child)) throw notFound(); },
    };
  }
  return { directory: directory(''), files, fault };
}
const keyed = directoryFixture('TEST_PUBLIC_KEY_TO_KEEP'), before = new Map(keyed.files), progress = [];
const result = await applyRelease(keyed.directory, release, { installedVersion: '0.0.1', onProgress: (done, total) => progress.push([done, total]) });
const updated = JSON.parse(decoder.decode(keyed.files.get('manifest.json')));
assert.equal(updated.version, release.version); assert.equal(updated.key, 'TEST_PUBLIC_KEY_TO_KEEP'); assert.equal(progress.at(-1)[0], release.entries.length);
assert.equal(decoder.decode(keyed.files.get('settings.json')), 'PERSONAL SETTINGS'); assert.equal(decoder.decode(keyed.files.get('personal.json')), 'PERSONAL EDITS');
for (const path of ['manifest.json', 'engine.mjs', 'core.mjs', 'popup.js']) assert.deepEqual(keyed.files.get(result.backupName + '/' + path), before.get(path));
const pathBased = directoryFixture(); await applyRelease(pathBased.directory, { ...release, manifest: { ...release.manifest, key: 'UNEXPECTED_DIFFERENT_KEY' } });
assert(!Object.hasOwn(JSON.parse(decoder.decode(pathBased.files.get('manifest.json'))), 'key'));
assert.equal((await inspectDirectory(keyed.directory, release.version)).version, release.version);
await assert.rejects(() => applyRelease(keyed.directory, release), /更新的 ZIP/);
await assert.rejects(() => inspectDirectory(keyed.directory, '0.0.1'), /版本与当前扩展不一致/);

const broken = directoryFixture(), original = new Map(broken.files); broken.fault.path = 'core.mjs'; broken.fault.once = true;
await assert.rejects(() => applyRelease(broken.directory, release), /原文件已还原/);
for (const [path, content] of original) assert.deepEqual(broken.files.get(path), content);
assert.deepEqual([...broken.files.keys()].filter(path => !path.startsWith('.unity-update-backups/')).sort(), [...original.keys()].sort());
await assert.rejects(() => applyRelease(broken.directory, { ...release, entries: [{ path: '../outside.js', bytes: new Uint8Array() }] }), /文件清单/);
assert.equal(compareVersions('0.10.0', '0.7.0'), 1); assert.equal(compareVersions('0.7', '0.7.0'), 0);
assert.throws(() => compareVersions('0.7.0-beta', '0.0.1'));

const repack = map => zip([...map].map(([name, bytes]) => ({ name, bytes: Buffer.from(bytes) })));
const corrupted = new Map(raw); corrupted.set('extension/background.mjs', Buffer.from('changed code'));
await assert.rejects(() => readRelease(repack(corrupted)), /文件校验/);
await assert.rejects(() => readRelease(bytes.subarray(0, bytes.length - 8)), /ZIP|目录/);
await assert.rejects(() => readRelease(zip([...raw].map(([name, bytes]) => ({ name, bytes })).concat({ name: 'extension/manifest.json', bytes: raw.get('extension/manifest.json') }))), /重复或越界路径/);
const escaped = new Map(raw); escaped.set('../outside.js', Buffer.from('unwanted'));
await assert.rejects(() => readRelease(repack(escaped)), /越界路径/);
const unlisted = new Map(raw); unlisted.set('extension/unlisted.js', Buffer.from('unwanted'));
await assert.rejects(() => readRelease(repack(unlisted)), /未声明/);
const unsafe = new Map(raw), update = JSON.parse(unsafe.get('update-files.json')); update.files[0].path = 'settings.json';
unsafe.set('update-files.json', Buffer.from(JSON.stringify(update))); await assert.rejects(() => readRelease(repack(unsafe)), /文件清单/);

const factory = new IDBFactory(), store = await updaterDirectoryStore(factory); await store.set({ name: 'original-extension', kind: 'directory' }); store.close();
const reopened = await updaterDirectoryStore(factory); assert.equal((await reopened.get()).name, 'original-extension'); reopened.close();

class UpdateElement {
  constructor() { this.listeners = {}; this.textContent = ''; this.hidden = false; this.disabled = false; this.value = ''; this.classes = new Set(); this.classList = { toggle: (name, on) => on ? this.classes.add(name) : this.classes.delete(name), add: name => this.classes.add(name), remove: name => this.classes.delete(name) }; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  click() { this.listeners.click?.(); }
}
const ids = ['updateStatus', 'applyUpdate', 'chooseDirectory', 'packageFile', 'directoryName', 'packageVersion', 'reloadUpdated', 'dropZone', 'progress', 'language', 'runningVersionRow', 'runningVersion'];
const nodes = new Map(ids.map(id => [id, new UpdateElement()]));
globalThis.document = { documentElement: {}, body: new UpdateElement(), addEventListener() {}, querySelectorAll: () => [], getElementById: id => nodes.get(id) };
globalThis.indexedDB = new IDBFactory(); globalThis.chrome = undefined;
const uiTarget = directoryFixture(), uiOriginal = new Map(uiTarget.files);
let permitted = false, inGesture = false, permissionCalls = 0;
uiTarget.directory.requestPermission = async ({ mode }) => { assert.equal(mode, 'readwrite'); assert(inGesture, 'Permission must be requested in the click gesture'); permissionCalls++; return permitted ? 'granted' : 'denied'; };
globalThis.showDirectoryPicker = async options => { assert.equal(options.mode, 'readwrite'); return uiTarget.directory; };
await import('../extension/update.mjs');
assert(nodes.get('runningVersionRow').hidden, 'An offline updater cannot claim to know the browser’s running extension version');
nodes.get('language').listeners.change({ target: { value: 'en' } });
nodes.get('packageFile').listeners.change({ target: { files: [{ name: metadata.package, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }], value: 'test.zip' } });
for (let index = 0; !nodes.get('packageVersion').textContent.startsWith('v') && index < 100; index++) await new Promise(resolve => setTimeout(resolve, 5));
assert.equal(nodes.get('packageVersion').textContent, 'v' + release.version); assert(nodes.get('applyUpdate').disabled);
await nodes.get('chooseDirectory').listeners.click(); assert(!nodes.get('applyUpdate').disabled);
inGesture = true; let click = nodes.get('applyUpdate').listeners.click(); inGesture = false; await click;
assert.equal(permissionCalls, 1); assert.match(nodes.get('updateStatus').textContent, /Allow write access/);
for (const [path, content] of uiOriginal) assert.deepEqual(uiTarget.files.get(path), content, 'Denied permission must not write');
permitted = true; inGesture = true; click = nodes.get('applyUpdate').listeners.click(); inGesture = false; await click;
assert.match(nodes.get('updateStatus').textContent, /Files for v/); assert.match(nodes.get('updateStatus').textContent, /extension manager/); assert.match(nodes.get('updateStatus').textContent, /activate the new version/);
assert.equal(nodes.get('progress').value, release.entries.length); assert(nodes.get('applyUpdate').disabled && nodes.get('reloadUpdated').hidden);
assert.equal(JSON.parse(decoder.decode(uiTarget.files.get('manifest.json'))).version, release.version);
let reloaded = false;
globalThis.chrome = { runtime: { id: 'test-extension', getManifest: () => ({ version: '0.9.0' }), sendMessage: async () => ({ ok: true, data: { interfaceLanguage: 'en' } }), reload: () => { reloaded = true; } } };
await import('../extension/update.mjs?running-version'); await new Promise(resolve => setImmediate(resolve));
assert(!nodes.get('runningVersionRow').hidden); assert.equal(nodes.get('runningVersion').textContent, 'v0.9.0');
assert.equal(nodes.get('packageVersion').textContent, 'v' + release.version, 'The running and selected package versions must remain separate');
nodes.get('reloadUpdated').listeners.click(); assert(reloaded);
console.log('Browser updater: actual Release ZIP, streaming decompression, CRC/hash checks, unsafe-path rejection, identity preservation, personal-file retention, remembered target, backup, and rollback checks passed.');
console.log('Updater UI: ZIP file selection, English status, directory selection, click-time authorization, denied-permission protection, progress, and completion flow checks passed.');
