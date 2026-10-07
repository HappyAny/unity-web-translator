import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { IDBFactory } from 'fake-indexeddb';
import { chromeFixture } from './fixtures/chrome.mjs';
import { NativeXHR, ProgressEvent } from './fixtures/xhr.mjs';

const f = chromeFixture(); f.grants.add('https://canvas.example.test/*'); f.grants.add('https://api.example.test/*');
f.chrome.storage.local.data.enabledOrigins = ['https://canvas.example.test'];
globalThis.chrome = f.chrome; globalThis.indexedDB = new IDBFactory();
const completions = [], deferred = []; let releaseModel;
globalThis.fetch = async (_url, options) => {
  const body = JSON.parse(options.body), content = body.messages[1].content;
  let reference; try { reference = JSON.parse(content); } catch { /* Plain text is the usual request. */ }
  const source = reference?.currentText || content; completions.push({ body, source, reference });
  const response = () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: source.includes('遅い') ? (body.messages[0].content.includes('SECOND_PROFILE') ? '第二个 Profile 的译文' : '第一个 Profile 的旧译文') : source.replace('こんにちは', '你好').replace('アリス', '爱丽丝').replace('さようなら', '再见') + (source.includes('遊園地') ? '译文' : '') } }] }) });
  if (source.includes('遅い')) return new Promise(resolve => { releaseModel = () => resolve(response()); deferred.push({ source, release: releaseModel }); });
  return response();
};
await import('../extension/background.mjs');
const listener = f.chrome.runtime.onMessage.listeners[0];
const own = { id: f.chrome.runtime.id, url: 'chrome-extension://test-extension/options.html' };
const pageSender = { id: f.chrome.runtime.id, frameId: 0, url: 'https://canvas.example.test/view?token=PRIVATE_TOKEN', tab: { id: 1 } };
const send = (message, sender = own) => new Promise(resolve => listener(message, sender, resolve));
async function request(action, payload, profileId) { const reply = await send({ action, payload, profileId }); assert(reply.ok, reply.error); return reply.data; }
await request('setSharedSettings', { provider: 'openai', apiBase: 'https://api.example.test/v1', model: 'example-model', apiKey: 'TEST_ONLY_NOT_SECRET', storyEnabled: true, uiEnabled: true, historyEnabled: true, historyMaxEntries: 2 });
const rules = [{ url: '/story/*.json', fields: [{ path: 'lines[*].text', kind: 'story', speaker: 'speaker' }, { path: 'lines[*].speaker', kind: 'name' }] }];
await request('setProfileSettings', { resourceRules: rules }, 'default');
const context = await request('getPageContext'); await request('bindPageProfile', { id: 'default', tabId: 1, scope: context.scope });

