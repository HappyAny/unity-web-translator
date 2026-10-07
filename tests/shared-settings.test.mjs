import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { ProfileManager } from '../extension/profiles.mjs';
import { DEFAULTS, providerIdentity, stableJson } from '../extension/core.mjs';
import { createCache } from '../extension/cache.mjs';
import { digest } from '../extension/engine.mjs';
import { area } from './fixtures/chrome.mjs';

const id = '11111111-1111-4111-8111-111111111111', indexedDB = new IDBFactory();
const previous = { ...DEFAULTS, provider: 'openai', apiBase: 'https://chosen.example.test/v1', model: 'chosen-model',
  targetLanguage: 'en', historyEnabled: true, historyMaxEntries: 4, customPrompt: 'Names: アリス = Alice.' };
const storage = { local: area({
  settings: { ...DEFAULTS, provider: 'openai', apiBase: 'https://other.example.test/v1', model: 'other-model', customPrompt: 'Original names.' },
  rememberApiKey: true, apiKey: 'OTHER_TEST_KEY',
  globalPreferences: { paused: false, interfaceLanguage: 'en' },
  translationProfiles: { version: 1, revision: 25, editorId: id, items: [{ id: 'default', name: 'Default' }, { id, name: 'Chosen' }], bindings: {} },
  ['profile:' + id]: { settings: previous, rememberApiKey: false, revision: 8, providerRevision: 3 },
}), session: area({ ['profile:' + id]: { apiKey: 'SESSION_TEST_KEY' } }) };
const calls = [], deps = { storage, indexedDB, glossary: {}, permitted: async () => true,
  fetchImpl: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ choices: [{ message: { content: 'Translation ' + calls.length } }] }) }; } };
const source = 'これは以前の文章です。', oldKey = await digest(stableJson([...providerIdentity(previous), 'ja', 'en', source]));
await createCache(indexedDB, 'unity-translations-' + id).put(oldKey, 'Existing translation', source, 'en');
await createCache(indexedDB).importFile({ format: 'unity-translations', version: 1, translations: { 'アリス': '原姓名' } });

const manager = new ProfileManager(deps); await manager.ready;
const selected = await manager.get(id), original = await manager.get('default');
assert.equal(manager.registry.revision, 25);
const shared = await manager.sharedView(true);
assert.equal(shared.migratedFromProfile, 'Chosen'); assert.equal(shared.apiBase, previous.apiBase); assert.equal(shared.targetLanguage, 'en');
assert(shared.hasApiKey && !shared.rememberApiKey); assert(!Object.hasOwn(shared, 'customPrompt'));
for (const engine of [selected, original]) { assert.equal(engine.settings.model, 'chosen-model'); assert.equal(engine.apiKey, 'SESSION_TEST_KEY');  }
assert.equal(original.settings.customPrompt, 'Original names.'); assert.equal(selected.settings.customPrompt, previous.customPrompt);
assert.equal((await selected.translate([{ id: 'old', text: source }])).items[0].text, 'Existing translation'); assert.equal(calls.length, 0);
assert.equal(await original.cache.getOverride('アリス', 'zh-CN'), '原姓名');
assert(!JSON.stringify(storage.local.data).includes('SESSION_TEST_KEY'), 'Session-only credentials must never enter the persistent migration backup');
assert.equal(storage.local.data.profileSettingsBackupV1.default.settings.model, 'other-model');
assert.equal(storage.local.data.profileSettingsBackupV1.default.apiKey, 'OTHER_TEST_KEY');

const fresh = await manager.create({ name: 'Fresh' }), freshEngine = await manager.get(fresh.profileId);
assert(fresh.hasApiKey); assert.equal(fresh.model, 'chosen-model'); assert.equal(fresh.targetLanguage, 'en'); assert.equal(fresh.customPrompt, '');
assert.deepEqual(storage.local.data['profile:' + fresh.profileId].settings, { customPrompt: '', resourceRules: [] });
assert(!Object.hasOwn(storage.local.data['profile:' + fresh.profileId], 'apiKey'));
assert.equal((await freshEngine.cache.stats('en')).automatic, 0);
await manager.configure(id, { customPrompt: 'アリス = Lady Alice.' });
assert.equal(selected.settings.customPrompt, 'アリス = Lady Alice.'); assert.equal(original.settings.customPrompt, 'Original names.'); assert.equal(freshEngine.settings.customPrompt, '');
const copied = await manager.create({ name: 'Copied', copyFrom: id }); assert.equal(copied.customPrompt, selected.settings.customPrompt); assert(copied.hasApiKey);

await manager.configure(null, { targetLanguage: 'zh-CN', historyEnabled: false, historyMaxEntries: 9, uiEnabled: true, storyEnabled: false,
  model: 'shared-model', extraBody: { temperature: 0.1 }, disableThinking: true, thinkingPreset: 'qwen', requestTimeoutSeconds: 55,
  apiKey: 'PERSISTENT_TEST_KEY', rememberApiKey: true });
