import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { IDBFactory } from 'fake-indexeddb';
import { chromeFixture } from './fixtures/chrome.mjs';
import { DEFAULTS } from '../extension/core.mjs';

class Element {
  constructor() { this.value = ''; this.checked = false; this.listeners = {}; this.children = []; this.style = {}; this.attributes = {}; this.textContent = ''; this.files = []; }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(...children) { this.children.push(...children); }
  focus() { this.focused = true; }
  click() { return this.listeners.click?.(); }
  remove() {}
}
const html = await fs.readFile(new URL('../extension/options.html', import.meta.url), 'utf8');
const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match => [match[1], new Element()]));
const $ = id => elements.get(id);
globalThis.document = { documentElement: {}, getElementById: $, createElement: () => new Element(), querySelectorAll: () => [], body: new Element() };
globalThis.location = { href: 'chrome-extension://test-extension/options.html?new=1' };
const f = chromeFixture(), sent = [], completions = [];
f.chrome.storage.local.data.settings = { ...DEFAULTS, interfaceLanguage: 'en' };
f.chrome.permissions.request = async ({ origins }) => { origins.forEach(origin => f.grants.add(origin)); return true; };
f.chrome.runtime.getManifest = () => ({ version: '0.9.0' }); f.chrome.runtime.reload = () => {};
globalThis.chrome = f.chrome; globalThis.indexedDB = new IDBFactory();
globalThis.fetch = async (_url, options) => { completions.push(JSON.parse(options.body)); return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Translated test' } }] }) }; };
await import('../extension/background.mjs');
const listener = f.chrome.runtime.onMessage.listeners[0], own = { id: f.chrome.runtime.id, url: location.href };
f.chrome.runtime.sendMessage = message => { sent.push(structuredClone(message)); return new Promise(resolve => listener(message, own, resolve)); };
await import('../extension/settings.js');
async function waitUntil(check) { for (let i = 0; i < 100 && !check(); i++) await new Promise(resolve => setImmediate(resolve)); assert(check()); }
await waitUntil(() => $('profileSelect').value === 'default' && $('profileName').focused);
assert.equal($('profileSelect').children[0].textContent, 'Default profile');
assert.equal($('profileName').value, '');
assert.equal($('settingsVersion').textContent, 'UNITY WEB TRANSLATOR · v0.9.0', 'Show the running manifest version even when source files have a newer package version');
$('profileName').value = 'Adventure'; await $('createProfile').click();
const adventure = $('profileSelect').value; assert.notEqual(adventure, 'default');
assert($('profileStatus').textContent.includes('empty cache'));
$('provider').value = 'openai'; $('apiBase').value = 'https://api.example.test/v1'; $('model').value = 'test-model';
$('customPrompt').value = 'アリス = Alice. メニュー = Main menu.'; $('targetLanguage').value = 'en'; $('apiKey').value = 'TEST_ONLY_NOT_SECRET'; $('rememberApiKey').checked = true;
await $('settingsForm').listeners.submit({ preventDefault() {} });
assert.equal((await f.chrome.runtime.sendMessage({ action: 'getSettings', profileId: adventure })).data.customPrompt, '', 'Saving the shared service must not save a profile prompt');
await $('profileForm').listeners.submit({ preventDefault() {} });
const saved = await f.chrome.runtime.sendMessage({ action: 'getSettings', profileId: adventure });
assert.equal(saved.data.customPrompt, $('customPrompt').value); assert.equal(saved.data.targetLanguage, 'en'); assert(saved.data.hasApiKey);
assert.equal($('apiKey').value, ''); assert($('bodyPreview').textContent.includes('Main menu'));
await $('test').click(); assert.equal(completions.length, 1); assert(completions[0].messages[0].content.includes('Main menu'));
assert($('status').textContent.includes('succeeded')); assert($('testResult').textContent.includes('Translated test'));
$('customPrompt').value = 'メニュー = Draft only.';
await $('test').click(); assert.equal(completions.length, 2); assert(completions[1].messages[0].content.includes('Main menu'));
assert.equal($('customPrompt').value, 'メニュー = Draft only.', 'The shared-service test must retain an unsaved profile prompt');
assert.equal((await f.chrome.runtime.sendMessage({ action: 'getSettings', profileId: adventure })).data.customPrompt, saved.data.customPrompt);
await $('testProfile').click(); assert.equal(completions.length, 3); assert(completions[2].messages[0].content.includes('Draft only'));
assert.equal((await f.chrome.runtime.sendMessage({ action: 'getSettings', profileId: adventure })).data.customPrompt, 'メニュー = Draft only.');
$('customPrompt').value = saved.data.customPrompt; await $('profileForm').listeners.submit({ preventDefault() {} });
$('personalOriginal').value = 'アリス'; $('personalTranslation').value = 'Lady Alice'; await $('savePersonal').click();
assert.equal((await f.chrome.runtime.sendMessage({ action: 'getPersonalTranslation', profileId: adventure, payload: { original: 'アリス' } })).data.translation, 'Lady Alice');
$('profileSelect').value = 'default'; await $('profileSelect').listeners.change();
assert.equal($('provider').value, 'openai'); assert.equal($('targetLanguage').value, 'en'); assert.equal($('customPrompt').value, ''); assert.equal($('personalTranslation').value, '');
const sharedDefault = await f.chrome.runtime.sendMessage({ action: 'getSettings', profileId: 'default' });
assert.equal(sharedDefault.data.apiBase, saved.data.apiBase); assert(sharedDefault.data.hasApiKey);
$('personalOriginal').value = 'アリス'; await $('readPersonal').click(); assert.equal($('personalTranslation').value, '');
$('profileSelect').value = adventure; await $('profileSelect').listeners.change();
assert.equal($('customPrompt').value, saved.data.customPrompt); assert.equal($('targetLanguage').value, 'en');
$('personalOriginal').value = 'アリス'; await $('readPersonal').click(); assert.equal($('personalTranslation').value, 'Lady Alice');

let finishRead;
const file = { size: 120, text: () => new Promise(resolve => { finishRead = resolve; }) };
$('translationFile').files = [file]; const imported = $('translationFile').listeners.change();
await waitUntil(() => !!finishRead);
$('profileSelect').value = 'default'; await $('profileSelect').listeners.change();
const importsBefore = sent.filter(message => message.action === 'importTranslations').length;
finishRead(JSON.stringify({ format: 'unity-translations', version: 1, targetLanguage: 'en', translations: { '設定': 'Must not leak' } })); await imported;
assert.equal(sent.filter(message => message.action === 'importTranslations').length, importsBefore);
assert($('personalStatus').textContent.includes('profile or target language changed'));
assert.equal((await f.chrome.runtime.sendMessage({ action: 'getPersonalTranslation', profileId: 'default', payload: { original: '設定' } })).data.translation, '');
$('profileName').value = 'Original'; await $('renameProfile').click(); assert.equal($('profileSelect').children.find(item => item.value === 'default').textContent, 'Original');
$('apiBase').value = 'https://unsaved.example.test/v1'; $('apiKey').value = 'UNSAVED_TEST_KEY'; $('targetLanguage').value = 'ko';
$('profileSelect').value = adventure; await $('profileSelect').listeners.change();
assert.equal($('apiBase').value, 'https://unsaved.example.test/v1'); assert.equal($('apiKey').value, 'UNSAVED_TEST_KEY'); assert.equal($('targetLanguage').value, 'ko');
$('profileName').value = 'Copy'; $('copyProfile').checked = true; await $('createProfile').click();
assert.equal($('apiKey').value, 'UNSAVED_TEST_KEY'); assert($('profileStatus').textContent.includes('empty cache'));
const copied = (await f.chrome.runtime.sendMessage({ action: 'getSettings', profileId: $('profileSelect').value })).data;
assert.equal(copied.customPrompt, saved.data.customPrompt); assert.equal(copied.targetLanguage, 'en'); assert(copied.hasApiKey);
assert.equal((await f.chrome.runtime.sendMessage({ action: 'getPageContext' })).data.profileId, null, 'Settings actions must never bind the current page');
console.log('Profile UI: separate shared/profile saves, shared service and keys, prompt preview/test, independent edits, retained unsaved shared form, prompt copy and file-import race protection passed.');
