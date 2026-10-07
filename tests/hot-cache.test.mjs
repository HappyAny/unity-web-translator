import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { createCache } from '../extension/cache.mjs';
import { TranslationEngine, digest } from '../extension/engine.mjs';
import { DEFAULTS, providerIdentity, stableJson } from '../extension/core.mjs';
import { LruCache, CACHE_MISS } from '../extension/lru.mjs';
import { area } from './fixtures/chrome.mjs';
const indexedDB = new IDBFactory(), cache = createCache(indexedDB);
await cache.put('existing', '已有译文', 'テスト');
assert.equal(await cache.get('existing'), '已有译文'); assert.equal(cache.diagnostics().diskReads, 0);
const missing = await Promise.all(Array.from({ length: 10 }, () => cache.get('missing')));
assert(missing.every(value => value === undefined)); assert.equal(cache.diagnostics().diskReads, 1); assert.equal(cache.diagnostics().joinedReads, 9);
await cache.get('missing'); assert.equal(cache.diagnostics().diskReads, 1, 'Negative lookups should be cached too');
await cache.put('missing', '现在有译文', '今'); assert.equal(await cache.get('missing'), '现在有译文');
const sibling = createCache(indexedDB); assert.equal(await sibling.get('missing'), '现在有译文'); assert.equal(sibling.diagnostics().diskReads, 0);
await cache.importFile({ format: 'unity-translations', version: 1, translations: { '設定': '个人设置' } });
assert.equal(await sibling.getOverride('設定'), '个人设置'); await sibling.overrideOriginals();
await cache.importFile({ format: 'unity-translations', version: 1, translations: { '設定': '新修订', '確認': '新确认' } });
assert.equal(await sibling.getOverride('設定'), '新修订'); assert((await sibling.overrideOriginals()).includes('確認'));
await cache.removeOverride('設定'); assert.equal(await sibling.getOverride('設定'), undefined);
await sibling.clear(); assert.equal(await cache.get('missing'), undefined); assert.equal(await cache.getOverride('確認'), '新确认');

const storage = { local: area(), session: area() }, calls = [];
const engine = new TranslationEngine({ storage, cache, glossary: {}, permitted: async () => true,
  fetchImpl: async (_url, options) => { calls.push(options); return { ok: true, json: async () => ({ choices: [{ message: { content: '热缓存译文' } }] }) }; } });
await engine.configure({ provider: 'openai', model: 'hot-cache-model', apiBase: 'https://api.example.test/v1' });
const text = 'これは熱いキャッシュです。', items = [{ id: 'hot', text }];
assert.equal((await engine.translate(items)).items[0].text, '热缓存译文');
const oldKey = await digest(stableJson([...providerIdentity(engine.settings), 'ja', 'zh-CN', text]));
assert.equal(await cache.get(oldKey), '热缓存译文', 'Memoized keys must preserve the previous SHA-256 cache format');
const diskBefore = cache.diagnostics().diskReads, hashBefore = engine.diagnostics().hashes.computations;
for (let i = 0; i < 100; i++) assert((await engine.translate(items)).items[0].cached);
assert.equal(cache.diagnostics().diskReads, diskBefore); assert.equal(engine.diagnostics().hashes.computations, hashBefore); assert.equal(calls.length, 1);
await engine.publicSettings(); const prefsDisk = cache.diagnostics().diskReads, prefsHash = engine.diagnostics().hashes.computations;
for (let i = 0; i < 30; i++) await engine.publicSettings();
assert.equal(cache.diagnostics().diskReads, prefsDisk); assert.equal(engine.diagnostics().hashes.computations, prefsHash);

// Exercise the production budgets across multiple independent profile databases.
for (let i = 0; i < 2100; i++) await createCache(indexedDB, 'profile-cache-' + i % 3).put('key-' + i, 'x'.repeat(1300), 'テスト' + i);
assert(cache.diagnostics().hotEntries <= 2000); assert(cache.diagnostics().hotBytes <= 4 * 1024 * 1024);
assert.equal(await createCache(indexedDB, 'profile-cache-0').get('key-0'), 'x'.repeat(1300), 'Eviction must keep persistent records');
const lru = new LruCache({ maxEntries: 2, maxBytes: 1000 }); lru.set('a', '1'); lru.set('b', '2'); assert.equal(lru.get('a'), '1'); lru.set('c', '3');
assert.equal(lru.get('b'), CACHE_MISS); lru.set('too-large', 'x'.repeat(1000)); assert.equal(lru.get('too-large'), CACHE_MISS); assert(lru.bytes <= 1000);

let release;
const delayed = new TranslationEngine({ storage: { local: area(), session: area() }, cache: createCache(new IDBFactory()), glossary: {}, permitted: async () => true,
  fetchImpl: () => new Promise(resolve => { release = resolve; }) });
await delayed.configure({ provider: 'openai', model: 'delayed-cache-model', apiBase: 'https://api.example.test/v1' });
const pending = delayed.translate([{ id: 'late', text: 'これは古い応答です。' }]);
for (let i = 0; !release && i < 50; i++) await new Promise(resolve => setImmediate(resolve)); assert(release);
await delayed.invalidateTranslations(); await delayed.cache.clear();
release({ ok: true, json: async () => ({ choices: [{ message: { content: '过期响应' } }] }) });
assert.equal((await pending).items[0].error, 'TranslationChanged'); assert.equal((await delayed.cache.stats()).automatic, 0);
console.log('Hot cache: 100 repeated translations made zero additional IndexedDB reads, zero SHA-256 computations and zero requests; bounded memory, eviction, mutation invalidation and stale response checks passed.');
