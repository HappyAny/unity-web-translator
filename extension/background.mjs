import { ProfileManager } from './profiles.mjs';
import { validateItems } from './engine.mjs';
import { apiPermissionPattern } from './core.mjs';
import { createSiteAccess } from './site-access.mjs';
import glossary from './glossary.mjs';
import { createFontReader } from './native-font.mjs';
const nativeFont = createFontReader({ url: chrome.runtime.getURL('fonts/cjk-fallback.ttf') });
const secureStorage = Promise.all(['local', 'session'].map(area => chrome.storage[area].setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })));
const sites = createSiteAccess(chrome);
const profiles = new ProfileManager({ storage: chrome.storage, indexedDB, glossary,
  permitted: base => chrome.permissions.contains({ origins: [apiPermissionPattern(base)] }) });
const runtimeReports = new Map();
function runtimeReport(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid runtime report');
  const result = {};
  for (const key of ['requests', 'matchedResources', 'selectedStrings', 'translatedStrings', 'bridgeCalls', 'failures', 'opaqueRequests', 'earlyResources', 'configuredRules']) {
    if (!Number.isSafeInteger(payload[key]) || payload[key] < 0 || payload[key] > 1000000) throw new Error('Invalid runtime report');
    result[key] = payload[key];
  }
  result.version = typeof payload.version === 'string' && /^\d+\.\d+\.\d+$/.test(payload.version) ? payload.version : '';
  result.unityDetected = payload.unityDetected === true; result.lateInjection = payload.lateInjection === true;
  result.wasmStatus = ['waiting', 'ready', 'failed'].includes(payload.wasmStatus) ? payload.wasmStatus : 'waiting';
  result.nativeLabelCalls = Number.isSafeInteger(payload.nativeLabelCalls) && payload.nativeLabelCalls >= 0 ? Math.min(1000000, payload.nativeLabelCalls) : 0;
  result.fontStatus = ['waiting', 'loading', 'available', 'ready', 'failed'].includes(payload.fontStatus) ? payload.fontStatus : 'waiting';
  result.nativeStoryCalls = Number.isSafeInteger(payload.nativeStoryCalls) && payload.nativeStoryCalls >= 0 ? Math.min(1000000, payload.nativeStoryCalls) : 0;
  result.paths = Array.isArray(payload.paths) ? payload.paths.slice(-12).filter(path => typeof path === 'string' && path.startsWith('/') && path.length <= 180 && !/[?#\r\n\0]/.test(path)) : [];
  return result;
}
export function senderKind(sender, extensionId, enabledOrigins = []) {
  if (sender.id !== extensionId) return null;
  try {
    const url = new URL(sender.url || '');
    if (url.protocol === 'chrome-extension:' && url.hostname === extensionId && ['/options.html', '/popup.html', '/update.html'].includes(url.pathname)) return 'settings';
    if (['https:', 'http:'].includes(url.protocol) && enabledOrigins.includes(url.origin) && sender.tab) return 'page';
  } catch { /* Invalid URLs have no authority. */ }
  return null;
}
async function pageProfile(tabId) { const scope = await sites.scope(tabId); return { scope, binding: await profiles.binding(scope) }; }
const broadcast = () => sites.broadcastPreferences((_tabId, scope) => profiles.pageView(scope));
async function handle(message, sender) {
  await secureStorage; await sites.ready; await profiles.ready;
  const kind = senderKind(sender, chrome.runtime.id, await sites.active());
  if (!kind || !message || typeof message !== 'object') throw new Error('消息来源不合法');
  const { action, payload } = message;
  let context;
  const currentPage = async () => { if (!context) context = kind === 'page' ? { tabId: sender.tab.id, ...await pageProfile(sender.tab.id) } : await sites.context(); return context; };
  const selectedProfile = async () => {
    if (kind === 'page') return (await currentPage()).binding?.id;
    if (typeof message.profileId === 'string') { profiles.require(message.profileId); return message.profileId; }
    if (new URL(sender.url).pathname === '/popup.html') return (await profiles.binding((await currentPage()).scope))?.id;
    return profiles.registry.editorId;
  };
  if (action === 'getPreferences') {
    if (kind === 'page' || (new URL(sender.url).pathname === '/popup.html' && !message.profileId)) return profiles.pageView((await currentPage()).scope);
    return profiles.view(await selectedProfile());
  }
  if (action === 'getNativeFont' && kind === 'page') {
    const page = await currentPage();
    if (!page.binding) throw new Error('Select a Profile before loading the native font');
    return nativeFont(payload);
  }
  if (action === 'setPreferences' && kind === 'settings') {
    const result = await profiles.configure(await selectedProfile(), payload, true); await broadcast(); return result;
  }
  if (action === 'translate' && kind === 'page') {
    validateItems(payload?.items);
    const page = await currentPage();
    if (!page.binding) return { items: (payload?.items || []).map(({ id, text }) => ({ id, text })), profileRequired: true, elapsedMs: 0 };
    const engine = await profiles.get(page.binding.id), providerRevision = engine.providerRevision;
    const response = await engine.translate(payload?.items);
    const live = await pageProfile(sender.tab.id);
    if (live.scope !== page.scope || live.binding?.revision !== page.binding.revision || engine.providerRevision !== providerRevision || profiles.shared.paused || payload.items.some(item => item.kind === 'ui' ? !profiles.shared.uiEnabled : item.kind !== undefined && !profiles.shared.storyEnabled)) return {
      items: payload.items.map(({ id, text }) => ({ id, text })), profileChanged: true, paused: profiles.shared.paused, elapsedMs: response.elapsedMs };
    return { ...response, profileId: page.binding.id, items: response.items.map(({ errorMessage, ...item }) => item) };
  }
  if (action === 'reportRuntime' && kind === 'page') {
    const page = await currentPage(), key = sender.tab.id + ':' + (sender.frameId || 0);
    runtimeReports.delete(key);
    runtimeReports.set(key, { ...runtimeReport(payload), tabId: sender.tab.id, frameId: sender.frameId || 0,
      origin: new URL(sender.url).origin, scope: page.scope, profileId: page.binding?.id || null, updatedAt: Date.now() });
    if (runtimeReports.size > 128) runtimeReports.delete(runtimeReports.keys().next().value);
    return {};
  }
  if (action === 'openOptions' && kind === 'page') { await chrome.runtime.openOptionsPage(); return {}; }
  if (kind !== 'settings') throw new Error('此操作只能在扩展设置中执行');
  if (action === 'getRuntimeStatus') {
    const page = await currentPage(), binding = await profiles.binding(page.scope), enabled = new Set(await sites.active());
    return { reports: [...runtimeReports.values()].filter(row => row.tabId === page.tabId && row.scope === page.scope && row.profileId === (binding?.id || null) && enabled.has(row.origin) && Date.now() - row.updatedAt < 120000) };
  }
  if (action === 'getProfiles') return profiles.list();
  if (action === 'getSharedSettings') return profiles.sharedView(true);
  if (action === 'setSharedSettings') {
    const result = await profiles.configure(null, payload); await broadcast(); return result;
  }
  if (action === 'setProfileSettings') {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).some(key => !['customPrompt', 'resourceRules'].includes(key))) throw new Error('Profile 只保存文本规则与额外 Prompt，翻译服务和语言请在共用设置中修改');
    const id = await selectedProfile(); if (!id) throw new Error('请选择有效的 Profile');
    const result = await profiles.configure(id, payload); await broadcast(); return result;
  }
  if (action === 'createProfile') return profiles.create(payload);
  if (action === 'selectEditorProfile') return profiles.selectEditor(payload?.id);
  if (action === 'renameProfile') { const result = await profiles.rename(await selectedProfile(), payload?.name); await broadcast(); return result; }
  if (action === 'getPageContext') {
    const page = await currentPage(), binding = await profiles.binding(page.scope); return { ...page, profileId: binding?.id || null };
  }
  if (action === 'bindPageProfile') {
    const scope = await sites.scope(payload?.tabId);
    if (!scope || scope !== payload?.scope) throw new Error('网页已变化，请重新打开扩展');
    const result = await profiles.bind(scope, payload?.id || null); await broadcast(); return result;
  }
  if (action === 'enableSites') { const result = await sites.enable(payload?.origins, payload?.tabId); await broadcast(); return result; }
  if (action === 'disableSites') return sites.disable(payload?.origins, payload?.tabId);
  const id = await selectedProfile();
  if (!id) throw new Error('请先为当前网页选择 Profile');
  if (action === 'getSettings') return profiles.view(id, true);
  if (action === 'setSettings') {
    const result = await profiles.configure(id, payload); await broadcast(); return result;
  }
  const engine = await profiles.get(id), cache = engine.cache, language = engine.settings.targetLanguage;
  if (['exportTranslations', 'importTranslations', 'getPersonalTranslation', 'setPersonalTranslation', 'removePersonalTranslation'].includes(action) && message.targetLanguage && message.targetLanguage !== language) throw new Error('Profile 或目标语言已变化，请重新操作');
  if (action === 'test') return engine.translate([{ id: 'test', text: '「お父さん、大丈夫ですか？」' }], { fresh: true });
  if (action === 'probe') return engine.probe();
  if (action === 'getCacheStats') return { ...await cache.stats(language), targetLanguage: language, profileId: id, profileName: profiles.require(id).name };
  if (action === 'exportTranslations') return { ...await cache.exportFile(language), profileId: id, profileName: profiles.require(id).name };
  const invalidate = async () => { await profiles.invalidate(id); await broadcast(); };
  if (action === 'importTranslations') { if ((payload?.targetLanguage || 'zh-CN') !== language) throw new Error('译文文件的语言与当前目标语言不同，请切换目标语言后再导入'); const imported = await cache.importFile(payload); await invalidate(); return { imported }; }
  if (action === 'getPersonalTranslation') { if (typeof payload?.original !== 'string' || !payload.original.trim()) throw new Error('请填写原文'); return { translation: await cache.getOverride(payload.original, language) || '' }; }
  if (action === 'setPersonalTranslation') { if (typeof payload?.original !== 'string' || !payload.original.trim()) throw new Error('请填写原文'); await cache.importFile({ format: 'unity-translations', version: 1, targetLanguage: language, translations: { [payload.original]: payload.translation } }); await invalidate(); return {}; }
  if (action === 'removePersonalTranslation') { if (typeof payload?.original !== 'string' || !payload.original.trim()) throw new Error('请填写原文'); await cache.removeOverride(payload.original, language); await invalidate(); return {}; }
  if (action === 'clearCache') { await profiles.invalidate(id); await cache.clear(); await broadcast(); return {}; }
  throw new Error('不支持的扩展操作');
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handle(message, sender).then(data => sendResponse({ ok: true, data }), error => sendResponse({ ok: false, error: error.message }));
  return true;
});
chrome.permissions.onRemoved.addListener(() => { sites.synchronize().catch(() => {}); });
chrome.runtime.onStartup.addListener(() => { sites.synchronize().catch(() => {}); });
