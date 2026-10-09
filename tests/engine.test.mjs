import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { DEFAULTS, validateSettings, validateExtraBody, buildModelBody, normalizeHistory } from '../extension/core.mjs';
import { messages, localizeError, t } from '../extension/i18n.mjs';
import { TranslationEngine, chunks, normalizeLineBreaks } from '../extension/engine.mjs';
import { validateTranslationFile } from '../extension/cache.mjs';
const results = [];
const check = async (name, run) => { await run(); results.push({ case: name, passed: true }); };
function storageArea(initial = {}) {
  const data = structuredClone(initial);
  return { data, async get(keys) { return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter(key => Object.hasOwn(data, key)).map(key => [key, structuredClone(data[key])])); },
    async set(values) { Object.assign(data, structuredClone(values)); }, async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key]; }, async setAccessLevel() {} };
}
function fixture(overrides = {}) {
  const storage = { local: storageArea(), session: storageArea() }, values = new Map(), calls = [];
  const cache = { async get(key) { return values.get(key); }, async put(key, value) { values.set(key, value); }, async clear() { values.clear(); } };
  const fetchImpl = async (url, options) => { calls.push({ url, options }); return { ok: true, async json() { return { choices: [{ message: { content: '测试中文' } }] }; } }; };
  const deps = { storage, cache, glossary: { '設定': '设置', 'メニュー': '菜单' }, fetchImpl, permitted: async () => true, ...overrides };
  return { storage, cache, values, calls, deps, engine: new TranslationEngine(deps) };
}
const profile = { provider: 'openai', apiBase: 'https://model.invalid/v1', model: 'TEST_MODEL', apiKey: 'TEST_ONLY_NOT_SECRET' };
await check('Default native fetch keeps the global receiver for both translation and connection probes', async () => {
  const originalFetch = globalThis.fetch, calls = [];
  globalThis.fetch = async function (url, options) {
    assert.equal(this, globalThis, 'browser fetch requires Window/WorkerGlobalScope, not the engine instance');
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '测试中文' } }] }) };
  };
  try {
    const f = fixture(); delete f.deps.fetchImpl;
    const engine = new TranslationEngine(f.deps); await engine.configure(profile);
    const result = await engine.translate([{ id: '1', text: 'これはテストです。' }], { fresh: true });
    assert.equal(result.items[0].text, '测试中文'); assert(!result.items[0].error);
    assert((await engine.probe()).reachable); assert.equal(calls.length, 2);
    assert.equal(calls[0].options.method, 'POST'); assert.equal(calls[1].options.method, 'GET');
  } finally { globalThis.fetch = originalFetch; }
});
await check('Body presets close thinking, preserve other nested parameters, and lock translation messages', () => {
  const settings = { ...DEFAULTS, ...profile, extraBody: { temperature: 0.1, max_tokens: 123, thinking: { type: 'enabled', budget: 12 } }, disableThinking: true };
  const body = buildModelBody(settings, '日文');
  assert.equal(body.thinking.type, 'disabled'); assert.equal(body.thinking.budget, 12); assert.equal(body.temperature, 0.1); assert.equal(body.max_tokens, 123); assert.equal(body.stream, false);
  assert.equal(body.messages[1].content, '日文'); assert.equal(buildModelBody({ ...settings, thinkingPreset: 'qwen' }, '').enable_thinking, false);
  assert.deepEqual(buildModelBody({ ...settings, thinkingPreset: 'vllm', extraBody: { chat_template_kwargs: { other: true, enable_thinking: true } } }, '').chat_template_kwargs, { other: true, enable_thinking: false });
  assert.equal(buildModelBody({ ...settings, thinkingPreset: 'custom', extraBody: { reasoning_effort: 'none' } }, '').reasoning_effort, 'none');
  assert(!Object.hasOwn(buildModelBody({ ...settings, disableThinking: false, extraBody: {} }, ''), 'thinking'));
});
await check('Reject malformed/non-object Body, protected fields, credentials and SDK wrapper', () => {
  for (const value of [[], null, { messages: [] }, { model: 'x' }, { stream: true }, { api_key: 'test' }, { extra_body: {} }, JSON.parse('{"__proto__":{}}')]) assert.throws(() => validateExtraBody(value));
  assert.throws(() => validateSettings({ ...DEFAULTS, disableThinking: true, thinkingPreset: 'custom' }));
  assert.throws(() => validateSettings({ ...DEFAULTS, apiBase: 'https://user:pass@model.invalid/' }));
});
await check('Model request uses Body settings and cache survives worker restart; parameter changes invalidate cache', async () => {
  const f = fixture(); await f.engine.configure({ ...profile, extraBody: { max_tokens: 88 }, disableThinking: true });
  const items = [{ id: '1', text: 'これはテストです。' }];
  assert.equal((await f.engine.translate(items)).items[0].text, '测试中文');
  const body = JSON.parse(f.calls[0].options.body); assert.equal(body.max_tokens, 88); assert.deepEqual(body.thinking, { type: 'disabled' });
  assert.equal(f.calls[0].options.headers.Authorization, 'Bearer TEST_ONLY_NOT_SECRET');
  assert.equal(f.calls[0].options.credentials, 'omit'); assert.equal(f.calls[0].options.redirect, 'error');
  const reloaded = new TranslationEngine(f.deps); assert((await reloaded.translate(items)).items[0].cached); assert.equal(f.calls.length, 1);
  const before = await reloaded.publicSettings(); await reloaded.configure({ extraBody: { max_tokens: 99 } });
  assert.notEqual((await reloaded.publicSettings()).providerSignature, before.providerSignature);
  await reloaded.translate(items); assert.equal(f.calls.length, 2);
});
await check('Session/persistent keys stay in extension; preferences cannot change provider; destination change clears key', async () => {
  const f = fixture(); await f.engine.configure(profile);
  assert(!JSON.stringify(f.storage.local.data).includes('TEST_ONLY_NOT_SECRET'));
  assert.equal(f.storage.session.data.apiKey, 'TEST_ONLY_NOT_SECRET');
  const prefs = await f.engine.publicSettings(); for (const key of ['apiKey', 'apiBase', 'model', 'extraBody', 'rememberApiKey']) assert(!Object.hasOwn(prefs, key));
  await f.engine.configure({ provider: 'mymemory', apiKey: 'OTHER_TEST', uiEnabled: true }, true); assert.equal(f.engine.settings.provider, 'openai');
  assert.equal(f.engine.apiKey, 'TEST_ONLY_NOT_SECRET');
  await f.engine.configure({ rememberApiKey: true }); assert.equal(f.storage.local.data.apiKey, 'TEST_ONLY_NOT_SECRET'); assert(!Object.hasOwn(f.storage.session.data, 'apiKey'));
  const reloaded = new TranslationEngine({ ...f.deps, storage: { ...f.storage, session: storageArea() } }); assert((await reloaded.publicSettings(true)).hasApiKey);
  await reloaded.configure({ apiBase: 'https://other.invalid/v1' }); assert.equal(reloaded.apiKey, '');
  assert(!Object.hasOwn(await reloaded.publicSettings(true), 'apiKey'));
});
await check('Missing API host permission returns original text without making a network call', async () => {
  const f = fixture({ permitted: async () => false }); await f.engine.configure(profile);
  const item = (await f.engine.translate([{ id: '1', text: 'これはテストです。' }])).items[0];
  assert.equal(item.error, 'PermissionRequired'); assert.equal(item.text, 'これはテストです。'); assert.equal(f.calls.length, 0);
});
await check('Daily budget is serialized, survives restart and rolls over; glossary is offline', async () => {
  let date = '2026-10-06', calls = 0;
  const f = fixture({ date: () => date, fetchImpl: async () => { calls++; return { ok: true, json: async () => ({ responseStatus: 200, responseData: { translatedText: '中文' } }) }; } });
  await f.engine.configure({ maxFreeCharacters: 4 });
  const result = await f.engine.translate([{ id: '1', text: 'ああ' }, { id: '2', text: 'いい' }, { id: '3', text: 'うう' }]);
  assert.equal(calls, 2); assert.equal(result.items.filter(item => item.error === 'BudgetExceeded').length, 1);
  const reloaded = new TranslationEngine(f.deps); assert.equal((await reloaded.publicSettings()).usedFreeCharacters, 4);
  const offline = await reloaded.translate([{ id: '4', text: '<color=#fff>設定</color>' }]); assert.equal(offline.items[0].text, '<color=#fff>设置</color>'); assert.equal(calls, 2);
  date = '2026-10-07'; assert.equal((await reloaded.publicSettings()).usedFreeCharacters, 0);
  await reloaded.translate([{ id: '5', text: 'ええ' }]); assert.equal(calls, 3);
});
await check('RichText keeps markup, numeric/Chinese/ruby strings; UTF-8 chunks do not split characters', async () => {
  const f = fixture(); await f.engine.configure(profile);
  const item = (await f.engine.translate([{ id: '1', text: '<size=30>これはテストです。</size>' }])).items[0]; assert.equal(item.text, '<size=30>测试中文</size>');
  for (const text of ['中文 123', '名前|なまえ']) assert.equal((await f.engine.translate([{ id: '2', text }])).items[0].text, text);
  const text = 'あ'.repeat(400) + '😀'; const parts = chunks(text); assert.equal(parts.join(''), text); assert(parts.every(part => Buffer.byteLength(part) <= 450));
});
await check('Visible native separators retain their structure without filtering their surrounding words', async () => {
  const f = fixture(); await f.engine.configure({ ...profile, uiEnabled: true });
  const text = '<b>前の説明</b> | 次の説明 | HP | 100';
  const item = (await f.engine.translate([{ id: 'native-ui', text, native: true, kind: 'ui' }])).items[0];
  assert.equal(item.text, '<b>测试中文</b> | 测试中文 | HP | 100');
  assert.equal(f.calls.length, 2); assert(!item.error);
  assert.equal((await f.engine.translate([{ id: 'control', text: '名前|なまえ' }])).items[0].text, '名前|なまえ', 'Unclassified ruby or control syntax remains untouched');
});
await check('The model receives a complete long paragraph with its internal line breaks in one request', async () => {
  const source = '長い説明です。'.repeat(130) + '\n\nこれは二行目の説明です。';
  const f = fixture({ fetchImpl: async (_url, options) => {
    const text = JSON.parse(options.body).messages[1].content;
    assert.equal(text, source, 'The free-service byte limit must not fragment a model paragraph');
    return { ok: true, json: async () => ({ choices: [{ message: { content: '完整说明。\n\n这是第二段。' } }] }) };
  } });
  await f.engine.configure(profile);
  const item = (await f.engine.translate([{ id: 'paragraph', text: source, native: true }])).items[0];
  assert.equal(item.text, '完整说明。\n\n这是第二段。'); assert(!item.error);
});
await check('Old per-line and free-byte-chunk personal revisions remain effective in model paragraphs', async () => {
  const f = fixture(); await f.engine.configure(profile);
  const line = '二行目のテスト。', source = '一行目の説明です。\n' + line + '\n三行目の説明です。';
  const oldChunk = chunks('長い説明です。'.repeat(130))[0];
  f.cache.getOverride = async original => original === line ? '第二行的个人修订' : original === oldChunk ? '长段落的个人修订' : undefined;
  const item = (await f.engine.translate([{ id: 'edited-line', text: source, native: true }])).items[0];
  assert.equal(item.text, '测试中文\n第二行的个人修订\n测试中文'); assert(item.personal); assert.equal(f.calls.length, 2);
  const long = (await f.engine.translate([{ id: 'edited-chunk', text: '長い説明です。'.repeat(130), native: true }])).items[0];
  assert(long.text.startsWith('长段落的个人修订')); assert(long.personal);
  assert(!f.calls.some(call => JSON.parse(call.options.body).messages[1].content === oldChunk), 'A revised old chunk never gets sent to the model again');
});
await check('Literal newline escapes render as line breaks without decoding other escapes or paths', () => {
  assert.equal(normalizeLineBreaks('第一行\\n第二行\\r\\n第三行¥n第四行￥n第五行\r\n第六行'), '第一行\n第二行\n第三行\n第四行\n第五行\n第六行');
  const preserved = 'C:\\new\\notes.txt \\\\network\\readme.txt \\t \\u4e00 1500¥ <b>文字</b> "引号"';
  assert.equal(normalizeLineBreaks(preserved), preserved);
  const tag = '<font value="literal\\nattribute\r\n">文字</font>';
  assert.equal(normalizeLineBreaks(tag), tag, 'Never alter original rich-text attributes');
});
await check('Fresh and cached model translations normalize line breaks while preserving rich-text tags', async () => {
  let calls = 0;
  const f = fixture({ fetchImpl: async () => { calls++; return { ok: true, json: async () => ({ choices: [{ message: { content: '第一行\\n第二行¥n第三行' } }] }) }; } });
  await f.engine.configure(profile);
  const items = [{ id: 'line', text: '<size=30>これは複数行のテストです。</size>' }], expected = '<size=30>第一行\n第二行\n第三行</size>';
  const fresh = await f.engine.translate(items); assert.equal(fresh.items[0].text, expected);
  assert.equal([...f.values.values()][0], '第一行\n第二行\n第三行', 'New automatic cache records store actual line breaks');
  for (const key of f.values.keys()) f.values.set(key, '第一行\\n第二行￥n第三行');
  const cached = await f.engine.translate(items);
  assert.equal(cached.items[0].text, expected); assert(cached.items[0].cached); assert.equal(calls, 1, 'Old escaped cache entries render correctly without another request');
});
await check('Free-provider entities and personal edits use the same newline rendering', async () => {
  const f = fixture({ fetchImpl: async () => ({ ok: true, json: async () => ({ responseStatus: 200, responseData: { translatedText: '第一行&#92;n第二行' } }) }) });
  const items = [{ id: 'line', text: 'これはテストです。' }];
  assert.equal((await f.engine.translate(items)).items[0].text, '第一行\n第二行');
  f.cache.getOverride = async () => '个人第一行\\n个人第二行';
  const edited = await f.engine.translate(items);
  assert(edited.items[0].personal); assert.equal(edited.items[0].text, '个人第一行\n个人第二行');
  assert.equal(await f.cache.getOverride(), '个人第一行\\n个人第二行', 'Rendering must not rewrite saved personal edits');
});
await check('Network limit is two; duplicate texts share a request', async () => {
  let active = 0, peak = 0, calls = 0;
  const f = fixture({ fetchImpl: async () => { active++; peak = Math.max(peak, active); calls++; await new Promise(resolve => setTimeout(resolve, 12)); active--; return { ok: true, json: async () => ({ choices: [{ message: { content: '中文' } }] }) }; } });
  await f.engine.configure(profile);
  await f.engine.translate(Array.from({ length: 8 }, (_, i) => ({ id: String(i), text: 'これはテスト' + i % 4 })));
  assert.equal(peak, 2); assert.equal(calls, 4);
});
await check('Timeout, HTTP failure and reasoning-only response preserve original text and do not cache', async () => {
  for (const fetchImpl of [async () => ({ ok: false, status: 401 }), async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '<think>reasoning</think>' } }] }) }),
    (_url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true }))]) {
    const f = fixture({ fetchImpl, timeoutMs: 12 }); await f.engine.configure(profile); const item = (await f.engine.translate([{ id: '1', text: 'これはテストです。' }])).items[0]; assert(item.error); assert.equal(item.text, 'これはテストです。'); assert.equal(f.values.size, 0);
  }
});
await check('Network, JSON, cache and timeout failures have distinct diagnostics without echoing credentials', async () => {
  const abortingFetch = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('TEST_ONLY_NOT_SECRET', 'AbortError')), { once: true }));
  const cases = [
    { expected: 'NetworkError', overrides: { fetchImpl: async () => { throw new TypeError('TEST_ONLY_NOT_SECRET'); } } },
    { expected: 'ProviderResponseError', overrides: { fetchImpl: async () => ({ ok: true, json: async () => { throw new SyntaxError('TEST_ONLY_NOT_SECRET'); } }) } },
    { expected: 'ProviderResponseError', overrides: { fetchImpl: async () => ({ ok: true, json: async () => null }) } },
    { expected: 'CacheError', overrides: { cache: { get: async () => { throw new DOMException('TEST_ONLY_NOT_SECRET', 'SecurityError'); } } } },
    { expected: 'CacheError', overrides: { cache: { get: async () => undefined, put: async () => { throw new DOMException('TEST_ONLY_NOT_SECRET', 'QuotaExceededError'); } } } },
    { expected: 'RequestTimeout', overrides: { fetchImpl: abortingFetch, timeoutMs: 12 } },
  ];
  for (const { expected, overrides } of cases) {
    const f = fixture(overrides); await f.engine.configure(profile);
    const result = await f.engine.translate([{ id: '1', text: 'これはテストです。' }]);
    assert.equal(result.items[0].error, expected); assert.equal(result.items[0].text, 'これはテストです。');
    assert(!JSON.stringify(result).includes('TEST_ONLY_NOT_SECRET')); assert.equal(f.values.size, 0); assert(result.elapsedMs >= 0);
  }
});
await check('HTTP status diagnostics distinguish authentication, balance, parameters and rate limits', async () => {
  for (const [status, hint] of [[401, '认证失败'], [402, '余额不足'], [422, '参数不合法'], [429, '限流']]) {
    const f = fixture({ fetchImpl: async () => ({ ok: false, status }) }); await f.engine.configure(profile);
    const result = await f.engine.translate([{ id: '1', text: 'これはテストです。' }]);
    assert.equal(result.items[0].error, 'ProviderError'); assert(result.items[0].errorMessage.includes('HTTP ' + status));
    assert(result.items[0].errorMessage.includes(hint)); assert(!JSON.stringify(result).includes('TEST_ONLY_NOT_SECRET'));
  }
});
await check('Connection probe accepts HTTP 401 without credentials or completion calls; permission and network failures remain distinct', async () => {
  const calls = [];
  const f = fixture({ fetchImpl: async (url, options) => { calls.push({ url, options }); return { ok: false, status: 401 }; } });
  await f.engine.configure(profile);
  const result = await f.engine.probe(); assert(result.reachable); assert.equal(result.httpStatus, 401);
  assert.equal(calls.length, 1); assert.equal(calls[0].url, profile.apiBase + '/models'); assert.equal(calls[0].options.method, 'GET');
  assert(!calls[0].options.headers); assert(!calls[0].options.body); assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.redirect, 'error'); assert.equal(f.values.size, 0); assert(!JSON.stringify(calls).includes('TEST_ONLY_NOT_SECRET'));
  const denied = fixture({ permitted: async () => false }); await denied.engine.configure(profile);
  await assert.rejects(() => denied.engine.probe(), error => error.name === 'PermissionRequired'); assert.equal(denied.calls.length, 0);
  const failed = fixture({ fetchImpl: async () => { throw new TypeError('TEST_ONLY_NOT_SECRET'); } }); await failed.engine.configure(profile);
  const unreachable = await failed.engine.probe(); assert.equal(unreachable.reachable, false); assert.equal(unreachable.error, 'NetworkError');
  assert(!JSON.stringify(unreachable).includes('TEST_ONLY_NOT_SECRET'));
});
await check('DeepSeek missing-key check prevents requests; saved key passes through only in the model header', async () => {
  const f = fixture(); await f.engine.configure({ ...profile, apiBase: 'https://api.deepseek.com/v1', apiKey: '' });
  const items = [{ id: '1', text: 'これはテストです。' }];
  assert.equal((await f.engine.translate(items, { fresh: true })).items[0].error, 'MissingApiKey'); assert.equal(f.calls.length, 0);
  await f.engine.configure({ apiKey: 'TEST_ONLY_NOT_SECRET', rememberApiKey: true });
  const reloaded = new TranslationEngine({ ...f.deps, storage: { ...f.storage, session: storageArea() } });
  assert((await reloaded.publicSettings(true)).hasApiKey);
  assert.equal((await reloaded.translate(items, { fresh: true })).items[0].text, '测试中文'); assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].options.headers.Authorization, 'Bearer TEST_ONLY_NOT_SECRET');
});
await check('Explicit tests bypass warm cache and validate the current key; normal game translation keeps using cache', async () => {
  const calls = [];
  const f = fixture({ fetchImpl: async (_url, options) => { calls.push(options.headers.Authorization); return { ok: true, json: async () => ({ choices: [{ message: { content: calls.length === 1 ? '旧译文' : '新译文' } }] }) }; } });
  await f.engine.configure(profile); const items = [{ id: '1', text: 'これはテストです。' }];
  await f.engine.translate(items); await f.engine.configure({ apiKey: 'NEW_TEST_ONLY' });
  assert((await f.engine.translate(items)).items[0].cached); assert.equal(calls.length, 1);
  const test = await f.engine.translate(items, { fresh: true }); assert.equal(test.items[0].text, '新译文'); assert.equal(test.items[0].cached, false);
  assert.deepEqual(calls, ['Bearer TEST_ONLY_NOT_SECRET', 'Bearer NEW_TEST_ONLY']);
});
await check('Request timeout is bounded and public preferences notify the game when it changes', async () => {
  for (const seconds of [4, 91, 5.5, '30', true]) assert.throws(() => validateSettings({ ...DEFAULTS, requestTimeoutSeconds: seconds }));
  const f = fixture(); await f.engine.configure(profile); const before = await f.engine.publicSettings();
  await f.engine.configure({ requestTimeoutSeconds: 60 }); const after = await f.engine.publicSettings();
  assert.equal(after.requestTimeoutSeconds, 60); assert.notEqual(after.providerSignature, before.providerSignature);
  assert.equal((await new TranslationEngine(f.deps).publicSettings()).requestTimeoutSeconds, 60);
});
await check('Personal file rejects malformed entries and changed markup before any import writes', () => {
  const file = translations => ({ format: 'unity-translations', version: 1, translations });
  assert.deepEqual(validateTranslationFile(file({ '設定': '选项设置', '<color=#fff>確認</color>': '<color=#fff>核对</color>' })), [['設定', '选项设置'], ['<color=#fff>確認</color>', '<color=#fff>核对</color>']]);
  for (const data of [[], {}, file([]), file({ '設定': null }), file({ '設定': '' }), file({ '': '中文' }), file({ '設定': '<b>中文</b>' }), file({ '<color=#fff>確認</color>': '核对' })]) assert.throws(() => validateTranslationFile(data));
});
await check('Personal edits outrank provider cache and glossary across services; explicit API test bypasses them and revisions persist', async () => {
  const overrides = new Map(), f = fixture();
  f.cache.getOverride = async source => overrides.get(source); f.cache.overrideOriginals = async () => [...overrides.keys()];
  await f.engine.configure(profile); const source = 'これはテストです。';
  await f.engine.translate([{ id: '1', text: source }]); assert.equal(f.calls.length, 1);
  const before = await f.engine.publicSettings(); overrides.set(source, '我修订的中文'); overrides.set('設定', '选项设置'); overrides.set('謎名称', '未知名称');
  await f.engine.invalidateTranslations(); const after = await f.engine.publicSettings(); assert.notEqual(after.providerSignature, before.providerSignature);
  assert(!Object.hasOwn(after, 'personalTextKeys')); assert(!Object.hasOwn(after, 'uiGlossaryKeys'));
  const edited = await f.engine.translate([{ id: '1', text: source }, { id: '2', text: '<size=20>設定</size>' }]);
  assert.equal(edited.items[0].text, '我修订的中文'); assert(edited.items[0].personal); assert.equal(edited.items[1].text, '<size=20>选项设置</size>'); assert.equal(f.calls.length, 1);
  await f.engine.translate([{ id: '1', text: source }], { fresh: true }); assert.equal(f.calls.length, 2);
  await f.engine.configure({ provider: 'mymemory' }); assert.equal((await f.engine.translate([{ id: '1', text: source }])).items[0].text, '我修订的中文'); assert.equal(f.calls.length, 2);
  const reloaded = new TranslationEngine(f.deps); assert.equal((await reloaded.translate([{ id: '2', text: '設定' }])).items[0].text, '选项设置');
});
await check('New preferences are validated, persistent, and available to game frames without exposing credentials', async () => {
  for (const change of [{ resourceRules: {} }, { resourceRules: [{ url: '/*', fields: [] }] }, { targetLanguage: 'invalid' }, { interfaceLanguage: 'fr' }, { historyMaxEntries: 0 }, { historyMaxEntries: 21 }, { historyEnabled: 'yes' }]) assert.throws(() => validateSettings({ ...DEFAULTS, ...change }));
  const f = fixture(); await f.engine.configure({ targetLanguage: 'en', interfaceLanguage: 'en', historyEnabled: true, historyMaxEntries: 3 });
  const reload = new TranslationEngine(f.deps), settings = await reload.publicSettings();
  assert.equal(settings.targetLanguage, 'en'); assert.equal(settings.interfaceLanguage, 'en'); assert.equal(settings.historyMaxEntries, 3);
  assert(!Object.hasOwn(settings, 'apiKey'));
});
await check('Older minute settings are ignored on reload and save while the saved history count survives', async () => {
  const f = fixture(); await f.engine.ready;
  f.storage.local.data.settings = { ...DEFAULTS, historyEnabled: true, historyMinutes: 0, historyMaxEntries: 7 };
  const reload = new TranslationEngine(f.deps);
  assert.equal((await reload.publicSettings()).historyMaxEntries, 7);
  assert(!Object.hasOwn(await reload.publicSettings(true), 'historyMinutes'));
  await reload.configure({ historyMinutes: 1, historyMaxEntries: 3 });
  assert.equal(f.storage.local.data.settings.historyMaxEntries, 3);
  assert(!Object.hasOwn(f.storage.local.data.settings, 'historyMinutes'));
});
await check('MyMemory sends the selected language pair and language changes do not reuse another language cache', async () => {
  const calls = [], f = fixture({ fetchImpl: async url => { calls.push(url); const en = new URL(url).searchParams.get('langpair') === 'ja|en'; return { ok: true, json: async () => ({ responseStatus: 200, responseData: { translatedText: en ? 'Are you okay?' : '你没事吧？' } }) }; } });
  const items = [{ id: '1', text: '大丈夫ですか？' }];
  assert.equal((await f.engine.translate(items)).items[0].text, '你没事吧？');
  await f.engine.configure({ targetLanguage: 'en', historyEnabled: true });
  assert.equal((await f.engine.translate(items)).items[0].text, 'Are you okay?'); assert.equal(new URL(calls[1]).searchParams.get('langpair'), 'ja|en');
  assert(!calls[1].includes('reference')); await f.engine.configure({ targetLanguage: 'zh-CN' });
  assert((await f.engine.translate(items)).items[0].cached); assert.equal(calls.length, 2);
});
await check('Model target language changes prompt and known Han-only menus are not replaced by the Chinese glossary', async () => {
  const f = fixture({ fetchImpl: async (_url, options) => { f.calls.push({ options }); return { ok: true, json: async () => ({ choices: [{ message: { content: 'Settings' } }] }) }; } });
  await f.engine.configure({ ...profile, targetLanguage: 'en' });
  assert.equal((await f.engine.translate([{ id: '1', text: '<b>設定</b>' }])).items[0].text, '<b>Settings</b>');
  assert.match(JSON.parse(f.calls[0].options.body).messages[0].content, /English/);
  const signature = (await f.engine.publicSettings()).providerSignature;
  await f.engine.configure({ interfaceLanguage: 'en' }); assert.equal((await f.engine.publicSettings()).providerSignature, signature);
  assert((await f.engine.translate([{ id: '1', text: '<b>設定</b>' }])).items[0].cached); assert.equal(f.calls.length, 1);
});
await check('History selects the latest count without time expiry; disabled, interface and fresh test requests carry no reference', async () => {
  const history = [{ speaker: '過去', text: '古い話', at: Date.now() - 86400000 }, { speaker: 'アリス', text: 'あの門です。', translation: 'That gate.' }, { text: '' }];
  const f = fixture(); await f.engine.configure({ ...profile, uiEnabled: true, historyEnabled: true, historyMaxEntries: 1 });
  const item = { id: '1', text: 'そこへ行きます。', kind: 'story', speaker: 'ボブ', history };
  await f.engine.translate([item]); const content = JSON.parse(JSON.parse(f.calls[0].options.body).messages[1].content);
  assert.equal(content.currentSpeaker, 'ボブ'); assert.equal(content.currentText, item.text); assert.deepEqual(content.referenceDialogue, [{ speaker: 'アリス', text: 'あの門です。', translation: 'That gate.' }]);
  await f.engine.translate([{ ...item, text: 'メニューです。', kind: 'ui' }]); assert.equal(JSON.parse(f.calls[1].options.body).messages[1].content, 'メニューです。');
  await f.engine.translate([item], { fresh: true }); assert.equal(JSON.parse(f.calls[2].options.body).messages[1].content, item.text);
  await f.engine.configure({ historyEnabled: false }); await f.engine.translate([item]); assert.equal(JSON.parse(f.calls[3].options.body).messages[1].content, item.text);
  await f.engine.configure({ historyEnabled: true, historyMaxEntries: 2 }); await f.engine.translate([item]);
  const retained = JSON.parse(JSON.parse(f.calls[4].options.body).messages[1].content).referenceDialogue;
  assert.deepEqual(retained, [{ speaker: '過去', text: '古い話', translation: '' }, { speaker: 'アリス', text: 'あの門です。', translation: 'That gate.' }]);
});
await check('Different dialogue reference does not collide in cache; large history is bounded', async () => {
  const f = fixture(); await f.engine.configure({ ...profile, historyEnabled: true });
  const item = { id: '1', kind: 'story', text: 'それです。', history: [{ speaker: 'アリス', text: '門です。', at: Date.now() - 1000 }] };
  await f.engine.translate([item]); await f.engine.translate([item]); assert.equal(f.calls.length, 1);
  await f.engine.translate([{ ...item, history: [{ speaker: 'ボブ', text: '剣です。', at: Date.now() - 1000 }] }]); assert.equal(f.calls.length, 2);
  const bounded = normalizeHistory(Array.from({ length: 200 }, () => ({ speaker: 'あ'.repeat(1000), text: 'あ'.repeat(10000), translation: 'b'.repeat(10000), at: Date.now() - 1000 })), { ...DEFAULTS, provider: 'openai', historyEnabled: true, historyMaxEntries: 20 });
  assert(JSON.stringify(bounded).length < 12200); assert(bounded.every(row => row.speaker.length <= 150 && row.text.length <= 2000 && row.translation.length <= 2500));
});
await check('Every UI message has Chinese and English text; validation and HTTP diagnostics localize', async () => {
  for (const [key, message] of Object.entries(messages)) { assert(message['zh-CN']); assert(message.en); assert.equal(typeof t(key, {}, 'en'), 'string'); }
  assert.equal(localizeError('提前翻译句数须为 0 到 20 的整数', 'en'), 'Pretranslation count must be an integer from 0 to 20');
  assert.equal(localizeError('HTTP 401：API 密钥认证失败，请重新填写密钥', 'en'), 'HTTP 401: API authentication failed; re-enter the key');
  assert.match(localizeError('翻译请求超时（30 秒），可开启禁止思考或增大请求超时', 'en'), /timed out \(30 seconds\)/);
  const html = await fs.readFile(new URL('../extension/options.html', import.meta.url), 'utf8');
  for (const match of html.matchAll(/data-i18n(?:-placeholder|-label)?="([^"]+)"/g)) assert(Object.hasOwn(messages, match[1]), match[1]);
  assert(!html.includes('翻译请求由扩展后台直接发送，无需本机中转服务。'));
  assert(!html.includes('historyMinutes')); assert(!Object.hasOwn(messages, 'historyMinutes'));
  assert.match(html, /id="historyMaxEntries"/);
});
await fs.writeFile(new URL('../.test-output/engine.json', import.meta.url), JSON.stringify({ passed: results.length, total: results.length, results,
  evidenceBoundary: 'Standalone translation engine with mocked storage, permissions and network; native runtime is verified separately. No real extension installation or paid model calls.' }, null, 2) + '\n');
console.log(JSON.stringify({ passed: results.length, total: results.length }));