for (const row of (await manager.list()).profiles) {
  const engine = await manager.get(row.id);
  assert.equal(engine.settings.targetLanguage, 'zh-CN'); assert.equal(engine.settings.model, 'shared-model'); assert.equal(engine.apiKey, 'PERSISTENT_TEST_KEY');
  assert(engine.settings.uiEnabled && !engine.settings.storyEnabled);
  assert(!engine.settings.historyEnabled); assert.equal(engine.settings.historyMaxEntries, 9); assert.equal(engine.settings.requestTimeoutSeconds, 55);
  assert.equal(engine.settings.extraBody.temperature, 0.1); assert(engine.settings.disableThinking); assert.equal(engine.settings.thinkingPreset, 'qwen');
  const publicData = await manager.view(row.id); assert.equal(publicData.targetLanguage, 'zh-CN');
  for (const field of ['apiKey', 'hasApiKey', 'apiBase', 'model', 'extraBody', 'customPrompt']) assert(!Object.hasOwn(publicData, field));
  assert(!JSON.stringify(publicData).includes('TEST_KEY'));
}
assert.equal(await original.cache.getOverride('アリス', 'zh-CN'), '原姓名');
assert.equal(await selected.cache.get(oldKey, source, 'en'), 'Existing translation');
const late = await manager.create({ name: 'After change' }); assert.equal(late.targetLanguage, 'zh-CN'); assert.equal(late.model, 'shared-model'); assert(late.hasApiKey);
assert.equal(storage.local.data.sharedTranslationApiKey, 'PERSISTENT_TEST_KEY'); assert(!Object.hasOwn(storage.session.data, 'sharedTranslationApiKey'));
const restarted = new ProfileManager(deps); await restarted.ready;
assert.equal((await restarted.get(late.profileId)).apiKey, 'PERSISTENT_TEST_KEY'); assert.equal((await restarted.get(id)).settings.customPrompt, 'アリス = Lady Alice.');
assert.equal((await restarted.sharedView(true)).model, 'shared-model');

await restarted.configure(null, { apiBase: 'https://new.example.test/v1' });
for (const row of (await restarted.list()).profiles) assert.equal((await restarted.get(row.id)).apiKey, '', 'An endpoint change must clear the shared key for every profile');
await restarted.configure(null, { apiKey: 'NEW_SESSION_TEST_KEY', rememberApiKey: false });
assert(!Object.hasOwn(storage.local.data, 'sharedTranslationApiKey'));
assert.equal(storage.session.data.sharedTranslationApiKey, 'NEW_SESSION_TEST_KEY');
await restarted.configure(null, { apiKey: '' }); assert.equal((await restarted.get(id)).apiKey, 'NEW_SESSION_TEST_KEY');
await restarted.configure(null, { clearApiKey: true }); assert(!(await restarted.sharedView(true)).hasApiKey);
const before = structuredClone(restarted.shared);
await assert.rejects(restarted.configure(null, { model: '', apiKey: 'INVALID\nKEY' })); assert.deepEqual(restarted.shared, before);
await assert.rejects(restarted.configure(null, { customPrompt: 'A profile is required' }));

const heldStorage = { local: area(), session: area() }, heldCalls = [];
const held = new ProfileManager({ storage: heldStorage, indexedDB: new IDBFactory(), glossary: {}, permitted: async () => true,
  fetchImpl: (_url, options) => { heldCalls.push(options); return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })), { once: true })); } });
await held.configure(null, { provider: 'openai', model: 'before', apiBase: 'https://held.example.test/v1', apiKey: 'HELD_TEST_KEY' });
const first = await held.create({ name: 'First' }), second = await held.create({ name: 'Second' });
const firstEngine = await held.get(first.profileId), secondEngine = await held.get(second.profileId);
const pending = Promise.all([firstEngine, secondEngine].map(engine => engine.translate([{ id: '1', text: 'あああ' }, { id: '2', text: 'いいい' }])));
for (let i = 0; heldCalls.length < 2 && i < 100; i++) await new Promise(resolve => setImmediate(resolve)); assert.equal(heldCalls.length, 2);
await held.configure(null, { targetLanguage: 'en', model: 'after' });
const cancelled = await pending;
assert.equal(heldCalls.length, 2, 'A shared change must also stop queued requests from every profile');
assert(heldCalls.every(options => options.signal.aborted)); assert(cancelled.every(result => result.items.every(item => item.error === 'TranslationChanged')));
assert.equal((await firstEngine.cache.stats()).automatic, 0); assert.equal((await secondEngine.cache.stats()).automatic, 0);
assert.equal(firstEngine.settings.model, 'after'); assert.equal(secondEngine.settings.targetLanguage, 'en');
console.log('Shared settings: selected-profile migration, session/persistent keys, lazy and active profiles, cache compatibility/isolation, global options, prompt-only copying, restart, endpoint key clearing and cross-profile cancellation passed.');
