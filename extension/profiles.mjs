// Copyright (C) 2026 HappyAny
// SPDX-License-Identifier: GPL-3.0-only
import { DEFAULTS, validateSettings, pageScope, stableJson } from './core.mjs';
export { pageScope } from './core.mjs';
import { TranslationEngine, digest, localDate } from './engine.mjs';
import { createCache } from './cache.mjs';
import { LruCache, CACHE_MISS } from './lru.mjs';

const REGISTRY = 'translationProfiles', SHARED = 'globalPreferences';
const PROFILE_FIELDS = ['customPrompt', 'resourceRules'];
const SHARED_FIELDS = Object.keys(DEFAULTS).filter(key => !PROFILE_FIELDS.includes(key));
const PUBLIC_FIELDS = ['provider', 'storyEnabled', 'uiEnabled', 'paused', 'maxFreeCharacters', 'requestTimeoutSeconds',
  'targetLanguage', 'interfaceLanguage', 'historyEnabled', 'historyMaxEntries'];
const PREFERENCE_FIELDS = ['storyEnabled', 'uiEnabled', 'paused', 'interfaceLanguage'];
const SERVICE_KEY = 'sharedTranslationApiKey';
const select = (value, keys) => Object.fromEntries(keys.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
const fail = message => { throw new Error(message); };
export function profileName(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(value)) fail('Profile 名称须为 1 到 80 字符');
  return value.trim();
}
function networkLimiter() {
  let active = 0; const waiting = [];
  return async callback => {
    if (active >= 2) await new Promise(resolve => waiting.push(resolve)); else active++;
    try { return await callback(); } finally { const next = waiting.shift(); if (next) next(); else active--; }
  };
}
function usageLedger(storage, date) {
  let queue = Promise.resolve(), usage;
  const ready = storage.local.get(['usage']).then(value => { usage = value.usage; });
  const current = async () => { await ready; if (usage?.date !== date()) usage = { date: date(), characters: 0 }; return { ...usage }; };
  return {
    current,
    reserve(text, limit) {
      const work = queue.then(async () => {
        const next = await current(), count = [...text].length;
        if (next.characters + count > limit) { const error = new Error('每日提交预算已用完，缓存和内置词表仍可使用'); error.name = 'BudgetExceeded'; throw error; }
        usage = { ...next, characters: next.characters + count }; await storage.local.set({ usage });
      });
      queue = work.catch(() => {}); return work;
    },
  };
}

