import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { IDBFactory } from 'fake-indexeddb';
import { chromeFixture } from './fixtures/chrome.mjs';
import { DEFAULTS } from '../extension/core.mjs';

class Element {
  constructor() { this.listeners = {}; this.children = []; this.attributes = {}; this.textContent = ''; this.checked = false; this.value = ''; this.disabled = false; }
  addEventListener(type, callback) { this.listeners[type] = callback; }
  setAttribute(name, value) { this.attributes[name] = value; }
  replaceChildren(...children) { this.children = children; }
  append(...children) { this.children.push(...children); }
  querySelectorAll(selector) { return this.children.flatMap(label => label.children.filter(child => child.type === 'checkbox' && (selector === 'input' || child.checked))); }
}
const html = await fs.readFile(new URL('../extension/popup.html', import.meta.url), 'utf8');
const section = html.match(/<section class="site">([\s\S]*?)<\/section>/)[1];
assert(section.indexOf('id="profileSelect"') < section.indexOf('id="storyEnabled"'));
assert(section.indexOf('id="storyEnabled"') < section.indexOf('id="uiEnabled"'));
assert(html.indexOf('id="uiEnabled"') < html.indexOf('id="pageAccess"'));
assert(!/<details[^>]*\bopen\b/.test(html), 'Origin controls remain collapsed');
const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(match => [match[1], new Element()])), $ = id => elements.get(id);
globalThis.document = { documentElement: {}, getElementById: $, querySelectorAll: () => [], createElement: () => new Element() };
const f = chromeFixture(), sent = [], permissions = [];
f.chrome.storage.local.data.settings = { ...DEFAULTS, paused: true, storyEnabled: true, uiEnabled: false, interfaceLanguage: 'en' };
f.chrome.runtime.getManifest = () => ({ version: '0.9.1' });
f.chrome.runtime.getURL = path => 'chrome-extension://test-extension/' + path;
let inGesture = false, permissionResult = false, releasePermission;
f.chrome.permissions.request = ({ origins }) => {
  assert(inGesture, 'Request permissions inside the profile-selection gesture');
  permissions.push([...origins]);
  if (permissionResult === 'throw') throw new Error('Permission request failed');
  if (permissionResult === 'defer') return new Promise(resolve => { releasePermission = granted => { if (granted) origins.forEach(origin => f.grants.add(origin)); resolve(granted); }; });
  if (permissionResult) origins.forEach(origin => f.grants.add(origin));
  return Promise.resolve(permissionResult);
};
globalThis.chrome = f.chrome; globalThis.indexedDB = new IDBFactory();
await import('../extension/background.mjs');
const listener = f.chrome.runtime.onMessage.listeners[0], own = { id: f.chrome.runtime.id, url: f.chrome.runtime.getURL('popup.html') };
f.chrome.runtime.sendMessage = message => { sent.push(structuredClone(message)); return new Promise(resolve => listener(message, own, resolve)); };
async function request(action, payload) { const reply = await f.chrome.runtime.sendMessage({ action, payload }); assert(reply.ok, reply.error); return reply.data; }
const second = (await request('createProfile', { name: 'Adventure' })).profileId;
await import('../extension/popup.js');
for (let i = 0; i < 100 && $('origins').children.length !== 3; i++) await new Promise(resolve => setImmediate(resolve));
assert.equal($('origins').children.length, 3); assert.equal($('profileSelect').value, '');
assert.equal(permissions.length, 0); assert.equal(f.registered.size, 0, 'Opening the popup does not activate sites');
function choose(id) { $('profileSelect').value = id; inGesture = true; try { return $('profileSelect').listeners.change(); } finally { inGesture = false; } }
function clickSites() { inGesture = true; try { return $('siteToggle').listeners.click(); } finally { inGesture = false; } }
function origin(value) { return $('origins').querySelectorAll('input').find(input => input.value === value); }
await choose('default');
assert.equal((await request('getPageContext')).profileId, null);
assert.equal($('profileSelect').value, ''); assert($('status').textContent.includes('Allow access'));
assert(!sent.some(message => ['bindPageProfile', 'enableSites'].includes(message.action)), 'Denied access leaves the binding and enabled sites unchanged');
assert.equal(f.registered.size, 0); assert(!$('profileSelect').disabled);
permissionResult = 'throw'; await choose(second);
assert.equal($('status').textContent, 'Permission request failed'); assert.equal((await request('getPageContext')).profileId, null);
for (const input of $('origins').querySelectorAll('input')) input.checked = false;
const count = permissions.length; await choose(second);
assert.equal(permissions.length, count); assert.equal($('status').textContent, 'Select page origins to enable');
origin('https://canvas.example.test').checked = true; origin('https://content.example.test').checked = true;
permissionResult = 'defer'; const before = sent.length, choosing = choose('default');
assert.equal(sent.length, before, 'No background await precedes the permission request');
assert($('profileSelect').disabled && $('siteToggle').disabled && $('pauseToggle').disabled);
assert($('origins').querySelectorAll('input').every(input => input.disabled));
assert.deepEqual(permissions.at(-1), ['https://canvas.example.test/*', 'https://content.example.test/*']);
releasePermission(true); await choosing;
assert.equal((await request('getPageContext')).profileId, 'default');
assert.deepEqual(f.chrome.storage.local.data.enabledOrigins, ['https://canvas.example.test', 'https://content.example.test']);
assert.equal(f.registered.size, 2);
assert.deepEqual(f.injected.filter(call => call.files).map(call => call.target.frameIds), [[0, 1], [0, 1]], 'Activation immediately injects authorized frames');
assert.equal(f.injected.at(-1).args[0].profileId, 'default');
assert($('status').textContent.includes('Refresh the page') && $('status').textContent.includes('Translation paused'));
assert(!$('profileSelect').disabled && !$('siteToggle').disabled); assert(!origin('https://unselected.example.test').checked);
assert.equal($('storyEnabled').checked, true); assert.equal($('uiEnabled').checked, false);
assert.equal((await request('getSharedSettings')).paused, true);
origin('https://unselected.example.test').checked = true; permissionResult = false;
await choose(second);
assert.equal((await request('getPageContext')).profileId, 'default', 'Denied additional access preserves an existing binding');
assert.equal($('profileSelect').value, 'default'); assert($('status').textContent.includes('Allow access'));
assert.equal(f.chrome.storage.local.data.enabledOrigins.length, 2);
origin('https://unselected.example.test').checked = false; permissionResult = true;
const grantsBeforeSwitch = permissions.length; await choose(second);
assert.equal(permissions.length, grantsBeforeSwitch, 'Enabled origins need no new permission request');
assert.equal((await request('getPageContext')).profileId, second);
assert.equal($('storyEnabled').checked, true); assert.equal($('uiEnabled').checked, false);
assert.equal((await request('getSharedSettings')).paused, true, 'Selection retains global pause and switches');
$('uiEnabled').checked = true; await $('uiEnabled').listeners.change();
assert.equal((await request('getSharedSettings')).uiEnabled, true, 'Relocated switches remain shared');
await clickSites(); assert.equal(f.registered.size, 0);
permissionResult = true; await choose('default'); assert.equal(f.registered.size, 2, 'Selection re-enables disabled sites');
await clickSites(); permissionResult = 'defer'; const navigating = choose(second);
f.frames[0].url = 'https://canvas.example.test/another-view';
releasePermission(true); await navigating;
assert.equal((await request('getPageContext')).profileId, null); assert.equal(f.registered.size, 0);
assert.equal($('profileSelect').value, ''); assert($('status').textContent.includes('page changed'));
assert($('storyEnabled').disabled && $('uiEnabled').disabled && !$('profileSelect').disabled);
permissionResult = true;
const execute = f.chrome.scripting.executeScript;
f.chrome.scripting.executeScript = async () => { throw new Error('Document cannot be injected'); };
await choose(second); assert.equal((await request('getPageContext')).profileId, second);
assert($('status').textContent.includes('Refresh the page'));
f.chrome.scripting.executeScript = execute;
const grantsBeforeUnbind = permissions.length; await choose('');
assert.equal(permissions.length, grantsBeforeUnbind); assert.equal((await request('getPageContext')).profileId, null);
assert($('storyEnabled').disabled && $('uiEnabled').disabled);
f.frames[0].url = 'https://canvas.example.test/view';
assert.equal((await request('getPageContext')).profileId, 'default', 'Other bindings remain intact');
console.log('Popup: selection activates authorized frames, denial, origin choices, retained shared switches/pause, navigation races, refresh fallback and independent bindings passed.');
