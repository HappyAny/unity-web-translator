// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
(function () {
  'use strict';
  if (window.__UnityWebTranslator) { window.__UnityWebTranslator.synchronize(); return; }
  const resources = globalThis.__UnityTextResources, xhrAdapter = globalThis.__UnityTextXHR;
  if (!resources || !xhrAdapter) return;
  const channel = 'unity-web-translator-v1', responseEvent = channel + '-response', nativeFetch = window.fetch, NativeXHR = window.XMLHttpRequest;
  const pending = new Map(), held = new Set(), bindings = new Map();
  let prefs = { profileRequired: true, storyEnabled: false, uiEnabled: false, paused: true, resourceRules: [] }, rules = [], disposed = false;
  let sequence = 0, epoch = 0, scene = '', history = [], lastSignature = '', synchronizing, nativeLabels, disposeWasm;
  const stats = { version: '0.2.11', unityDetected: false, lateInjection: document.readyState !== 'loading', requests: 0,
    matchedResources: 0, selectedStrings: 0, translatedStrings: 0, bridgeCalls: 0, failures: 0, opaqueRequests: 0, earlyResources: 0, paths: [] };
  stats.wasmStatus = 'waiting'; stats.nativeLabelCalls = 0; stats.nativeStoryCalls = 0; stats.fontStatus = 'waiting';
  const enabled = kind => !disposed && !prefs.profileRequired && !prefs.paused && (kind === 'ui' ? prefs.uiEnabled : prefs.storyEnabled);
  const signature = value => JSON.stringify([value.profileId, value.revision, value.providerSignature, value.paused,
    value.storyEnabled, value.uiEnabled, value.historyEnabled, value.historyMaxEntries, value.resourceRules]);
  function transport(action, payload, timeout = 10000) {
    if (disposed || pending.size >= 8) return Promise.reject(new Error('Translation bridge unavailable'));
    const id = 'u' + Date.now().toString(36) + '-' + (++sequence);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Translation bridge timeout')); }, timeout);
      pending.set(id, { resolve, reject, timer });
      window.dispatchEvent(new CustomEvent(channel + '-request', { detail: JSON.stringify({ channel, direction: 'request', id, action, payload }) }));
    });
  }
  function receive(event) {
    if (event.target !== window || typeof event.detail !== 'string' || event.detail.length > 200000) return;
    let message; try { message = JSON.parse(event.detail); } catch { return; }
    if (message?.channel !== channel || message.direction !== 'response') return;
    const entry = pending.get(message.id); if (!entry) return;
    pending.delete(message.id); clearTimeout(entry.timer);
    if (message.ok) entry.resolve(message.data); else entry.reject(new Error('Translation extension unavailable'));
  }
  window.addEventListener(responseEvent, receive);
  function detectUnity() {
    try { stats.unityDetected = !!document.querySelector('#unity-canvas') || [...document.querySelectorAll('script')].some(script => /(?:UnityLoader|createUnityInstance|\.framework\.js|\.loader\.js)/.test(script.getAttribute('src') || script.textContent || '')); } catch { /* Detection does not authorize translation. */ }
  }
  function observe(url, contentType = '') {
    stats.requests++;
    if (/wasm|octet-stream|unityweb/i.test(contentType) || /\.(?:wasm|data|bundle|unityweb)(?:\.(?:br|gz))?(?:[?#]|$)/i.test(url)) stats.opaqueRequests++;
    try {
      const path = new URL(url, location.href).pathname.replace(/[A-Za-z0-9_-]{40,}/g, '[id]').slice(0, 180);
      if (!stats.paths.includes(path)) { stats.paths.push(path); if (stats.paths.length > 12) stats.paths.shift(); }
    } catch { /* Do not retain malformed URLs. */ }
  }
  function applyPreferences(value) {
    if (!value || typeof value !== 'object' || disposed) return;
    const next = signature(value), changed = next !== lastSignature;
    const contextChanged = value.profileId !== prefs.profileId || value.providerSignature !== prefs.providerSignature || value.targetLanguage !== prefs.targetLanguage;
    prefs = value; lastSignature = next;
    try { rules = resources.validateRules(value.resourceRules || []); } catch { rules = []; }
    if (!value.historyEnabled || contextChanged) history = [];
    if (changed) {
      nativeLabels?.invalidate();
      epoch++; for (const cancel of held) cancel();
      for (const binding of bindings.values()) { binding.generation++; try { binding.apply(binding.original); } catch { /* The owning game may have disposed its label. */ } }
      if (!value.paused && !value.profileRequired) for (const binding of bindings.values()) render(binding, false);
    }
  }
  function synchronize() {
    if (synchronizing || disposed) return synchronizing;
    synchronizing = transport('getPreferences').then(applyPreferences).catch(() => {}).finally(() => { synchronizing = null; }); return synchronizing;
  }
  function plan(meta) {
    observe(meta.url, meta.contentType);
    if (!prefs.profileId) { stats.earlyResources++; return null; }
    if (meta.method !== 'GET' || meta.async === false || meta.body != null || meta.status < 200 || meta.status >= 300 || [204, 205, 206].includes(meta.status) || disposed || prefs.paused || prefs.profileRequired) return null;
    const length = Number(meta.contentLength || 0);
    if (length > resources.limits.bytes || /(?:charset\s*=\s*[^;]*?(?:utf-16|utf-32)|image\/|audio\/|video\/|wasm)/i.test(meta.contentType)) return null;
    let path; try { path = new URL(meta.url, location.href).pathname; } catch { return null; }
    if (!/(?:application|text)\/(?:[\w.-]+\+)?json\b/i.test(meta.contentType) && !/\.json$/i.test(path)) return null;
    const fields = rules.filter(rule => resources.matches(rule.url, meta.url, location.href)).flatMap(rule => rule.fields).filter(field => enabled(field.kind));
    if (!fields.length) return null;
    return { fields, epoch, profileId: prefs.profileId };
  }
  async function bounded(work, milliseconds, signal) {
    let cancel, timer, abort;
    const canceled = new Promise((resolve, reject) => {
      cancel = () => resolve(null); timer = setTimeout(cancel, milliseconds); held.add(cancel);
      if (signal) { abort = () => reject(new DOMException('The operation was aborted', 'AbortError')); signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort(); }
    });
    try { return await Promise.race([Promise.resolve().then(work), canceled]); }
    finally { clearTimeout(timer); held.delete(cancel); if (abort) signal.removeEventListener('abort', abort); }
  }
  async function transform(raw, candidate, signal) {
    if (candidate.epoch !== epoch || disposed || prefs.paused) return null;
    stats.matchedResources++;
    let result;
    try {
      result = await bounded(() => resources.translateJson(raw, candidate.fields, async items => {
        if (candidate.epoch !== epoch || disposed || prefs.paused) return { items };
        const data = await transport('translate', { items }, Math.min(90000, (prefs.requestTimeoutSeconds || 30) * 1000) + 1000);
        return data?.profileId === candidate.profileId ? data : { items };
      }),
        Math.min(15000, (prefs.requestTimeoutSeconds || 30) * 1000), signal);
    } catch (error) { if (error?.name === 'AbortError') throw error; stats.failures++; return null; }
    if (!result || candidate.epoch !== epoch || disposed || prefs.paused) { stats.failures++; return null; }
    stats.selectedStrings += result.selected; stats.translatedStrings += result.changed; return result;
  }
  async function readBounded(response) {
    const clone = response.clone(), reader = clone.body?.getReader();
    if (!reader) return '';
    let size = 0; const chunks = [];
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > resources.limits.bytes) throw new Error('Text resource too large');
        chunks.push(value);
      }
      const data = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }
      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(data);
    } finally { reader.cancel().catch(() => {}); }
  }
  function responseMetadata(next, original) {
    Object.defineProperties(next, { url: { value: original.url }, redirected: { value: original.redirected }, type: { value: original.type },
      clone: { value: function () { return responseMetadata(Response.prototype.clone.call(this), original); } } });
    return next;
  }
  async function wrappedFetch(input, init) {
    const response = await nativeFetch.call(window, input, init);
    if (disposed) return response;
    const url = response.url || (typeof input === 'string' || input instanceof URL ? String(input) : input?.url || '');
    const candidate = plan({ method: String(init?.method || input?.method || 'GET').toUpperCase(), url,
      status: response.status, contentType: response.headers.get('Content-Type') || '', contentLength: response.headers.get('Content-Length'), body: init?.body });
    if (!candidate || response.type === 'opaque') return response;
    const signal = init?.signal || input?.signal;
    let result;
    try {
      result = await bounded(async () => transform(await readBounded(response), candidate, signal), Math.min(15000, (prefs.requestTimeoutSeconds || 30) * 1000), signal);
    } catch (error) { if (error?.name === 'AbortError') throw error; stats.failures++; return response; }
    if (!result?.changed || candidate.epoch !== epoch || disposed || prefs.paused) return response;
    const headers = new Headers(response.headers);
    for (const name of ['Content-Length', 'Content-Encoding', 'Content-MD5', 'Digest', 'ETag']) headers.delete(name);
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return responseMetadata(new Response(result.text, { status: response.status, statusText: response.statusText, headers }), response);
  }
  async function translate(text, options = {}) {
    const kind = ['story', 'name', 'ui'].includes(options.kind) ? options.kind : 'story';
    if (typeof text !== 'string' || !text.trim() || text.length > 2000 || !enabled(kind)) return text;
    stats.bridgeCalls++;
    if (kind === 'story' && typeof options.scene === 'string' && options.scene.slice(0, 128) !== scene) { scene = options.scene.slice(0, 128); history = []; }
    const version = epoch, profileId = prefs.profileId, speaker = typeof options.speaker === 'string' ? options.speaker.slice(0, 150) : '';
    const reference = kind === 'story' && prefs.historyEnabled ? history.slice(-Math.min(20, prefs.historyMaxEntries || 10)).map(row => ({ ...row })) : [];
    let result = text;
    try {
      const data = await transport('translate', { items: [{ id: 'current', text, kind, speaker, history: reference, native: true }] }, (prefs.requestTimeoutSeconds || 30) * 1000 + 1000);
      const item = data?.items?.find(row => row.id === 'current');
      if (version !== epoch || !enabled(kind) || data?.profileId !== profileId) return text;
      if (typeof item?.text === 'string' && !item.error) result = item.text; else stats.failures++;
    } catch { stats.failures++; }
    if (version !== epoch || !enabled(kind)) return text;
    if (result !== text) stats.translatedStrings++;
    if (kind === 'story' && prefs.historyEnabled && options.recordHistory === true) {
      history.push({ speaker, text, translation: result }); history = history.slice(-Math.min(20, prefs.historyMaxEntries || 10));
    }
    return result;
  }
  async function loadFont() {
    let result;
    for (let offset = 0; ; offset += 65536) {
      const chunk = await transport('getNativeFont', { offset });
      if (chunk?.offset !== offset || !Number.isInteger(chunk.total) || chunk.total < 1000 || chunk.total > 12000000 || typeof chunk.data !== 'string' || chunk.data.length > 88000) throw new Error('Invalid font response');
      result ||= new Uint8Array(chunk.total);
      const binary = atob(chunk.data);
      if (chunk.total !== result.length || binary.length !== Math.min(65536, result.length - offset)) throw new Error('Invalid font chunk size');
      for (let i = 0; i < binary.length; i++) result[offset + i] = binary.charCodeAt(i);
      if (offset + binary.length === result.length) return result;
    }
  }
  function render(binding, recordHistory = true) {
    const generation = binding.generation;
    translate(binding.original, { ...binding.options, recordHistory: false }).then(text => {
      if (bindings.get(binding.id) === binding && binding.generation === generation && !disposed) try {
        binding.apply(text);
        if (recordHistory && (binding.options.kind || 'story') === 'story' && prefs.historyEnabled && enabled('story')) {
          history.push({ speaker: typeof binding.options.speaker === 'string' ? binding.options.speaker.slice(0, 150) : '', text: binding.original, translation: text });
          history = history.slice(-Math.min(20, prefs.historyMaxEntries || 10));
        }
      } catch { if (bindings.get(binding.id) === binding) bindings.delete(binding.id); }
    });
  }
  function bind(id, original, apply, options = {}) {
    if (typeof id !== 'string' || !id || id.length > 100 || typeof original !== 'string' || original.length > 2000 || typeof apply !== 'function' || disposed || (!bindings.has(id) && bindings.size >= 256)) throw new Error('Invalid native text binding');
    const safeOptions = { kind: ['story', 'name', 'ui'].includes(options.kind) ? options.kind : 'story', speaker: typeof options.speaker === 'string' ? options.speaker.slice(0, 150) : '', ...(typeof options.scene === 'string' ? { scene: options.scene.slice(0, 128) } : {}) };
    const binding = { id, original, apply, options: safeOptions, generation: 0 }; bindings.set(id, binding);
    try { apply(original); } catch (error) { bindings.delete(id); throw error; }
    render(binding);
    return () => { if (bindings.get(id) === binding) bindings.delete(id); binding.generation++; };
  }
  function report() { if (disposed) return; detectUnity(); transport('reportRuntime', { ...stats, configuredRules: rules.length, profileId: prefs.profileId || null }).catch(() => {}); }
  function uninstall() {
    if (disposed) return; disposed = true; epoch++; history = [];
    clearInterval(syncTimer); clearInterval(reportTimer);
    for (const cancel of held) cancel();
    for (const binding of bindings.values()) try { binding.apply(binding.original); } catch { /* Label disposed. */ }
    bindings.clear(); window.removeEventListener(responseEvent, receive);
    nativeLabels?.dispose(); disposeWasm?.();
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('Translation disposed')); } pending.clear();
    if (window.fetch === wrappedFetch) window.fetch = nativeFetch;
    if (window.XMLHttpRequest === WrappedXHR) window.XMLHttpRequest = NativeXHR;
    if (window.UnityWebTranslator === publicApi) delete window.UnityWebTranslator;
    delete window.__UnityWebTranslator;
  }
  const WrappedXHR = typeof NativeXHR === 'function' ? xhrAdapter.create(NativeXHR, { plan, transform, maxBytes: resources.limits.bytes }) : null;
  if (typeof nativeFetch === 'function') window.fetch = wrappedFetch;
  if (WrappedXHR) window.XMLHttpRequest = WrappedXHR;
  const publicApi = Object.freeze({ version: stats.version, translate, bind, resetHistory: () => { history = []; scene = ''; } });
  window.UnityWebTranslator = publicApi;
  window.__UnityWebTranslator = Object.freeze({ version: stats.version, applyPreferences, synchronize, uninstall, diagnostics: () => ({ ...stats, paths: [...stats.paths], configuredRules: rules.length }) });
  if (globalThis.__UnityWasmTools && globalThis.__UnityNativeLabels) {
    disposeWasm = globalThis.__UnityWasmTools.install({
      builds: globalThis.__UnityNativeLabels.builds,
      enabled: () => !disposed && !prefs.profileRequired && !!prefs.profileId,
      createHandlers(exports, build) {
        nativeLabels = globalThis.__UnityNativeLabels.create(exports, {
          active: () => !disposed && !prefs.profileRequired && !prefs.paused,
          enabled, translate, bind, resetHistory: publicApi.resetHistory,
          context: () => epoch, lookahead: () => prefs.prefetchLookahead ?? 3,
          font: build.font, layout: build.layout,
          onBound: () => { stats.nativeLabelCalls++; },
          onStory: () => { stats.nativeStoryCalls++; }, loadFont,
          fontStatus: value => { stats.fontStatus = value; console.info('[Unity Web Translator] font=' + value); },
        });
        return nativeLabels.handlers;
      },
      onStatus: value => {
        stats.wasmStatus = value; console.info('[Unity Web Translator] native=' + value);
        console.info('[Unity Web Translator] version=' + stats.version);
        console.info('[Unity Web Translator] otherRuntime=' + (window.__CocosWebTranslator ? 'cocos' : 'none')); report();
      },
    });
  }
  const syncTimer = setInterval(synchronize, 3000), reportTimer = setInterval(report, 3000);
  synchronize().then(report);
})();
