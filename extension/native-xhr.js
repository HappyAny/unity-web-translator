// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
(function (root) {
  'use strict';
  if (root.__UnityTextXHR) return;
  function create(NativeXHR, adapter) {
    function getter(name, xhr) {
      let prototype = NativeXHR.prototype;
      while (prototype) {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
        if (descriptor?.get) return descriptor.get.call(xhr);
        prototype = Object.getPrototypeOf(prototype);
      }
      return xhr[name];
    }
    return class UnityTextXHR extends NativeXHR {
      constructor() {
        super();
        const xhr = this;
        let request = {}, state = 'idle', generation = 0, translated, received = {}, replaying = false, installed = false;
        const real = name => getter(name, xhr);
        const emit = (type, event) => {
          const next = type === 'readystatechange' ? new Event(type) : new ProgressEvent(type, {
            lengthComputable: !!event?.lengthComputable, loaded: event?.loaded || 0, total: event?.total || 0,
          });
          xhr.dispatchEvent(next);
        };
        function decorate() {
          if (installed) return true;
          // If a host does not support per-instance descriptors, keep its native XHR.
          try {
            Object.defineProperties(xhr, {
              readyState: { configurable: true, get: () => state === 'holding' ? 3 : state === 'aborted' ? 0 : real('readyState') },
              status: { configurable: true, get: () => state === 'aborted' ? 0 : real('status') },
              statusText: { configurable: true, get: () => state === 'aborted' ? '' : real('statusText') },
              response: { configurable: true, get: () => state === 'aborted' ? null : translated !== undefined ? translated : real('response') },
              responseText: { configurable: true, get: () => {
                if (state === 'aborted') return '';
                if (translated !== undefined && ['', 'text'].includes(xhr.responseType)) return translated;
                return real('responseText');
              } },
            });
            installed = true; return true;
          } catch { return false; }
        }
        const open = xhr.open, abort = xhr.abort, send = xhr.send;
        xhr.open = function (method, url, async = true, ...rest) {
          if (this !== xhr) return open.call(this, method, url, async, ...rest);
          generation++; state = 'idle'; translated = undefined; received = {}; request = { method: String(method).toUpperCase(), url: String(url), async: async !== false, body: null };
          return open.call(xhr, method, url, async, ...rest);
        };
        xhr.send = function (body = null) { if (this !== xhr) return send.call(this, body); request.body = body; return send.call(xhr, body); };
        xhr.abort = function () {
          if (this !== xhr) return abort.call(this);
          const held = state === 'holding'; generation++; translated = undefined; state = held ? 'aborted' : 'idle';
          const result = abort.call(xhr);
          if (held) { replaying = true; try { emit('readystatechange'); emit('abort'); emit('loadend'); } finally { replaying = false; } }
          return result;
        };
        const getHeader = xhr.getResponseHeader, allHeaders = xhr.getAllResponseHeaders;
        const staleHeaders = new Set(['content-length', 'content-encoding', 'content-md5', 'digest', 'etag']);
        xhr.getResponseHeader = function (name) { if (this !== xhr) return getHeader.call(this, name); return translated !== undefined && staleHeaders.has(String(name).toLowerCase()) ? null : getHeader.call(xhr, name); };
        xhr.getAllResponseHeaders = function () { if (this !== xhr) return allHeaders.call(this); const value = allHeaders.call(xhr); return translated === undefined ? value : value.split(/\r?\n/).filter(line => !staleHeaders.has(line.split(':')[0].toLowerCase())).join('\r\n'); };
        for (const type of ['readystatechange', 'load', 'loadend']) xhr.addEventListener(type, event => {
          if (replaying || state === 'aborted') return;
          if (state === 'holding') { received[type] = event; event.stopImmediatePropagation(); return; }
          if (type !== 'readystatechange' || real('readyState') !== 4 || state === 'ready') return;
          const typeName = xhr.responseType;
          const candidate = adapter.plan({ ...request, responseType: typeName, status: real('status'), url: real('responseURL') || request.url,
            contentType: getHeader.call(xhr, 'Content-Type') || '', contentLength: getHeader.call(xhr, 'Content-Length') });
          if (!candidate || !['', 'text', 'json', 'arraybuffer'].includes(typeName) || !decorate()) return;
          let raw;
          try {
            if (typeName === 'arraybuffer') {
              const buffer = real('response');
              if (!buffer || buffer.byteLength > adapter.maxBytes) return;
              raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer);
            } else if (typeName === 'json') { if (real('response') === null) return; raw = JSON.stringify(real('response')); }
            else raw = real('responseText');
            if (new TextEncoder().encode(raw).length > adapter.maxBytes) return;
          } catch { return; }
          state = 'holding'; event.stopImmediatePropagation(); received[type] = event;
          const version = generation;
          Promise.resolve().then(() => adapter.transform(raw, candidate)).then(result => {
            if (state !== 'holding' || version !== generation) return;
            if (result?.changed) {
              try { translated = typeName === 'arraybuffer' ? new TextEncoder().encode(result.text).buffer : typeName === 'json' ? JSON.parse(result.text) : result.text; }
              catch { translated = undefined; }
            }
          }, () => {}).finally(() => {
            if (state !== 'holding' || version !== generation) return;
            state = 'ready'; replaying = true;
            try { emit('readystatechange', received.readystatechange); emit('load', received.load); emit('loadend', received.loadend); }
            finally { replaying = false; }
          });
        }, true);
      }
    };
  }
  root.__UnityTextXHR = Object.freeze({ create });
})(globalThis);
