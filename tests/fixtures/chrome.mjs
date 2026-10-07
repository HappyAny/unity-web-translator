export function area(initial = {}) {
  const data = structuredClone(initial);
  return { data, async get(keys) { return Object.fromEntries(keys.filter(key => Object.hasOwn(data, key)).map(key => [key, structuredClone(data[key])])); },
    async set(values) { Object.assign(data, structuredClone(values)); }, async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key]; }, async setAccessLevel() {} };
}
function event() { const listeners = []; return { listeners, addListener(fn) { listeners.push(fn); } }; }
export function chromeFixture() {
  const grants = new Set(), registered = new Map(), injected = [], frames = [{ frameId: 0, url: 'https://canvas.example.test/view' }, { frameId: 1, url: 'https://content.example.test/client' }, { frameId: 2, url: 'https://unselected.example.test/info' }];
  const chrome = {
    storage: { local: area(), session: area() },
    runtime: { id: 'test-extension', onMessage: event(), onStartup: event(), openOptionsPage: async () => {} },
    tabs: { query: async () => [{ id: 1 }] }, webNavigation: { getAllFrames: async () => frames },
    permissions: { contains: async ({ origins }) => origins.every(origin => grants.has(origin)), onRemoved: event() },
    scripting: {
      async getRegisteredContentScripts({ ids }) { return [...registered.values()].filter(script => ids.includes(script.id)); },
      async registerContentScripts(scripts) { for (const script of scripts) { if (registered.has(script.id)) throw new Error('duplicate script'); registered.set(script.id, structuredClone(script)); } },
      async updateContentScripts(scripts) { for (const script of scripts) { if (!registered.has(script.id)) throw new Error('missing script'); registered.set(script.id, structuredClone(script)); } },
      async unregisterContentScripts({ ids }) { ids.forEach(id => registered.delete(id)); },
      async executeScript(value) { injected.push(value); },
    },
  };
  return { chrome, grants, registered, injected, frames };
}