// Pages can only use their saved binding; editing a profile never binds a page.
export class ProfileManager {
  constructor({ storage, indexedDB, glossary, permitted, fetchImpl, date = localDate, timeoutMs }) {
    Object.assign(this, { storage, indexedDB, glossary, permitted, fetchImpl, date, timeoutMs });
    this.queue = Promise.resolve(); this.areaQueue = Promise.resolve(); this.engines = new Map();
    this.routes = new LruCache({ maxEntries: 256, maxBytes: 256 * 1024 });
    this.networkScheduler = networkLimiter(); this.usageLedger = usageLedger(storage, date); this.ready = this.load();
  }
  serial(callback) { const next = this.queue.then(callback); this.queue = next.catch(() => {}); return next; }
  areaSerial(callback) { const next = this.areaQueue.then(callback); this.areaQueue = next.catch(() => {}); return next; }
  async load() {
    const local = await this.storage.local.get([REGISTRY, SHARED, SERVICE_KEY, 'settings', 'revision', 'rememberApiKey', 'apiKey']);
    const saved = local[REGISTRY];
    if (saved?.version === 1 && Array.isArray(saved.items) && saved.items.some(item => item.id === 'default')) {
      const items = saved.items.filter(item => typeof item?.id === 'string' && /^(?:default|[a-f0-9-]{36})$/.test(item.id)).slice(0, 50).map(item => ({ id: item.id, name: profileName(item.name) }));
      this.registry = { version: 1, revision: Math.max(saved.revision || 1, local.revision || 1), items, editorId: items.some(item => item.id === saved.editorId) ? saved.editorId : 'default', bindings: {} };
      for (const [key, binding] of Object.entries(saved.bindings || {})) if (/^[a-f0-9]{64}$/.test(key) && items.some(item => item.id === binding?.id)) this.registry.bindings[key] = { id: binding.id, revision: Number.isInteger(binding.revision) ? binding.revision : 1 };
    } else this.registry = { version: 1, revision: local.revision || 1, editorId: 'default', items: [{ id: 'default', name: 'Default' }], bindings: {} };
    if (local[SHARED]?.version === 2) {
      const saved = local[SHARED];
      this.shared = select(validateSettings({ ...DEFAULTS, ...saved.settings }), SHARED_FIELDS);
      this.rememberApiKey = !!saved.rememberApiKey; this.sharedRevision = saved.revision || 1;
      this.migratedFromId = saved.migratedFromId || null;
      this.apiKey = (this.rememberApiKey ? local[SERVICE_KEY] : (await this.storage.session.get([SERVICE_KEY]))[SERVICE_KEY]) || '';
    } else {
      // Keep the old local records before separating shared service settings from prompts.
      // Session-only keys stay in session storage and are never copied into this backup.
      const keys = this.registry.items.filter(item => item.id !== 'default').map(item => 'profile:' + item.id);
      const records = await this.storage.local.get(keys), id = this.registry.editorId;
      const source = id === 'default' ? local : records['profile:' + id] || local;
      this.shared = select(validateSettings({ ...DEFAULTS, ...source.settings, ...select(local[SHARED] || {}, ['paused', 'interfaceLanguage']) }), SHARED_FIELDS);
      this.rememberApiKey = !!source.rememberApiKey; this.sharedRevision = 1;
      this.migratedFromId = local[REGISTRY] || local.settings ? id : null;
      const sessionKey = id === 'default' ? (await this.storage.session.get(['apiKey'])).apiKey : (await this.storage.session.get(['profile:' + id]))['profile:' + id]?.apiKey;
      this.apiKey = (this.rememberApiKey ? source.apiKey : sessionKey) || '';
      if (this.migratedFromId) await this.storage.local.set({ profileSettingsBackupV1: { default: select(local, ['settings', 'apiKey', 'rememberApiKey']), profiles: records } });
      await this.persistCredentials();
    }
    await this.persist();
  }
  persist() { return this.storage.local.set({ [REGISTRY]: this.registry, [SHARED]: { version: 2, settings: this.shared, rememberApiKey: this.rememberApiKey, revision: this.sharedRevision, migratedFromId: this.migratedFromId } }); }
  async persistCredentials() {
    if (this.rememberApiKey) { await this.storage.local.set({ [SERVICE_KEY]: this.apiKey }); await this.storage.session.remove(SERVICE_KEY); }
    else { await this.storage.session.set({ [SERVICE_KEY]: this.apiKey }); await this.storage.local.remove(SERVICE_KEY); }
  }
  async bump() { this.registry.revision++; await this.persist(); }
  require(id) { const item = this.registry.items.find(item => item.id === id); if (!item) fail('请选择有效的 Profile'); return item; }
  scopedStorage(id) {
    const manager = this;
    function area(kind) {
      const source = manager.storage[kind], key = 'profile:' + id;
      async function getRecord() { return id === 'default' ? null : (await source.get([key]))[key] || {}; }
      return {
        async get(keys) {
          const value = id === 'default' ? await source.get(keys) : select(await getRecord(), keys);
          if (kind === 'local' && keys.includes('settings')) value.settings = { ...DEFAULTS, ...select(value.settings || {}, PROFILE_FIELDS), ...manager.shared };
          if (kind === 'local' && keys.includes('rememberApiKey')) value.rememberApiKey = manager.rememberApiKey;
          if (keys.includes('apiKey')) value.apiKey = (kind === 'local') === manager.rememberApiKey ? manager.apiKey : '';
          return value;
        },
        set(values) { return manager.areaSerial(async () => {
          const data = Object.fromEntries(Object.entries(values).filter(([name]) => !['apiKey', 'rememberApiKey'].includes(name)));
          if (kind === 'local' && data.settings) data.settings = select(data.settings, PROFILE_FIELDS);
          if (!Object.keys(data).length) return;
          if (id === 'default') return source.set(data);
          await source.set({ [key]: { ...await getRecord(), ...data } });
        }); },
        remove(keys) { return manager.areaSerial(async () => {
          keys = (Array.isArray(keys) ? keys : [keys]).filter(name => !['apiKey', 'rememberApiKey'].includes(name));
          if (!keys.length) return;
          if (id === 'default') return source.remove(keys);
          const record = await getRecord(); for (const name of Array.isArray(keys) ? keys : [keys]) delete record[name];
          await source.set({ [key]: record });
        }); },
      };
    }
    return { local: area('local'), session: area('session') };
  }
  async get(id) {
    await this.ready; this.require(id);
    if (!this.engines.has(id)) {
      const cache = createCache(this.indexedDB, id === 'default' ? 'unity-translations' : 'unity-translations-' + id);
      const engine = new TranslationEngine({ storage: this.scopedStorage(id), cache, glossary: this.glossary, permitted: this.permitted,
        fetchImpl: this.fetchImpl, date: this.date, timeoutMs: this.timeoutMs, usageLedger: this.usageLedger, networkScheduler: this.networkScheduler });
      this.engines.set(id, engine);
    }
    const engine = this.engines.get(id); await engine.ready; return engine;
  }
  async list() { await this.ready; return { profiles: this.registry.items.map(item => ({ ...item, isDefault: item.id === 'default' })), editorId: this.registry.editorId }; }
  async sharedView(full = false) {
    await this.ready;
    const revision = this.sharedRevision, data = full ? { ...this.shared, rememberApiKey: this.rememberApiKey, hasApiKey: !!this.apiKey,
      migratedFromProfile: this.registry.items.find(item => item.id === this.migratedFromId)?.name || null } : select(this.shared, PUBLIC_FIELDS);
    return { ...data, sharedRevision: revision, usedFreeCharacters: (await this.usageLedger.current()).characters };
  }
  async view(id, full = false, snapshotRevision = null) {
    await this.ready;
    const revision = snapshotRevision ?? this.registry.revision, sharedRevision = this.sharedRevision, shared = { ...this.shared };
    if (!id) return { ...select(shared, PUBLIC_FIELDS), resourceRules: [], storyEnabled: false, uiEnabled: false, profileId: null, profileRequired: true,
      revision, providerSignature: 'unbound', usedFreeCharacters: (await this.usageLedger.current()).characters };
    const item = { ...this.require(id) }, engine = await this.get(id), data = await engine.publicSettings(full);
    return { ...data, ...(full ? shared : select(shared, PUBLIC_FIELDS)), sharedRevision, profileId: id, profileName: item.name, profileRequired: false, revision, providerSignature: id + ':' + data.providerSignature };
  }
  async routeKey(scope) {
    const clean = pageScope(scope), hit = this.routes.get(clean); if (hit !== CACHE_MISS) return hit;
    const key = await digest(clean); this.routes.set(clean, key); return key;
  }
  async binding(scope) { await this.ready; if (!scope) return null; return this.registry.bindings[await this.routeKey(scope)] || null; }
  async pageView(scope) {
    await this.ready; const key = scope ? await this.routeKey(scope) : null;
    const id = this.registry.bindings[key]?.id, revision = this.registry.revision;
    return this.view(id, false, revision);
  }
  async bind(scope, id) {
    await this.ready;
    return this.serial(async () => { if (id) this.require(id); const key = await this.routeKey(scope);
      if (!id) delete this.registry.bindings[key]; else this.registry.bindings[key] = { id, revision: this.registry.revision + 1 };
      await this.bump(); return this.view(id);
    });
  }
  async selectEditor(id) { await this.ready; return this.serial(async () => { this.require(id); this.registry.editorId = id; await this.persist(); return this.view(id, true); }); }
  async create({ name, copyFrom } = {}) {
    await this.ready;
    return this.serial(async () => {
      name = profileName(name);
      if (this.registry.items.length >= 50) fail('最多创建 50 个 Profile');
      if (this.registry.items.some(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) fail('Profile 名称已存在');
      const copied = copyFrom ? select((await this.get(copyFrom)).settings, PROFILE_FIELDS) : { customPrompt: '', resourceRules: [] };
      const id = crypto.randomUUID();
      // Profiles hold their native text rules, prompt and translations; services are shared.
      await this.storage.local.set({ ['profile:' + id]: { settings: copied, revision: 1, providerRevision: 1 } });
      this.registry.items.push({ id, name }); this.registry.editorId = id; await this.bump();
      return this.view(id, true);
    });
  }
  async rename(id, name) {
    await this.ready;
    return this.serial(async () => { const item = this.require(id); name = profileName(name);
      if (this.registry.items.some(other => other.id !== id && other.name.toLocaleLowerCase() === name.toLocaleLowerCase())) fail('Profile 名称已存在');
      item.name = name; await this.bump(); return this.view(id, true);
    });
  }
  async configure(id, payload, preferencesOnly = false) {
    await this.ready;
    return this.serial(async () => {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('设置须为 JSON 对象');
      if (!id && PROFILE_FIELDS.some(key => Object.hasOwn(payload, key))) fail('请选择有效的 Profile');
      const shared = select(payload, preferencesOnly ? PREFERENCE_FIELDS : SHARED_FIELDS);
      const validated = select(validateSettings({ ...DEFAULTS, ...this.shared, ...shared }), SHARED_FIELDS);
      const engine = id ? await this.get(id) : null;
      const profilePatch = !preferencesOnly ? select(payload, PROFILE_FIELDS) : {};
      const profileSettings = Object.keys(profilePatch).length ? select(validateSettings({ ...engine.settings, ...validated, ...profilePatch }), PROFILE_FIELDS) : null;
      const key = preferencesOnly ? '' : (payload.apiKey ?? '');
      if (typeof key !== 'string' || key.length > 5000 || /[\r\n]/.test(key)) fail('密钥格式不合法');
      let apiKey = this.apiKey, rememberApiKey = this.rememberApiKey;
      if (!preferencesOnly) {
        if (validated.apiBase !== this.shared.apiBase || payload.clearApiKey) apiKey = '';
        if (key) apiKey = key;
        if (Object.hasOwn(payload, 'rememberApiKey')) rememberApiKey = !!payload.rememberApiKey;
      }
      if (stableJson(validated) !== stableJson(this.shared) || apiKey !== this.apiKey || rememberApiKey !== this.rememberApiKey) {
        this.shared = validated; this.apiKey = apiKey; this.rememberApiKey = rememberApiKey; this.sharedRevision++;
        await this.persistCredentials(); await this.persist();
        await Promise.all([...this.engines.values()].map(engine => engine.applySharedConfiguration(this.shared, { apiKey, rememberApiKey })));
      }
      if (profileSettings !== null) await engine.configure(profileSettings);
      await this.bump(); return id ? this.view(id, !preferencesOnly) : (preferencesOnly ? this.view(null) : this.sharedView(true));
    });
  }
  async invalidate(id) { await this.ready; return this.serial(async () => { await (await this.get(id)).invalidateTranslations(); await this.bump(); }); }
}
