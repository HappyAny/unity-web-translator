import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { IDBFactory } from 'fake-indexeddb';
import { chromeFixture } from './fixtures/chrome.mjs';

const f = chromeFixture();
f.grants.add('https://canvas.example.test/*'); f.grants.add('https://api.example.test/*');
f.chrome.storage.local.data.enabledOrigins = ['https://canvas.example.test'];
globalThis.chrome = f.chrome; globalThis.indexedDB = new IDBFactory();
let networkActive = 0, peakNetwork = 0;
const held = [];
globalThis.fetch = async (_url, options) => {
  networkActive++; peakNetwork = Math.max(peakNetwork, networkActive);
  try {
    await new Promise((resolve, reject) => {
      held.push(resolve);
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '中文译文' } }] }) };
  } finally { networkActive--; }
};
await import('../extension/background.mjs');
const listener = f.chrome.runtime.onMessage.listeners[0];
const own = { id: f.chrome.runtime.id, url: 'chrome-extension://test-extension/options.html' };
const sender = { id: f.chrome.runtime.id, frameId: 0, url: 'https://canvas.example.test/view', tab: { id: 1 } };
const send = (message, source = own) => new Promise(resolve => listener(message, source, resolve));
async function request(action, payload) { const result = await send({ action, payload }); assert(result.ok, result.error); return result.data; }
await request('setSharedSettings', { provider: 'openai', apiBase: 'https://api.example.test/v1', model: 'example-model', storyEnabled: true, uiEnabled: true });
const context = await request('getPageContext'); await request('bindPageProfile', { id: 'default', tabId: 1, scope: context.scope });
const callbacks = new Map(), responses = [], timers = new Map();
let now = Date.now(), isolatedActive = 0, nextTimer = 0;
const win = {
  addEventListener(type, callback) { if (!callbacks.has(type)) callbacks.set(type, new Set()); callbacks.get(type).add(callback); },
  removeEventListener(type, callback) { callbacks.get(type)?.delete(callback); },
  dispatchEvent(event) {
    Object.defineProperty(event, 'target', { value: win, configurable: true });
    if (event.type.endsWith('-response')) responses.push(JSON.parse(event.detail));
    for (const callback of [...(callbacks.get(event.type) || [])]) callback(event);
    return true;
  },
};
const sandbox = { window: win, document: { readyState: 'loading', querySelector: () => null, querySelectorAll: () => [] }, location: { href: sender.url },
  chrome: { runtime: { sendMessage: async message => { isolatedActive++; try { return await send(message, sender); } finally { isolatedActive--; } } } },
  URL, TextDecoder, TextEncoder, CustomEvent, Date: class extends Date { static now() { return now; } },
  // A manual page clock keeps deadline ordering independent of machine load.
  setTimeout: (fn, milliseconds) => { const id = ++nextTimer; timers.set(id, { fn, due: now + milliseconds }); return id; },
  clearTimeout: id => timers.delete(id), setInterval: () => 1, clearInterval() {},
};
vm.createContext(sandbox);
for (const file of ['native-resources.js', 'native-xhr.js', 'bridge.js', 'runtime.js']) vm.runInContext(await fs.readFile(new URL('../extension/' + file, import.meta.url), 'utf8'), sandbox, { filename: file });
await win.__UnityWebTranslator.synchronize();
const flush = async () => { for (let index = 0; index < 20; index++) await new Promise(resolve => setImmediate(resolve)); };
async function advance(milliseconds) {
  const end = now + milliseconds;
  while (true) {
    const entry = [...timers].sort((a, b) => a[1].due - b[1].due || a[0] - b[0]).find(([, timer]) => timer.due <= end);
    if (!entry) break;
    const [id, timer] = entry; now = timer.due; timers.delete(id); timer.fn(); await flush();
  }
  now = end; await flush();
}
let completed = false;
const translations = Promise.all(Array.from({ length: 4 }, (_, index) => win.UnityWebTranslator.translate(`待機中の説明${index}です。`, { kind: 'ui' }))).then(output => { completed = true; return output; });
await flush(); assert.equal(held.length, 2);
await advance(40000);
assert.equal(completed, false, 'Provider queueing must not consume the page response deadline');
for (const release of held.splice(0)) release(); await flush(); assert.equal(held.length, 2);
await advance(40000);
for (const release of held.splice(0)) release(); await flush();
const output = await translations;
assert.deepEqual(output, Array(4).fill('中文译文'), 'Provider queueing must not consume the page response deadline');
assert(responses.some(row => row.progress === true), 'The isolated bridge must keep the page informed while real work remains pending');
assert.equal(peakNetwork, 2); assert.equal(isolatedActive, 0);
assert.equal(win.__UnityWebTranslator.diagnostics().failures, 0);

const bounded = win.UnityWebTranslator.translate('期限を越える説明です。', { kind: 'ui' });
await flush(); assert.equal(networkActive, 1);
await advance(15 * 60 * 1000 + 1);
assert.equal(await bounded, '期限を越える説明です。', 'Progress cannot keep a hung request pending beyond the hard deadline');
for (const release of held.splice(0)) release(); await flush();
assert.equal(isolatedActive, 0);
assert.equal(timers.size, 0, 'Completion releases every progress and response timer');
win.__UnityWebTranslator.uninstall();
console.log('Transport progress: provider backlog, idle deadlines, original fallback, hard deadline, two-request concurrency and heartbeat cleanup passed.');
