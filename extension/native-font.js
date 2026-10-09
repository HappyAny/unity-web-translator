// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
(function (root) {
  'use strict';
  if (root.__UnityNativeFont) return;
  function create(exports, options) {
    let bytes, nativeBytes, fileReady = false, fileLength = 0, asset = 0, handle = 0, legacyAsset = 0, legacyHandle = 0, legacyFailed = false, disposed = false, failed = false, reportedReady = false;
    const seen = new Set(), observed = new Map(), legacyObserved = new Map(), fallbacks = new Map(), memory = exports.memory;
    let faceProperty;
    const commonAvailable = ['__uwt_type', '__uwt_array', '__uwt_write_file'].every(name => typeof exports[name] === 'function');
    const tmpAvailable = ['__uwt_create_font', '__uwt_font', '__uwt_set_font', '__uwt_add_chars'].every(name => typeof exports[name] === 'function');
    const legacyAvailable = ['__uwt_new_object', '__uwt_legacy_ctor', '__uwt_legacy_has_char', '__uwt_legacy_font', '__uwt_legacy_set_font'].every(name => typeof exports[name] === 'function');
    if (!commonAvailable || (!tmpAvailable && !legacyAvailable) || typeof options.load !== 'function') return null;
    const status = value => options.status?.(value);
    const ready = () => { if (!reportedReady) { reportedReady = true; status('ready'); } };
    status('loading');
    Promise.resolve().then(options.load).then(value => {
      if (disposed) return;
      if (!(value instanceof Uint8Array) || value.byteLength < 1000 || value.byteLength > 12000000) throw new Error('Invalid bundled font');
      bytes = value; if (options.legacyNativeData?.copy) nativeBytes = value;
      status('available'); refresh(); options.ready?.();
    }).catch(() => { if (!disposed) { failed = true; status('failed'); } });
    function prepareFile() {
      if (fileReady) return true;
      if (disposed || failed || !bytes) return false;
      const roots = [];
      try {
        // This layout belongs to the fingerprint-gated 32-bit native adapter.
        const typeAddress = options.byteArrayTypeAddress ?? 9899276;
        if (!Number.isInteger(typeAddress) || typeAddress < 8 || typeAddress + 4 > memory.buffer.byteLength) throw new Error('Native byte array layout unavailable');
        exports.__uwt_type(typeAddress);
        const type = new DataView(memory.buffer).getUint32(typeAddress, true);
        if (!type) throw new Error('Native byte array type unavailable');
        const array = exports.__uwt_array(type, bytes.length);
        roots.push(exports.__uwt_root(array, 0, 2));
        if (!array || !roots.at(-1) || array + 16 + bytes.length > memory.buffer.byteLength || new DataView(memory.buffer).getUint32(array + 12, true) !== bytes.length) throw new Error('Native byte array unavailable');
        new Uint8Array(memory.buffer, array + 16, bytes.length).set(bytes);
        const path = options.string('/tmp/unity-translator-cjk.ttf');
        roots.push(exports.__uwt_root(path, 0, 2));
        if (!roots.at(-1)) throw new Error('Native font path unavailable');
        // Unity's in-memory filesystem only; no files are written to the host.
        exports.__uwt_write_file(path, array, 0);
        fileReady = true; fileLength = bytes.length; bytes = null;
      } catch { failed = true; bytes = nativeBytes = null; status('failed'); }
      finally { for (const root of roots) if (root) exports.__uwt_unroot(root); }
      return fileReady;
    }
    function initialize() {
      if (disposed || failed || !tmpAvailable) return 0;
      if (asset || !prepareFile()) return asset;
      const roots = [];
      try {
        if (options.createFontFromLegacy) {
          const source = legacyInitialize();
          if (!source) throw new Error('Native source font unavailable');
          asset = exports.__uwt_create_font(source, 48, 5, 4165, 1024, 1024, 1, 1, 0);
        } else {
          const path = options.string('/tmp/unity-translator-cjk.ttf'); roots.push(exports.__uwt_root(path, 0, 2));
          if (!roots.at(-1)) throw new Error('Native font path unavailable');
          asset = exports.__uwt_create_font(path, 0, 48, 5, 4165, 1024, 1024, 1, 1, 0);
        }
        if (!asset) throw new Error('Native font creation failed');
        handle = exports.__uwt_root(asset, 0, 2);
        if (!handle) throw new Error('Native font root unavailable');
        ready();
      } catch {
        asset = 0; failed = true; bytes = null; status('failed');
      } finally { for (const root of roots) if (root) exports.__uwt_unroot(root); }
      return asset;
    }
    const styling = ['__uwt_color', '__uwt_set_color', '__uwt_property', '__uwt_has_property', '__uwt_material_color', '__uwt_label_material', '__uwt_set_material', '__uwt_font_material'].every(name => typeof exports[name] === 'function');
    function color(read) {
      const scratch = exports.malloc(16);
      if (!scratch) throw new Error('Native color allocation failed');
      try { read(scratch); return Array.from(new Float32Array(memory.buffer, scratch, 4)); }
      finally { exports.free(scratch); }
    }
    function setColor(pointer, values) {
      const scratch = exports.malloc(16);
      if (!scratch) return;
      try { new Float32Array(memory.buffer, scratch, 4).set(values); exports.__uwt_set_color(pointer, scratch, 0); }
      finally { exports.free(scratch); }
    }
    function snapshot(pointer) {
      const original = observed.get(pointer)?.state;
      if (original) return { ...original };
      const state = { font: exports.__uwt_font(pointer, 0) };
      if (!styling) return state;
      state.material = exports.__uwt_label_material(pointer, 0);
      state.color = color(scratch => exports.__uwt_color(scratch, pointer, 0));
      if (faceProperty === undefined) faceProperty = exports.__uwt_property(options.string('_FaceColor'), 0);
      const face = state.material && exports.__uwt_has_property(state.material, faceProperty, 0)
        ? color(scratch => exports.__uwt_material_color(scratch, state.material, faceProperty, 0)) : [1, 1, 1, 1];
      state.translatedColor = state.color.map((value, index) => value * face[index]);
      if (state.translatedColor.some(value => !Number.isFinite(value))) state.translatedColor = state.color;
      return state;
    }
    function preload(text) {
      if (!initialize()) return false;
      let missing = '';
      for (const char of text.replace(/<[^>]*>/g, '')) {
        const cp = char.codePointAt(0);
        if (cp < 32 || seen.has(char) || seen.size >= 4096) continue;
        seen.add(char); missing += char;
      }
      if (missing) {
        const value = options.string(missing), root = exports.__uwt_root(value, 0, 2);
        if (!root) return false;
        try { exports.__uwt_add_chars(asset, value, 0, 0); } finally { exports.__uwt_unroot(root); }
      }
      return true;
    }
    function attachFallback(source) {
      if (!source || source === asset || typeof exports.__uwt_fallbacks !== 'function') return false;
      if (fallbacks.has(source)) return true;
      if (fallbacks.size >= 64) return false;
      const roots = [];
      try {
        const list = exports.__uwt_fallbacks(source, 0);
        if (!list || list + 20 > memory.buffer.byteLength) return false;
        let view = new DataView(memory.buffer);
        const items = view.getUint32(list + 8, true), size = view.getInt32(list + 12, true);
        if (!items || items + 16 > view.byteLength || size < 0 || size > 32) return false;
        const capacity = view.getUint32(items + 12, true), type = view.getUint32(items, true);
        if (!type || capacity < size || capacity > 128 || items + 16 + capacity * 4 > view.byteLength) return false;
        const values = Array.from({ length: size }, (_v, index) => view.getUint32(items + 16 + index * 4, true));
        if (values.includes(asset)) return true;
        for (const pointer of [source, list, items]) roots.push(exports.__uwt_root(pointer, 0, 2));
        if (roots.some(root => !root)) throw new Error('Native fallback root unavailable');
        const next = exports.__uwt_array(type, size + 1);
        roots.push(exports.__uwt_root(next, 0, 2));
        view = new DataView(memory.buffer);
        if (!next || !roots.at(-1) || next + 16 + (size + 1) * 4 > view.byteLength || view.getUint32(next + 12, true) !== size + 1) throw new Error('Native fallback array unavailable');
        values.push(asset);
        values.forEach((value, index) => view.setUint32(next + 16 + index * 4, value, true));
        // Fingerprint-gated IL2CPP List<T> layout. Keep the original list and entries.
        view.setUint32(list + 8, next, true); view.setInt32(list + 12, size + 1, true);
        view.setInt32(list + 16, view.getInt32(list + 16, true) + 1, true);
        fallbacks.set(source, { list, items, size, next, roots });
        try { exports.__uwt_clear_fallbacks?.(source, 0); } catch { /* A font lookup may not be initialized yet. */ }
        return true;
      } catch { for (const root of roots) if (root) exports.__uwt_unroot(root); return false; }
    }
    function restoreFallbacks() {
      for (const [source, state] of fallbacks) {
        const view = new DataView(memory.buffer);
        if (view.getUint32(state.list + 8, true) === state.next && view.getInt32(state.list + 12, true) === state.size + 1) {
          view.setUint32(state.list + 8, state.items, true); view.setInt32(state.list + 12, state.size, true);
          view.setInt32(state.list + 16, view.getInt32(state.list + 16, true) + 1, true);
          try { exports.__uwt_clear_fallbacks?.(source, 0); } catch { /* Keep native cleanup independent. */ }
        }
        for (const root of state.roots) if (root) exports.__uwt_unroot(root);
      }
      fallbacks.clear();
    }
    function apply(pointer, text, state) {
      if (!preload(text)) return;
      if (attachFallback(state?.font || exports.__uwt_font(pointer, 0))) {
        exports.__uwt_dirty?.(pointer, 1, 0); return;
      }
      exports.__uwt_set_font(pointer, asset, 0);
      if (styling) {
        exports.__uwt_set_material(pointer, exports.__uwt_font_material(asset, 0), 0);
        if (state?.translatedColor) setColor(pointer, state.translatedColor);
      }
    }
    function restore(pointer, state) {
        const font = typeof state === 'number' ? state : state?.font;
        if (font) exports.__uwt_set_font(pointer, font, 0);
        if (state?.material) exports.__uwt_set_material(pointer, state.material, 0);
        if (state?.color) setColor(pointer, state.color);
    }
    function legacyInitialize() {
      if (!legacyAvailable || legacyFailed || disposed) return 0;
      if (legacyAsset) return legacyAsset;
      if (tmpAvailable && !options.createFontFromLegacy) { if (!initialize()) return 0; }
      else if (!prepareFile()) return 0;
      const address = options.legacyTypeAddress, roots = []; let phase = 'type', dynamic = false, metricSize, metricHeight;
      try {
        if (!Number.isInteger(address) || address < 8 || address + 4 > memory.buffer.byteLength) throw new Error('Legacy font layout unavailable');
        exports.__uwt_type(address);
        const type = new DataView(memory.buffer).getUint32(address, true);
        if (!type) throw new Error('Legacy font type unavailable');
        phase = 'object';
        const value = exports.__uwt_new_object(type);
        roots.push(exports.__uwt_root(value, 0, 2));
        const path = options.string('/tmp/unity-translator-cjk.ttf');
        roots.push(exports.__uwt_root(path, 0, 2));
        if (!value || roots.some(root => !root)) throw new Error('Legacy font root unavailable');
        phase = 'constructor';
        if (options.legacyEmptyConstructor) exports.__uwt_legacy_ctor(value, 0);
        else if (options.legacyNamesArray) {
          const arrayAddress = options.stringArrayTypeAddress;
          if (!Number.isInteger(arrayAddress) || arrayAddress < 8 || arrayAddress + 4 > memory.buffer.byteLength) throw new Error('Native font names unavailable');
          exports.__uwt_type(arrayAddress);
          const arrayType = new DataView(memory.buffer).getUint32(arrayAddress, true);
          if (!arrayType) throw new Error('Native font names type unavailable');
          const names = exports.__uwt_array(arrayType, 1);
          roots.push(exports.__uwt_root(names, 0, 2));
          const view = new DataView(memory.buffer);
          if (!names || !roots.at(-1) || names + 20 > view.byteLength || view.getUint32(names + 12, true) !== 1) throw new Error('Native font names array unavailable');
          view.setUint32(names + 16, path, true);
          exports.__uwt_legacy_ctor(value, names, 48, 0);
        } else exports.__uwt_legacy_ctor(value, path, 0);
        phase = 'material';
        if (typeof exports.__uwt_legacy_material === 'function' && !exports.__uwt_legacy_material(value, 0)) throw new Error('Legacy font material unavailable');
        const layout = options.legacyNativeData;
        if (layout) {
          phase = 'native-data';
          // Only this newly created fallback is touched, using the matched build's native layout.
          let view = new DataView(memory.buffer);
          const pointer = view.getUint32(value + 8, true);
          if (!pointer || pointer + layout.data + 4 > view.byteLength) throw new Error('Native fallback object unavailable');
          const data = view.getUint32(pointer + layout.data, true);
          if (!data || data + Math.max(layout.buffer, layout.length, layout.dynamic) + 4 > view.byteLength) throw new Error('Native fallback data unavailable');
          if (layout.copy) {
            if (!nativeBytes || nativeBytes.length !== fileLength || data + layout.capacity + 4 > view.byteLength) throw new Error('Native fallback source unavailable');
            // Reserve through Unity's own byte-vector allocator; its normal destructor owns the buffer.
            if ((view.getUint32(data + layout.capacity, true) >>> 1) < fileLength) exports.__uwt_legacy_reserve_native(data + layout.buffer, fileLength, 1);
            view = new DataView(memory.buffer);
            const target = view.getUint32(data + layout.buffer, true), capacity = view.getUint32(data + layout.capacity, true) >>> 1;
            if (!target || capacity < fileLength || capacity > 24000000 || target + capacity > view.byteLength) throw new Error('Native fallback allocation unavailable');
            new Uint8Array(memory.buffer, target, fileLength).set(nativeBytes);
            view.setUint32(data + layout.length, fileLength, true); nativeBytes = null;
          }
          const buffer = view.getUint32(data + layout.buffer, true), length = view.getUint32(data + layout.length, true);
          if (!buffer || length !== fileLength || buffer + length > view.byteLength || view.getUint32(buffer, false) !== 0x00010000) throw new Error('Native fallback bytes unavailable');
          view.setInt32(data + layout.dynamic, -2, true);
          const metrics = layout.metrics;
          if (metrics) {
            if (data + metrics.ascent + 4 > view.byteLength || pointer + Math.max(metrics.lineHeight, metrics.fontSize) + 4 > view.byteLength) throw new Error('Native font metrics unavailable');
            // Invalidate constructor metrics so the owned font recomputes them from the loaded face.
            view.setFloat32(data + metrics.ascent, 0, true);
          }
          exports.__uwt_legacy_initialize_native(data);
          if (metrics) {
            phase = 'metrics'; view = new DataView(memory.buffer);
            const size = metricSize = view.getInt32(pointer + metrics.fontSize, true), height = metricHeight = view.getFloat32(pointer + metrics.lineHeight, true);
            if (size < 1 || size > 500 || !Number.isFinite(height) || height < size * 0.5 || height > size * 4) throw new Error('Native font line height unavailable');
          }
          exports.__uwt_legacy_refresh_native(data);
        }
        dynamic = !!exports.__uwt_legacy_dynamic?.(value, 0);
        phase = 'request';
        if (typeof exports.__uwt_legacy_request_chars === 'function') {
          const probe = options.string('译'); roots.push(exports.__uwt_root(probe, 0, 2));
          if (!roots.at(-1)) throw new Error('Legacy glyph root unavailable');
          exports.__uwt_legacy_request_chars(value, probe, 48, 0, 0);
        }
        phase = 'glyph';
        if (!exports.__uwt_legacy_has_char(value, 0x8bd1, 0)) throw new Error('Legacy font glyphs unavailable');
        legacyAsset = value; legacyHandle = roots.shift(); ready();
        console.info('[Unity Web Translator] legacyFont=ready');
      } catch {
        legacyFailed = true; nativeBytes = null;
        if (!tmpAvailable || options.createFontFromLegacy) status('failed');
        console.warn('[Unity Web Translator] legacyFont=failed phase=' + phase + ' dynamic=' + dynamic +
          (phase === 'metrics' ? ' size=' + metricSize + ' lineHeight=' + metricHeight : ''));
      } finally { for (const root of roots) if (root) exports.__uwt_unroot(root); }
      return legacyAsset;
    }
    function snapshotLegacy(pointer) { return legacyObserved.get(pointer)?.state || { font: exports.__uwt_legacy_font(pointer, 0) }; }
    function restoreLegacy(pointer, state) {
      if (Number.isInteger(state?.font)) exports.__uwt_legacy_set_font(pointer, state.font, 0);
      const entry = legacyObserved.get(pointer); if (entry) entry.applied = false;
    }
    function observeLegacy(pointer, text) {
      if (!legacyAvailable || disposed || options.active?.() === false || !/[\u3040-\u30ff\u3400-\u9fff]/.test(text)) return;
      let entry = legacyObserved.get(pointer);
      if (!entry) {
        if (legacyObserved.size >= 256) return;
        const state = snapshotLegacy(pointer), roots = [];
        try {
          for (const value of [pointer, state.font].filter(Boolean)) roots.push(exports.__uwt_root(value, 0, 2));
          if (roots.some(root => !root)) throw new Error('Legacy label root unavailable');
          entry = { state, roots, text, applied: false }; legacyObserved.set(pointer, entry);
        } catch { for (const root of roots) if (root) exports.__uwt_unroot(root); return; }
      }
      entry.text = text;
    }
    function applyLegacy(pointer, text, state) {
      observeLegacy(pointer, text);
      const entry = legacyObserved.get(pointer); if (entry) entry.applied = true;
      // A matched build can prefer the known CJK fallback over advertised native coverage.
      const preferFallback = options.legacyPreferFallback && /[\u3400-\u9fff]/.test(text.replace(/<[^>]*>/g, ''));
      if (!preferFallback && state?.font && legacyAvailable) {
        if (entry?.coverage?.text !== text) {
          let complete = true;
          try { for (const char of new Set(text.replace(/<[^>]*>/g, ''))) if (char.codePointAt(0) >= 32 && !exports.__uwt_legacy_has_char(state.font, char.codePointAt(0), 0)) { complete = false; break; } }
          catch { complete = false; }
          if (entry) entry.coverage = { text, complete };
        }
        if (entry?.coverage?.complete) { if (exports.__uwt_legacy_font(pointer, 0) !== state.font) restoreLegacy(pointer, state); entry.applied = false; return; }
      }
      if (legacyInitialize()) exports.__uwt_legacy_set_font(pointer, legacyAsset, 0);
    }
    function forgetLegacy(pointer) {
      const entry = legacyObserved.get(pointer); if (!entry) return;
      legacyObserved.delete(pointer);
      try { restoreLegacy(pointer, entry.state); } catch { /* Component may already be disposing. */ }
      for (const root of entry.roots) if (root) exports.__uwt_unroot(root);
    }
    function observe(pointer, text) {
      if (!tmpAvailable || disposed || options.active?.() === false || !/[\u3040-\u30ff\u3400-\u9fff]/.test(text)) return;
      let entry = observed.get(pointer);
      if (!entry) {
        if (observed.size >= 512) return;
        const roots = [];
        try {
          const state = snapshot(pointer);
          for (const value of [pointer, state.font, state.material].filter(Boolean)) roots.push(exports.__uwt_root(value, 0, 2));
          if (roots.some(root => !root)) throw new Error('Native label root unavailable');
          entry = { state, roots, text }; observed.set(pointer, entry);
        } catch { for (const root of roots) if (root) exports.__uwt_unroot(root); return; }
      }
      entry.text = text;
      apply(pointer, text, entry.state);
    }
    function forget(pointer) {
      const entry = observed.get(pointer); if (!entry) return;
      observed.delete(pointer);
      try { restore(pointer, entry.state); } catch { /* The component may already be disposing. */ }
      for (const root of entry.roots) if (root) exports.__uwt_unroot(root);
    }
    function refresh() {
      if (disposed || options.active?.() === false) return;
      for (const [pointer, entry] of observed) try { apply(pointer, entry.text, entry.state); } catch { /* One label cannot stop other labels. */ }
      for (const [pointer, entry] of legacyObserved) if (entry.applied) try { applyLegacy(pointer, entry.text, entry.state); } catch { /* Legacy labels remain independent. */ }
    }
    function synchronize() {
      if (options.active?.() !== false) { refresh(); return; }
      for (const [pointer, entry] of observed) try { restore(pointer, entry.state); exports.__uwt_dirty?.(pointer, 1, 0); } catch { /* Native components own their cleanup. */ }
      for (const [pointer, entry] of legacyObserved) try { restoreLegacy(pointer, entry.state); } catch { /* Preserve native legacy cleanup. */ }
      restoreFallbacks();
    }
    return { apply, snapshot, observe, forget, synchronize, original: pointer => exports.__uwt_font(pointer, 0), restore,
      applyLegacy, snapshotLegacy, observeLegacy, restoreLegacy, forgetLegacy,
      dispose: () => { for (const pointer of [...observed.keys()]) forget(pointer); for (const pointer of [...legacyObserved.keys()]) forgetLegacy(pointer); restoreFallbacks(); disposed = true; bytes = nativeBytes = null; if (handle) { exports.__uwt_unroot(handle); handle = 0; } if (legacyHandle) { exports.__uwt_unroot(legacyHandle); legacyHandle = 0; } } };
  }
  root.__UnityNativeFont = Object.freeze({ create });
})(globalThis);