const callbacks = new Map(), intervalCallbacks = [], gameRequests = [], pageMessages = [], location = { origin: 'https://canvas.example.test', href: pageSender.url };
let responseRaw = '{ "id":900719925474099312345, "lines":[{"speaker":"アリス","text":"こんにちは"}], "command":"advance|1" }', fastDeadlines = false;
const win = {
  addEventListener(type, callback) { if (!callbacks.has(type)) callbacks.set(type, new Set()); callbacks.get(type).add(callback); },
  removeEventListener(type, callback) { callbacks.get(type)?.delete(callback); },
  postMessage() { assert.fail('Extension communication must not trigger the host iframe message listener'); },
  dispatchEvent(event) { Object.defineProperty(event, 'target', { value: win, configurable: true }); for (const callback of [...(callbacks.get(event.type) || [])]) callback(event); return true; },
  async fetch(input, init) {
    assert.equal(this, win, 'Native fetch must keep its Window receiver'); gameRequests.push({ input, init });
    const response = new Response(responseRaw, { status: 200, statusText: 'OK', headers: { 'Content-Type': String(input).includes('.wasm') ? 'application/wasm' : 'application/json', 'Content-Length': String(Buffer.byteLength(responseRaw)), ETag: 'original' } });
    Object.defineProperties(response, { url: { value: new URL(String(input), location.href).href }, redirected: { value: false }, type: { value: 'basic' } }); return response;
  },
  XMLHttpRequest: NativeXHR,
};
const originalFetch = win.fetch;
const sandbox = { window: win, location, document: { readyState: 'loading', querySelector: selector => selector === '#unity-canvas' ? {} : null, querySelectorAll: () => [] },
  chrome: { runtime: { sendMessage: message => { pageMessages.push(structuredClone(message)); return send(message, pageSender); } } },
  URL, Response, Headers, TextDecoder, TextEncoder, DOMException, Event, CustomEvent, ProgressEvent, AbortController,
  setTimeout: (fn, milliseconds) => setTimeout(fn, fastDeadlines && milliseconds === 15000 ? 25 : milliseconds), clearTimeout,
  setInterval: callback => { intervalCallbacks.push(callback); return intervalCallbacks.length; }, clearInterval: () => {},
};
vm.createContext(sandbox);
for (const file of ['native-resources.js', 'native-xhr.js', 'bridge.js', 'bootstrap.js', 'runtime.js']) vm.runInContext(await fs.readFile(new URL('../extension/' + file, import.meta.url), 'utf8'), sandbox, { filename: file });
const tick = async () => { for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve)); };
async function waitUntil(check, description) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 2)); }
  assert.fail('Timed out waiting for ' + description);
}
await win.__UnityWebTranslator.synchronize(); await tick();
assert.equal(win.__UnityWebTranslator.diagnostics().configuredRules, 1);
const response = await win.fetch('/story/start.json?token=PRIVATE_TOKEN');
assert.equal(response.url, 'https://canvas.example.test/story/start.json?token=PRIVATE_TOKEN'); assert.equal(response.type, 'basic'); assert.equal(response.redirected, false);
assert.equal(response.headers.get('Content-Length'), null); assert.equal(response.headers.get('ETag'), null);
const copy = response.clone(); assert.equal(copy.url, response.url);
const expected = responseRaw.replace('アリス', '爱丽丝').replace('こんにちは', '你好'); assert.equal(await response.text(), expected); assert.equal(await copy.text(), expected);
assert(completions.every(row => !row.reference?.referenceDialogue?.length), 'Preloaded resources must never create dialogue history');
const completionCount = completions.length; assert.equal(await (await win.fetch('/story/start.json')).text(), expected); assert.equal(completions.length, completionCount, 'Same profile resources use the cache');
assert.equal(await (await win.fetch('/unmatched.json')).text(), responseRaw);
assert.equal(await (await win.fetch('/story/start.json', { method: 'POST', body: '{}' })).text(), responseRaw);
assert.equal(await (await win.fetch('/engine.wasm')).text(), responseRaw);
assert.equal(completions.length, completionCount);
responseRaw = '{"lines":[{"speaker":"アリス","text":"<b>こんにちは</b>\\nさようなら"}]}';
assert((await (await win.fetch('/story/tags.json')).text()).includes('<b>你好</b>\\n再见'));
responseRaw = '{"lines":[{"text":"遊園地"}]}'; assert((await (await win.fetch('/story/kanji.json')).text()).includes('遊園地译文'), 'Explicit native fields may contain kanji-only Japanese');

const displayed = [];
win.UnityWebTranslator.bind('dialogue', 'こんにちは', text => displayed.push(text), { speaker: 'アリス', scene: 'one' }); await waitUntil(() => displayed.at(-1) === '你好', 'the first native dialogue');
assert.equal(displayed.at(-1), '你好');
win.UnityWebTranslator.bind('dialogue', 'さようなら', text => displayed.push(text), { speaker: 'アリス', scene: 'one' }); await waitUntil(() => displayed.at(-1) === '再见', 'the second native dialogue');
assert.equal(displayed.at(-1), '再见');
const last = completions.findLast(row => row.source === 'さようなら'); assert.equal(last.reference.referenceDialogue[0].text, 'こんにちは'); assert.equal(last.reference.referenceDialogue[0].speaker, 'アリス');
await request('setPreferences', { paused: true }); win.__UnityWebTranslator.applyPreferences((await send({ action: 'getPreferences' }, pageSender)).data);
assert.equal(displayed.at(-1), 'さようなら');
const pausedCount = completions.length; responseRaw = '{"lines":[{"text":"こんにちは"}]}'; assert.equal(await (await win.fetch('/story/paused.json')).text(), responseRaw); assert.equal(completions.length, pausedCount);
await request('setPreferences', { paused: false }); win.__UnityWebTranslator.applyPreferences((await send({ action: 'getPreferences' }, pageSender)).data); await waitUntil(() => displayed.at(-1) === '再见', 'the resumed native binding'); assert.equal(displayed.at(-1), '再见');
win.UnityWebTranslator.resetHistory(); await win.UnityWebTranslator.translate('こんにちは', { speaker: 'アリス', recordHistory: true });
win.UnityWebTranslator.bind('dialogue', 'さようなら', text => displayed.push(text), { speaker: 'アリス', scene: 'two' }); await waitUntil(() => displayed.at(-1) === '再见', 'the new-scene dialogue');
assert.equal(pageMessages.findLast(message => message.action === 'translate' && message.payload.items[0].text === 'さようなら').payload.items[0].history.length, 0, 'Scene changes clear history even when a provider response is cached');

