import { pageScope } from './core.mjs';
export function webOrigin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('请选择 HTTP(S) 网页');
  return url.origin;
}
export function sitePattern(origin) { return webOrigin(origin) + '/*'; }
export const SCRIPT_IDS = ['unity-web-bridge', 'unity-web-runtime'];
export function contentScripts(origins) {
  const matches = [...new Set(origins.map(sitePattern))];
  if (!matches.length) return [];
  return [
    { id: SCRIPT_IDS[0], matches, js: ['bridge.js'], runAt: 'document_start', allFrames: true, world: 'ISOLATED', persistAcrossSessions: true },
    { id: SCRIPT_IDS[1], matches, js: ['native-resources.js', 'native-xhr.js', 'native-wasm.js', 'native-discovery.js', 'native-profiles.js', 'native-font.js', 'native-labels.js', 'bootstrap.js', 'runtime.js'], runAt: 'document_start', allFrames: true, world: 'MAIN', persistAcrossSessions: true },
  ];
}
export function createSiteAccess(api) {
  let queue = Promise.resolve();
  const serial = run => { const next = queue.then(run); queue = next.catch(() => {}); return next; };
  async function saved() {
    const { enabledOrigins = [] } = await api.storage.local.get(['enabledOrigins']);
    if (!Array.isArray(enabledOrigins)) return [];
    return [...new Set(enabledOrigins.flatMap(value => { try { return [webOrigin(value)]; } catch { return []; } }))];
  }
  async function active() { return (await Promise.all((await saved()).map(async origin => await api.permissions.contains({ origins: [sitePattern(origin)] }) ? origin : null))).filter(Boolean); }
  async function synchronize() {
    const desired = contentScripts(await active()), existing = await api.scripting.getRegisteredContentScripts({ ids: SCRIPT_IDS });
    if (!desired.length) { if (existing.length) await api.scripting.unregisterContentScripts({ ids: existing.map(script => script.id) }); return; }
    const ids = new Set(existing.map(script => script.id));
    const updating = desired.filter(script => ids.has(script.id)), registering = desired.filter(script => !ids.has(script.id));
    if (updating.length) await api.scripting.updateContentScripts(updating);
    if (registering.length) await api.scripting.registerContentScripts(registering);
  }
  async function frames(tabId) {
    if (!Number.isInteger(tabId) || tabId < 0) throw new Error('无法读取当前网页');
    return (await api.webNavigation.getAllFrames({ tabId }) || []).flatMap(frame => {
      try { return [{ frameId: frame.frameId, origin: webOrigin(frame.url), scope: pageScope(frame.url) }]; } catch { return []; }
    });
  }
  async function inject(tabId) {
    const enabled = new Set(await active()), frameIds = (await frames(tabId)).filter(frame => enabled.has(frame.origin)).map(frame => frame.frameId);
    if (!frameIds.length) return;
    await api.scripting.executeScript({ target: { tabId, frameIds }, files: ['bridge.js'], world: 'ISOLATED' });
    await api.scripting.executeScript({ target: { tabId, frameIds }, files: ['native-resources.js', 'native-xhr.js', 'native-wasm.js', 'native-discovery.js', 'native-profiles.js', 'native-font.js', 'native-labels.js', 'bootstrap.js', 'runtime.js'], world: 'MAIN' });
  }
  const ready = serial(synchronize);
  return {
    ready, active, synchronize: () => serial(synchronize),
    async scope(tabId) { return (await frames(tabId)).find(frame => frame.frameId === 0)?.scope || null; },
    async broadcastPreferences(preferences) {
      const enabled = new Set(await active());
      if (!enabled.size) return;
      const tabs = await api.tabs.query({});
      await Promise.allSettled(tabs.filter(tab => Number.isInteger(tab.id)).map(async tab => {
        const rows = await frames(tab.id), frameIds = rows.filter(frame => enabled.has(frame.origin)).map(frame => frame.frameId);
        const prefs = typeof preferences === 'function' ? await preferences(tab.id, rows.find(frame => frame.frameId === 0)?.scope || null) : preferences;
        if (frameIds.length) await api.scripting.executeScript({ target: { tabId: tab.id, frameIds }, world: 'MAIN',
          func: prefs => window.__UnityWebTranslator?.applyPreferences?.(prefs), args: [prefs] });
      }));
    },
    async context() {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      if (!Number.isInteger(tab?.id)) throw new Error('无法读取当前网页');
      const enabled = new Set(await active()), rows = await frames(tab.id), origins = [...new Set(rows.map(frame => frame.origin))];
      return { tabId: tab.id, scope: rows.find(frame => frame.frameId === 0)?.scope || null, origins: origins.map(origin => ({ origin, enabled: enabled.has(origin) })) };
    },
    async enable(origins, tabId) {
      if (!Array.isArray(origins) || !origins.length || origins.length > 20) throw new Error('请选择要启用的网页域名');
      const values = [...new Set(origins.map(webOrigin))], current = new Set((await frames(tabId)).map(frame => frame.origin));
      if (values.some(origin => !current.has(origin))) throw new Error('网页已变化，请重新打开扩展');
      for (const origin of values) if (!await api.permissions.contains({ origins: [sitePattern(origin)] })) throw new Error('需要允许扩展访问所选网页');
      await serial(async () => { await api.storage.local.set({ enabledOrigins: [...new Set([...await saved(), ...values])] }); await synchronize(); });
      // Already-loaded Unity resources cannot be replaced retroactively.
      let needsRefresh = true;
      try { await inject(tabId); } catch { needsRefresh = true; }
      return { enabled: true, needsRefresh };
    },
    async disable(origins, tabId) {
      if (!Array.isArray(origins) || origins.length > 20) throw new Error('请选择要停用的网页域名');
      const removing = new Set(origins.map(webOrigin)), frameIds = (await frames(tabId)).filter(frame => removing.has(frame.origin)).map(frame => frame.frameId);
      await serial(async () => { await api.storage.local.set({ enabledOrigins: (await saved()).filter(origin => !removing.has(origin)) }); await synchronize(); });
      if (frameIds.length) try { await api.scripting.executeScript({ target: { tabId, frameIds }, world: 'MAIN', func: () => window.__UnityWebTranslator?.uninstall() }); } catch { /* A navigated document will use the updated site policy. */ }
      return { enabled: false };
    },
  };
}
