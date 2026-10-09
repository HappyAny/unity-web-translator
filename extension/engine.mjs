import { DEFAULTS, validateSettings, buildModelBody, providerIdentity, stableJson, normalizeHistory } from './core.mjs';
import { LruCache, CACHE_MISS } from './lru.mjs';
const keyHashes = new LruCache({ maxEntries: 2000, maxBytes: 2 * 1024 * 1024 });
const hashWork = new Map();
const KANA = /[\u3040-\u30ff]/;
function failure(name, message) { const error = new Error(message); error.name = name; return error; }
const HTTP_HINTS = { 400: '请求 Body 格式不合法', 401: 'API 密钥认证失败，请重新填写密钥', 402: 'API 账户余额不足',
  403: '服务拒绝访问', 404: '接口路径或模型不存在', 422: '模型或 Body 参数不合法', 429: '服务限流，请稍后再试', 500: '服务内部错误', 503: '服务暂时繁忙' };
const SAFE_ERRORS = new Set(['BudgetExceeded', 'PermissionRequired', 'ProviderError', 'InvalidTranslation', 'MissingApiKey', 'RequestTimeout', 'NetworkError', 'ProviderResponseError', 'CacheError', 'TranslationPaused', 'TranslationChanged']);
function requestError(error, aborted, seconds) {
  if (aborted || error?.name === 'AbortError') return failure('RequestTimeout', '翻译请求超时（' + seconds + ' 秒），可开启禁止思考或增大请求超时');
  if (error?.name === 'TypeError') return failure('NetworkError', '浏览器无法发出请求或连接服务，请检查网络、代理、API 访问权限及密钥字符格式');
  return SAFE_ERRORS.has(error?.name) ? error : failure('RequestError', '请求失败（' + (error?.name || 'Error') + '），请先运行检查连接');
}
export function localDate() { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); }
export async function digest(text) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), byte => byte.toString(16).padStart(2, '0')).join(''); }
export function validateItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 8 || items.some(item => !item || typeof item.id !== 'string' || item.id.length > 100 || typeof item.text !== 'string' || item.text.length > 2000 || (item.kind !== undefined && !['story', 'name', 'ui'].includes(item.kind)) || (item.native !== undefined && typeof item.native !== 'boolean'))) throw new Error('须提交 1 到 8 条有效文字，每条最多 2000 字符');
}
export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (whole, part) => {
    if (part[0] === '#') { const n = part[1].toLowerCase() === 'x' ? parseInt(part.slice(2), 16) : Number(part.slice(1)); return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole; }
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' }[part.toLowerCase()] || whole;
  });
}
export function normalizeLineBreaks(text) {
  // Decode newline escapes only; keep file paths and unrelated escapes intact.
  return text.replace(/<[^>]*>|[A-Za-z]:\\[^\s<>"]+|\\\\[^\s<>"]+|(?:\\|[¥￥])(?:r(?:\\|[¥￥])n|n|r)|\r\n?/g,
    token => token.startsWith('<') || /^(?:[A-Za-z]:\\|\\\\)/.test(token) ? token : '\n');
}
export function chunks(text, limit = 450) {
  const result = []; let chunk = '', size = 0;
  for (const char of text) { const length = new TextEncoder().encode(char).length; if (size + length > limit) { result.push(chunk); chunk = ''; size = 0; } chunk += char; size += length; }
  if (chunk) result.push(chunk); return result;
}
export class TranslationEngine {
  // Window/Worker native fetch requires its global receiver. An arrow wrapper keeps
  // that receiver when the dependency is later called as this.fetchImpl(...).
  constructor({ storage, cache, glossary, fetchImpl = (...args) => globalThis.fetch(...args), permitted = async () => false, date = localDate, timeoutMs = null, usageLedger = null, networkScheduler = null }) {
    Object.assign(this, { storage, cache, glossary, fetchImpl, permitted, date, timeoutMs, usageLedger, networkScheduler });
    this.queue = Promise.resolve(); this.inflight = new Map(); this.networkActive = 0; this.networkWaiters = []; this.pageRequests = new Set();
    this.identities = new WeakMap(); this.translationEpoch = 0; this.hashStats = { computations: 0, hits: 0, joined: 0 };
    this.ready = this.load();
  }
  async load() {
    const local = await this.storage.local.get(['settings', 'usage', 'revision', 'providerRevision', 'rememberApiKey', 'apiKey']);
    const session = await this.storage.session.get(['apiKey']);
    this.settings = validateSettings({ ...DEFAULTS, ...local.settings });
    this.rememberApiKey = !!local.rememberApiKey; this.apiKey = (this.rememberApiKey ? local.apiKey : session.apiKey) || '';
    this.revision = local.revision || 1; this.providerRevision = local.providerRevision || 1;
    this.usage = local.usage?.date === this.date() ? local.usage : { date: this.date(), characters: 0 };
  }
  serial(callback) { const result = this.queue.then(callback); this.queue = result.catch(() => {}); return result; }
  identity(settings) {
    if (!this.identities.has(settings)) { const value = providerIdentity(settings); this.identities.set(settings, { value, encoded: stableJson(value) }); }
    return this.identities.get(settings);
  }
  async memoDigest(encoded) {
    const hit = keyHashes.get(encoded); if (hit !== CACHE_MISS) { this.hashStats.hits++; return hit; }
    if (hashWork.has(encoded)) { this.hashStats.joined++; return hashWork.get(encoded); }
    this.hashStats.computations++;
    const work = digest(encoded).then(key => { keyHashes.set(encoded, key); return key; });
    hashWork.set(encoded, work);
    try { return await work; } finally { if (hashWork.get(encoded) === work) hashWork.delete(encoded); }
  }
  cancelPageRequests() { this.translationEpoch++; for (const controller of this.pageRequests) controller.abort(); }
  async applySharedPreferences(preferences) {
    return this.applySharedConfiguration(preferences);
  }
  async applySharedConfiguration(preferences, credentials = null) {
    await this.ready;
    return this.serial(async () => {
      const settings = validateSettings({ ...this.settings, ...preferences });
      const apiKey = credentials ? credentials.apiKey : this.apiKey;
      if (this.identity(settings).encoded !== this.identity(this.settings).encoded || settings.requestTimeoutSeconds !== this.settings.requestTimeoutSeconds || apiKey !== this.apiKey) {
        this.providerRevision++; this.cancelPageRequests();
      } else if (settings.paused && !this.settings.paused) this.cancelPageRequests();
      this.settings = settings; this.apiKey = apiKey;
      if (credentials) this.rememberApiKey = credentials.rememberApiKey;
      this.revision++;
      await this.storage.local.set({ settings, revision: this.revision, providerRevision: this.providerRevision });
    });
  }
  diagnostics() { return { hashes: { ...this.hashStats }, keyEntries: keyHashes.entries.size, keyBytes: keyHashes.bytes }; }
  async publicSettings(full = false) {
    await this.ready;
    const settings = this.settings, revision = this.revision, providerRevision = this.providerRevision;
    const result = full ? { ...settings, rememberApiKey: this.rememberApiKey, hasApiKey: !!this.apiKey } :
      Object.fromEntries(['provider', 'storyEnabled', 'uiEnabled', 'paused', 'maxFreeCharacters', 'requestTimeoutSeconds',
        'lookahead', 'targetLanguage', 'interfaceLanguage', 'historyEnabled', 'historyMaxEntries', 'resourceRules'].map(key => [key, settings[key]]));
    return { ...result, revision,
      usedFreeCharacters: this.usageLedger ? (await this.usageLedger.current()).characters : (this.usage.date === this.date() ? this.usage.characters : 0),
      providerSignature: (await this.memoDigest(this.identity(settings).encoded)).slice(0, 16) + ':' + providerRevision };
  }
  async invalidateTranslations() {
    await this.ready;
    return this.serial(async () => { this.cancelPageRequests(); this.revision++; this.providerRevision++;
      await this.storage.local.set({ revision: this.revision, providerRevision: this.providerRevision }); return {};
    });
  }
  async configure(payload, preferencesOnly = false) {
    await this.ready;
    return this.serial(async () => {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('设置须为 JSON 对象');
      const allowed = preferencesOnly ? ['storyEnabled', 'uiEnabled', 'paused'] : Object.keys(DEFAULTS);
      const settings = validateSettings({ ...this.settings, ...Object.fromEntries(allowed.filter(key => Object.hasOwn(payload, key)).map(key => [key, payload[key]])) });
      const key = preferencesOnly ? '' : (payload.apiKey || '');
      if (typeof key !== 'string' || key.length > 5000 || /[\r\n]/.test(key)) throw new Error('密钥格式不合法');
      if (!preferencesOnly) {
        if (this.identity(settings).encoded !== this.identity(this.settings).encoded || settings.requestTimeoutSeconds !== this.settings.requestTimeoutSeconds || key || payload.clearApiKey) { this.providerRevision++; this.cancelPageRequests(); }
        if (settings.apiBase !== this.settings.apiBase || payload.clearApiKey) this.apiKey = '';
        if (key) this.apiKey = key;
        if (Object.hasOwn(payload, 'rememberApiKey')) this.rememberApiKey = !!payload.rememberApiKey;
        if (this.rememberApiKey) {
          await this.storage.local.set({ apiKey: this.apiKey }); await this.storage.session.remove('apiKey');
        } else {
          await this.storage.session.set({ apiKey: this.apiKey }); await this.storage.local.remove('apiKey');
        }
      }
      const wasPaused = this.settings.paused; this.settings = settings; this.revision++;
      if (settings.paused && !wasPaused) this.cancelPageRequests();
      await this.storage.local.set({ settings, revision: this.revision, providerRevision: this.providerRevision, rememberApiKey: this.rememberApiKey });
      return this.publicSettings(!preferencesOnly);
    });
  }
  async reserve(text, limit) {
    if (this.usageLedger) return this.usageLedger.reserve(text, limit);
    return this.serial(async () => {
      if (this.usage.date !== this.date()) this.usage = { date: this.date(), characters: 0 };
      const count = [...text].length;
      if (this.usage.characters + count > limit) throw failure('BudgetExceeded', '每日提交预算已用完，缓存和内置词表仍可使用');
      this.usage.characters += count; await this.storage.local.set({ usage: this.usage });
    });
  }
  async network(callback) {
    if (this.networkScheduler) return this.networkScheduler(callback);
    if (this.networkActive >= 2) await new Promise(resolve => this.networkWaiters.push(resolve));
    else this.networkActive++;
    try { return await callback(); }
    finally { const next = this.networkWaiters.shift(); if (next) next(); else this.networkActive--; }
  }
  async cached(key, original, language) { try { return await this.cache.get(key, original, language); } catch { throw failure('CacheError', '浏览器翻译缓存无法读取，请重新加载扩展后再试'); } }
  async personal(original, language) { try { return await this.cache.getOverride?.(original, language); } catch { throw failure('CacheError', '个人译文无法读取，请重新加载扩展后再试'); } }
  async probe() {
    await this.ready;
    if (this.settings.provider !== 'openai') throw new Error('检查连接用于模型 API');
    const base = this.settings.apiBase;
    if (!await this.permitted(base)) throw failure('PermissionRequired', '请先保存 API 地址并允许扩展访问');
    const start = Date.now(), controller = new AbortController(), milliseconds = this.timeoutMs ?? this.settings.requestTimeoutSeconds * 1000;
    const timer = setTimeout(() => controller.abort(), milliseconds);
    try {
      // No Authorization and no completion: probe cannot consume model tokens.
      const response = await this.fetchImpl(base + '/models', { method: 'GET', signal: controller.signal, credentials: 'omit', redirect: 'error' });
      return { reachable: true, httpStatus: response.status, elapsedMs: Date.now() - start,
        message: '浏览器已收到接口响应 HTTP ' + response.status + '。连接检查不携带密钥；401 / 403 仍说明请求到达了接口。' };
    } catch (error) {
      const result = requestError(error, controller.signal.aborted, milliseconds / 1000);
      return { reachable: false, error: result.name, message: result.message, elapsedMs: Date.now() - start };
    } finally { clearTimeout(timer); }
  }
  async plain(text, settings, token, fresh = false, reference = {}) {
    const language = settings.targetLanguage;
    const epoch = this.translationEpoch;
    const personal = fresh ? undefined : await this.personal(text, language); if (typeof personal === 'string') return { text: personal, cached: true, personal: true };
    const suffix = ['ja', language, text];
    if (reference.history?.length || reference.speaker) suffix.push(reference);
    const key = await this.memoDigest(this.identity(settings).encoded.slice(0, -1) + ',' + stableJson(suffix).slice(1));
    if (!fresh) { const hit = await this.cached(key, text, language); if (typeof hit === 'string') return { text: hit, cached: true }; }
    const pendingKey = key + ':' + epoch + (fresh ? ':test' : '');
    if (this.inflight.has(pendingKey)) return this.inflight.get(pendingKey);
    const work = this.network(async () => {
      if (!fresh && this.settings.paused) throw failure('TranslationPaused', '翻译已暂停');
      if (!fresh && epoch !== this.translationEpoch) throw failure('TranslationChanged', '翻译配置已变化，请重试');
      // Recheck after queueing: another request may have filled this cache entry.
      if (!fresh) { const existing = await this.cached(key, text, language); if (typeof existing === 'string') return { text: existing, cached: true }; }
      let url, options, translated;
      if (settings.provider === 'mymemory') {
        await this.reserve(text, settings.maxFreeCharacters);
        url = 'https://api.mymemory.translated.net/get?' + new URLSearchParams({ q: text, langpair: 'ja|' + language });
        options = { method: 'GET' };
      } else {
        if (!await this.permitted(settings.apiBase)) throw failure('PermissionRequired', '请在扩展设置页保存 API 地址并允许访问该服务');
        if (new URL(settings.apiBase).hostname === 'api.deepseek.com' && !token.trim()) throw failure('MissingApiKey', '尚未设置 DeepSeek API 密钥；修改 API 地址后请重新填写并保存');
        url = settings.apiBase + '/chat/completions';
        options = { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(buildModelBody(settings, text, reference)) };
      }
      const milliseconds = this.timeoutMs ?? settings.requestTimeoutSeconds * 1000;
      if (!fresh && this.settings.paused) throw failure('TranslationPaused', '翻译已暂停');
      if (!fresh && epoch !== this.translationEpoch) throw failure('TranslationChanged', '翻译配置已变化，请重试');
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), milliseconds);
      if (!fresh) this.pageRequests.add(controller);
      try {
        const response = await this.fetchImpl(url, { ...options, signal: controller.signal, credentials: 'omit', redirect: 'error' });
        if (!response.ok) throw failure('ProviderError', 'HTTP ' + response.status + '：' + (HTTP_HINTS[response.status] || '翻译接口拒绝了请求，请检查地址、模型和参数'));
        let data;
        try { data = await response.json(); }
        catch (error) { if (controller.signal.aborted) throw error; throw failure('ProviderResponseError', '接口返回的内容无法解析为 JSON，请检查 API 地址及代理响应'); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw failure('ProviderResponseError', '接口返回的 JSON 格式不符合翻译接口，请检查 API 地址及代理响应');
        if (settings.provider === 'mymemory') {
          if (Number(data.responseStatus) !== 200 || data.quotaFinished) throw failure('ProviderError', '免密钥翻译暂不可用或服务商额度已用完');
          translated = decodeEntities(data.responseData?.translatedText || '');
          if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(translated)) throw failure('ProviderError', '免密钥翻译服务拒绝了请求');
        } else translated = data.choices?.[0]?.message?.content;
      } catch (error) { throw !fresh && this.settings.paused ? failure('TranslationPaused', '翻译已暂停') : (!fresh && epoch !== this.translationEpoch ? failure('TranslationChanged', '翻译配置已变化，请重试') : requestError(error, controller.signal.aborted, milliseconds / 1000)); }
      finally { clearTimeout(timer); this.pageRequests.delete(controller); }
      if (epoch !== this.translationEpoch) throw failure('TranslationChanged', '翻译配置已变化，请重试');
      if (typeof translated !== 'string' || !translated.trim() || translated.length > text.length * 5 + 200 || /<\/?think\b/i.test(translated)) throw failure('InvalidTranslation', '模型没有返回可用的译文，请检查思考参数和输出长度');
      translated = normalizeLineBreaks(translated.trim()).replace(/</g, '＜').replace(/>/g, '＞');
      try { await this.cache.put(key, translated, text, language); } catch { throw failure('CacheError', '浏览器无法保存翻译缓存，请重新加载扩展后再试'); }
      return { text: translated, cached: false };
    });
    this.inflight.set(pendingKey, work);
    try { return await work; } finally { this.inflight.delete(pendingKey); }
  }
  async richText(text, settings, token, fresh = false, reference = {}, native = false) {
    const personal = fresh ? undefined : await this.personal(text, settings.targetLanguage); if (typeof personal === 'string') return { text: normalizeLineBreaks(personal), cached: true, personal: true };
    const output = []; let cached = true, personalUsed = false;
    for (const part of text.split(/(<[^>]*>|[\r\n]+)/g)) {
      const trimmed = part.trim();
      if (!part || /^<[^>]*>$/.test(part) || /^[\r\n]+$/.test(part)) output.push(part);
      else {
        const revision = fresh ? undefined : await this.personal(part, settings.targetLanguage);
        if (typeof revision === 'string') { output.push(revision); personalUsed = true; }
        else if (settings.targetLanguage === 'zh-CN' && !(settings.provider === 'openai' && settings.customPrompt) && Object.hasOwn(this.glossary, trimmed)) output.push(part.replace(trimmed, this.glossary[trimmed]));
        else if ((!KANA.test(part) && !(native && /[\u3400-\u9fff]/.test(part)) && !Object.hasOwn(this.glossary, trimmed)) || part.includes('|')) output.push(part);
        else for (const chunk of chunks(part)) { const result = await this.plain(chunk, settings, token, fresh, reference); output.push(result.text); cached &&= result.cached; personalUsed ||= !!result.personal; }
      }
    }
    return { text: normalizeLineBreaks(output.join('')), cached, ...(personalUsed ? { personal: true } : {}) };
  }
  async translate(items, { fresh = false } = {}) {
    await this.ready;
    validateItems(items);
    if (!fresh && this.settings.paused) return { items: items.map(item => ({ id: item.id, text: item.text })), paused: true, elapsedMs: 0 };
    const settings = this.settings, token = this.apiKey, start = Date.now();
    const results = await Promise.all(items.map(async item => {
      const reference = !fresh && item.kind === 'story' && settings.historyEnabled && settings.provider === 'openai' ?
        { history: normalizeHistory(item.history, settings), speaker: typeof item.speaker === 'string' ? item.speaker.slice(0, 150) : '' } : {};
      if (!fresh && (item.kind === 'ui' ? !settings.uiEnabled : item.kind !== undefined && !settings.storyEnabled)) return { id: item.id, text: item.text };
      try { return { id: item.id, ...await this.richText(item.text, settings, token, fresh, reference, !!item.native) }; }
      catch (error) { return { id: item.id, text: item.text, error: error.name, errorMessage: SAFE_ERRORS.has(error.name) || error.name === 'RequestError' ? error.message : '翻译失败（' + (error.name || 'Error') + '），请先运行检查连接' }; }
    }));
    return { items: results, elapsedMs: Date.now() - start };
  }
}