// Exercise the actual SDK JavaScript entry point and its native SendMessage contract.
const pointers = new Map([[1, 'UniqueTextBridge'], [2, 'request-1'], [3, 'こんにちは'], [4, JSON.stringify({ kind: 'story', speaker: 'アリス', scene: 'sdk' })]]), nativeMessages = [];
sandbox.LibraryManager = { library: {} }; sandbox.mergeInto = Object.assign;
sandbox.UTF8ToString = pointer => pointers.get(pointer);
sandbox.Module = { SendMessage(target, method, json) { assert.equal(target, 'UniqueTextBridge'); assert.equal(method, 'OnTranslation'); nativeMessages.push(JSON.parse(json)); } };
vm.runInContext(await fs.readFile(new URL('../examples/unity/UnityWebTranslator.jslib', import.meta.url), 'utf8'), sandbox);
sandbox.LibraryManager.library.UWT_BindText(1, 2, 3, 4); pointers.clear(); await waitUntil(() => nativeMessages.at(-1)?.text === '你好', 'the native SDK callback');
assert.equal(nativeMessages.at(-1).id, 'request-1'); assert.equal(nativeMessages.at(-1).text, '你好', 'SDK copied UTF-8 values before yielding');
pointers.set(1, 'UniqueTextBridge'); sandbox.LibraryManager.library.UWT_ReleaseText(1); assert.equal(win.__UnityWebTextSlots.size, 0);

fastDeadlines = true; responseRaw = '{"lines":[{"text":"これは遅い応答です"}]}';
assert.equal(await (await win.fetch('/story/timeout.json')).text(), responseRaw, 'A translation deadline returns the untouched original resource');
assert(releaseModel); releaseModel(); await tick(); fastDeadlines = false;

// A stale binding is restored immediately and its delayed text is never applied.
const pendingBefore = deferred.length, stale = []; win.UnityWebTranslator.bind('slow', '遅い台詞です', text => stale.push(text), { scene: 'two' }); await waitUntil(() => deferred.length > pendingBefore, 'the first profile request');
const releaseOld = releaseModel;
const second = await request('createProfile', { name: 'Independent' });
await request('setProfileSettings', { customPrompt: 'SECOND_PROFILE' }, second.profileId);
await request('bindPageProfile', { id: second.profileId, tabId: 1, scope: context.scope });
win.__UnityWebTranslator.applyPreferences((await send({ action: 'getPreferences' }, pageSender)).data);
assert.equal(stale.at(-1), '遅い台詞です'); await waitUntil(() => deferred.length > pendingBefore + 1, 'the second profile request'); const releaseNew = releaseModel; releaseOld(); await tick();
assert(!stale.some(text => text === '第一个 Profile 的旧译文')); releaseNew(); await waitUntil(() => stale.at(-1) === '第二个 Profile 的译文', 'the current profile result'); assert.equal(stale.at(-1), '第二个 Profile 的译文');
assert.equal(win.__UnityWebTranslator.diagnostics().configuredRules, 0, 'A new profile has independent rules');

// Runtime status never contains request queries, credentials, or dialogue content.
intervalCallbacks[1](); await tick();
const report = await request('getRuntimeStatus'); assert(report.reports[0].unityDetected); assert(report.reports[0].translatedStrings > 0);
assert(!JSON.stringify(report).includes('PRIVATE_TOKEN')); assert(!JSON.stringify(report).includes('TEST_ONLY_NOT_SECRET')); assert(!JSON.stringify(report).includes('こんにちは'));
assert.equal((await send({ action: 'getRuntimeStatus' }, pageSender)).ok, false);
win.__UnityWebTranslator.uninstall(); await tick(); assert.equal(win.fetch, originalFetch); assert.equal(win.XMLHttpRequest, NativeXHR); assert.equal(win.UnityWebTranslator, undefined); assert.equal(displayed.at(-1), 'さようなら');
console.log('Native runtime: real background/bridge/cache, fetch metadata, rich text, history, pause, deadlines, independent profiles, stale results and safe diagnostics passed.');
