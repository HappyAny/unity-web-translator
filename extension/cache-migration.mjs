function requestResult(request) { return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function legacyRows(indexedDB, info) {
  const request = indexedDB.open(info.name);
  request.onupgradeneeded = () => { if (request.transaction) request.transaction.abort(); };
  let database;
  try { database = await requestResult(request); } catch (error) { if (error?.name === 'AbortError') return null; throw error; }
  try {
    const names = [...database.objectStoreNames];
    if (database.version !== 2 || names.length !== 2 || !['translations', 'overrides'].every(name => names.includes(name))) return null;
    return await new Promise((resolve, reject) => {
      const tx = database.transaction(names, 'readonly'), rows = {};
      for (const name of names) {
        const store = tx.objectStore(name), keys = store.getAllKeys(), values = store.getAll();
        rows[name] = {};
        keys.onsuccess = () => { rows[name].keys = keys.result; };
        values.onsuccess = () => { rows[name].values = values.result; };
      }
      tx.oncomplete = () => resolve(rows);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('旧缓存无法读取'));
    });
  } finally { database.close(); }
}
export async function migrateCache(indexedDB, destination) {
  const flag = await requestResult(destination.transaction('metadata', 'readonly').objectStore('metadata').get('legacyImported'));
  if (flag || typeof indexedDB.databases !== 'function') return;
  const candidates = (await indexedDB.databases()).filter(info => info.name && info.name !== destination.name && info.version === 2);
  const datasets = (await Promise.all(candidates.map(info => legacyRows(indexedDB, info)))).filter(Boolean);
  await new Promise((resolve, reject) => {
    const tx = destination.transaction(['translations', 'overrides', 'metadata'], 'readwrite');
    for (const data of datasets) for (const name of ['translations', 'overrides']) {
      const store = tx.objectStore(name), { keys, values } = data[name];
      keys.forEach((key, index) => {
        const existing = store.get(key);
        existing.onsuccess = () => { if (existing.result === undefined) store.put(values[index], key); };
      });
    }
    tx.objectStore('metadata').put(true, 'legacyImported');
    tx.oncomplete = resolve;
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('旧缓存迁移失败'));
  });
}
