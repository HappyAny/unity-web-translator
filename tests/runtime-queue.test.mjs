import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { IDBFactory } from 'fake-indexeddb';
import { chromeFixture } from './fixtures/chrome.mjs';

const f = chromeFixture();
f.grants.add('https://canvas.example.test/*'); f.grants.add('https://api.example.test/*');
f.chrome.storage.local.data.enabledOrigins = ['https://canvas.example.test'];
globalThis.chrome = f.chrome; globalThis.indexedDB = new IDBFactory();
const calls = [], held = [], messages = [];
let hold = true, networkActive = 0, peakNetwork = 0;
globalThis.fetch = async (_url, options) => {
  const body = JSON.parse(options.body), text = body.messages[1].content;
  calls.push(text); networkActive++; peakNetwork = Math.max(peakNetwork, networkActive);
  try {
    if (hold) await new Promise((resolve, reject) => {
      held.push(resolve);
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '中文：' + text.replace(/[ぁ-ヿ]/g, '') } }] }) };
  } finally { networkActive--; }
};
await import('../extension/background.mjs');
const listener = f.chrome.runtime.onMessage.listeners[0];
const own = { id: f.chrome.runtime.id, url: 'chrome-extension://test-extension/options.html' };
const sender = { id: f.chrome.runtime.id, frameId: 0, url: 'https://canvas.example.test/view', tab: { id: 1 } };
const send = (message, source = own) => new Promise(resolve => listener(message, source, resolve));
async function request(action, payload) { const result = await send({ action, payload }); assert(result.ok, result.error); return result.data; }
await request('setSharedSettings', { provider: 'openai', apiBase: 'https://api.example.test/v1', model: 'example-model', storyEnabled: true, uiEnabled: true });
const context = await request('getPageContext');
await request('bindPageProfile', { id: 'default', tabId: 1, scope: context.scope });
const callbacks = new Map(), intervals = [];
let activeMessages = 0, peakMessages = 0;
const win = {
  addEventListener(type, callback) { if (!callbacks.has(type)) callbacks.set(type, new Set()); callbacks.get(type).add(callback); },
  removeEventListener(type, callback) { callbacks.get(type)?.delete(callback); },
  dispatchEvent(event) { Object.defineProperty(event, 'target', { value: win, configurable: true }); for (const callback of [...(callbacks.get(event.type) || [])]) callback(event); return true; },
};
const sandbox = { window: win, document: { readyState: 'loading', querySelector: () => null, querySelectorAll: () => [] }, location: { href: sender.url },
  chrome: { runtime: { sendMessage: async message => {
    messages.push(structuredClone(message)); activeMessages++; peakMessages = Math.max(peakMessages, activeMessages);
    try { return await send(message, sender); } finally { activeMessages--; }
  } } }, URL, TextDecoder, TextEncoder, CustomEvent, setTimeout, clearTimeout,
  setInterval: callback => { intervals.push(callback); return intervals.length; }, clearInterval() {},
};
vm.createContext(sandbox);
for (const file of ['native-resources.js', 'native-xhr.js', 'bridge.js', 'runtime.js']) vm.runInContext(await fs.readFile(new URL('../extension/' + file, import.meta.url), 'utf8'), sandbox, { filename: file });
const tick = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
async function waitUntil(check, label) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 2)); }
  assert.fail('Timed out: ' + label);
}
await win.__UnityWebTranslator.synchronize(); await tick();
const outputs = new Map(), releases = [];
for (let index = 0; index < 24; index++) releases.push(win.UnityWebTranslator.bind('paragraph-' + index, `説明画面の第${index}段です。`, text => outputs.set(index, text), { kind: 'ui' }));
await waitUntil(() => held.length === 2, 'the first two model requests');
releases[20]();
releases[21]();
win.UnityWebTranslator.bind('paragraph-21', '新しい説明画面です。', text => outputs.set(21, text), { kind: 'ui' });
win.UnityWebTranslator.bind('current-dialogue', '現在の会話です。', text => outputs.set('story', text), { kind: 'story' });
const probes = messages.filter(row => row.action === 'getPreferences').length;
await win.__UnityWebTranslator.synchronize();
assert.equal(messages.filter(row => row.action === 'getPreferences').length, probes + 1, 'UI work reserves bridge capacity for settings');
const reports = messages.filter(row => row.action === 'reportRuntime').length;
for (let index = 0; index < 24; index++) intervals[1]();
await waitUntil(() => messages.filter(row => row.action === 'reportRuntime').length === reports + 24, 'control requests while translation is busy');
hold = false; for (const release of held.splice(0)) release();
await waitUntil(() => [...outputs].filter(([index, value]) => index !== 20 && value.startsWith('中文')).length === 24, 'all remaining UI paragraphs and the current dialogue');
assert(!calls.some(text => text.includes('第20段') || text.includes('第21段')), 'Disposed or replaced queued labels never reach the model');
assert(calls.indexOf('現在の会話です。') < calls.indexOf('説明画面の第10段です。'), 'Current dialogue is scheduled ahead of a UI backlog');
assert.equal(peakNetwork, 2, 'Queueing does not expand provider concurrency');
assert(peakMessages <= 6, 'The page leaves capacity below the isolated bridge limit');
assert.equal(win.__UnityWebTranslator.diagnostics().failures, 0, 'No paragraph is discarded because the bridge is busy');

const beforePause = calls.length; hold = true;
const waiting = Array.from({ length: 20 }, (_, index) => win.UnityWebTranslator.translate(`停止前の説明${index}です。`, { kind: 'ui' }));
await waitUntil(() => held.length === 2, 'requests before pause');
await request('setPreferences', { paused: true }); await win.__UnityWebTranslator.synchronize();
await Promise.all(waiting); await tick();
assert.equal(calls.length - beforePause, 2, 'Pause discards queued work instead of sending the rest');
held.length = 0; hold = false;
for (const release of releases) release();
const beforeDispose = calls.length;
win.__UnityWebTranslator.applyPreferences({ ...(await send({ action: 'getPreferences' }, sender)).data, paused: false });
const oversized = Array.from({ length: 600 }, (_, index) => win.UnityWebTranslator.translate(`上限の説明${index}です。`, { kind: 'ui' }));
win.__UnityWebTranslator.uninstall(); await tick();
assert((await Promise.all(oversized)).every((text, index) => text === `上限の説明${index}です。`), 'Overflow and uninstall settle queued work with the source');
assert.equal(calls.length, beforeDispose, 'Disposed queues do not start additional model calls');
assert.equal(activeMessages, 0);
console.log('Runtime queue: 24 UI paragraphs, current-dialogue priority, reserved control capacity, hidden/replaced labels, provider concurrency, pause cancellation and cleanup passed.');
