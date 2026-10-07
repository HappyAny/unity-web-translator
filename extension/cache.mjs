import { TARGET_LANGUAGES } from './core.mjs';
import { migrateCache } from './cache-migration.mjs';
import { LruCache, CACHE_MISS } from './lru.mjs';
const cacheFactories = new WeakMap();

export function validateTranslationFile(file) {
  if (!file || typeof file !== 'object' || Array.isArray(file) || typeof file.format !== 'string' || !/^[a-z]+-translations$/.test(file.format) || file.version !== 1 ||
      !file.translations || typeof file.translations !== 'object' || Array.isArray(file.translations)) throw new Error('请选择导出的译文 JSON 文件（format: unity-translations，version: 1）');
  if (!Object.hasOwn(TARGET_LANGUAGES, file.targetLanguage || 'zh-CN')) throw new Error('译文文件的目标语言不受支持');
  if (new TextEncoder().encode(JSON.stringify(file)).length > 10 * 1024 * 1024) throw new Error('译文文件最多 10 MB');
  const entries = Object.entries(file.translations);
  if (entries.length > 20000) throw new Error('一次最多导入 20000 条译文');
  for (const [original, translation] of entries) {
    if (original.includes('\0')) throw new Error('原文不能包含空字符');
    if (!original.trim() || original.length > 2000 || typeof translation !== 'string' || !translation.trim() || translation.length > 10000) throw new Error('每条译文需有有效原文和译文（原文最多 2000 字，译文最多 10000 字）');
    const tags = text => text.match(/<[^>]*>/g) || [];
    if (JSON.stringify(tags(original)) !== JSON.stringify(tags(translation))) throw new Error('个人译文须按原顺序保留富文本标签；不要增加或删除 <…> 标签');
  }
  return entries;
}

// Automatic cache and personal edits are independent; clearing cache keeps edits.
export function createCache(indexedDB, databaseName = 'unity-translations') {
  if (!cacheFactories.has(indexedDB)) cacheFactories.set(indexedDB, { hot: new LruCache(), scopes: new Map() });
  const factory = cacheFactories.get(indexedDB), prefix = databaseName + '\0';
  if (!factory.scopes.has(databaseName)) factory.scopes.set(databaseName, { automatic: 0, overrides: 0, pending: new Map() });
  const scope = factory.scopes.get(databaseName), diagnostics = { hotHits: 0, diskReads: 0, joinedReads: 0 };
  async function hotRead(kind, key, read) {
    const memoryKey = prefix + kind + '\0' + key, hit = factory.hot.get(memoryKey);
    if (hit !== CACHE_MISS) { diagnostics.hotHits++; return hit; }
    if (scope.pending.has(memoryKey)) { diagnostics.joinedReads++; return scope.pending.get(memoryKey); }
    const epoch = scope[kind === 'automatic' ? 'automatic' : 'overrides'];
    const work = read().then(value => { if (scope[kind === 'automatic' ? 'automatic' : 'overrides'] === epoch) factory.hot.set(memoryKey, value); return value; });
    scope.pending.set(memoryKey, work);
    try { return await work; } finally { if (scope.pending.get(memoryKey) === work) scope.pending.delete(memoryKey); }
  }
  function invalidate(kind) { scope[kind]++; factory.hot.clearPrefix(prefix + kind + '\0'); if (kind === 'overrides') factory.hot.clearPrefix(prefix + 'names\0'); scope.pending.clear(); }
  let database;
  function open() {
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 3);
      request.onupgradeneeded = () => { for (const name of ['translations', 'overrides', 'metadata']) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name); };
      request.onsuccess = async () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); database = undefined; };
        try { if (databaseName === 'unity-translations') await migrateCache(indexedDB, db); resolve(db); }
        catch (error) { db.close(); database = undefined; reject(error); }
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => { database = undefined; reject(new Error('缓存升级被旧页面占用，请关闭旧设置页并重新加载扩展')); };
    });
    return database;
  }
  async function transaction(mode, callback, storeName = 'translations') {
    if (mode === 'readonly') diagnostics.diskReads++;
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode), request = callback(tx.objectStore(storeName));
      let result;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Cache transaction aborted'));
    });
  }
  const put = async (key, value, original, targetLanguage = 'zh-CN') => { await transaction('readwrite', store => store.put({ original: original || null, translation: value, targetLanguage, updatedAt: Date.now() }, key)); scope.automatic++; factory.hot.set(prefix + 'automatic\0' + key, value); };
  const all = () => Promise.all(['translations', 'overrides'].map(name => transaction('readonly', store => store.getAll(), name)));
  const belongs = (value, language) => (value?.targetLanguage || 'zh-CN') === language;
  const overrideKey = (original, language) => language === 'zh-CN' ? original : language + '\0' + original;
  return {
    async get(key, original, targetLanguage = 'zh-CN') { return hotRead('automatic', key, async () => { const value = await transaction('readonly', store => store.get(key));
      if (typeof value === 'string') { if (original) await put(key, value, original, targetLanguage); return value; }
      if (value?.translation && !value.original && original) await put(key, value.translation, original, targetLanguage);
      return value?.translation;
    }); }, put,
    async clear() { await transaction('readwrite', store => store.clear()); invalidate('automatic'); },
    async getOverride(original, targetLanguage = 'zh-CN') { return hotRead('overrides', overrideKey(original, targetLanguage), async () => { const value = await transaction('readonly', store => store.get(overrideKey(original, targetLanguage)), 'overrides'); return value?.original === original && belongs(value, targetLanguage) ? value.translation : undefined; }); },
    async overrideOriginals(targetLanguage = 'zh-CN') { return hotRead('names', targetLanguage, async () => (await transaction('readonly', store => store.getAll(), 'overrides')).filter(value => belongs(value, targetLanguage)).map(value => value.original)); },
    async removeOverride(original, targetLanguage = 'zh-CN') { await transaction('readwrite', store => store.delete(overrideKey(original, targetLanguage)), 'overrides'); invalidate('overrides'); },
    diagnostics: () => ({ ...diagnostics, hotEntries: factory.hot.entries.size, hotBytes: factory.hot.bytes }),
    async stats(targetLanguage = 'zh-CN') { const stores = await all(), [automatic, personal] = stores.map(values => values.filter(value => belongs(value, targetLanguage))); const editable = automatic.filter(value => value?.original).length;
      return { automatic: automatic.length, editable, legacy: automatic.length - editable, personal: personal.length };
    },
    async exportFile(targetLanguage = 'zh-CN') {
      const stores = await all(), [automatic, personal] = stores.map(values => values.filter(value => belongs(value, targetLanguage))), translations = new Map();
      for (const value of automatic.filter(value => value?.original).sort((a, b) => a.updatedAt - b.updatedAt)) translations.set(value.original, value.translation);
      for (const value of personal) translations.set(value.original, value.translation);
      return { format: 'unity-translations', version: 1, sourceLanguage: 'ja', targetLanguage,
        translations: Object.fromEntries([...translations].sort(([a], [b]) => a.localeCompare(b))) };
    },
    async importFile(file) {
      const entries = validateTranslationFile(file), targetLanguage = file.targetLanguage || 'zh-CN', db = await open();
      await new Promise((resolve, reject) => {
        const tx = db.transaction('overrides', 'readwrite'), store = tx.objectStore('overrides');
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('个人译文导入失败'));
        for (const [original, translation] of entries) store.put({ original, translation, targetLanguage, updatedAt: Date.now() }, overrideKey(original, targetLanguage));
      });
      invalidate('overrides');
      return entries.length;
    },
  };
}
