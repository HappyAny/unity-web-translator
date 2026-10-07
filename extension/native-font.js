// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
(function (root) {
  'use strict';
  if (root.__UnityNativeFont) return;
  function create(exports, options) {
    let bytes, asset = 0, handle = 0, legacyAsset = 0, legacyHandle = 0, legacyFailed = false, disposed = false, failed = false;
    const seen = new Set(), observed = new Map(), legacyObserved = new Map(), fallbacks = new Map(), memory = exports.memory;
    let faceProperty;
    const available = ['__uwt_type', '__uwt_array', '__uwt_write_file', '__uwt_create_font', '__uwt_font', '__uwt_set_font', '__uwt_add_chars'].every(name => typeof exports[name] === 'function');
    if (!available || typeof options.load !== 'function') return null;
    const status = value => options.status?.(value);
    status('loading');
    Promise.resolve().then(options.load).then(value => {
      if (disposed) return;
      if (!(value instanceof Uint8Array) || value.byteLength < 1000 || value.byteLength > 12000000) throw new Error('Invalid bundled font');
      bytes = value; status('available'); refresh(); options.ready?.();
    }).catch(() => { if (!disposed) { failed = true; status('failed'); } });
    function initialize() {
      if (disposed || failed) return 0;
      if (asset || !bytes) return asset;
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
        asset = exports.__uwt_create_font(path, 0, 48, 5, 4165, 1024, 1024, 1, 1, 0);
        if (!asset) throw new Error('Native font creation failed');
        handle = exports.__uwt_root(asset, 0, 2);
        if (!handle) throw new Error('Native font root unavailable');
        bytes = null; status('ready');
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
    const legacyAvailable = ['__uwt_new_object', '__uwt_legacy_ctor', '__uwt_legacy_has_char', '__uwt_legacy_font', '__uwt_legacy_set_font'].every(name => typeof exports[name] === 'function');
    function legacyInitialize() {
      if (!legacyAvailable || legacyFailed || disposed || !initialize()) return 0;
      if (legacyAsset) return legacyAsset;
      const address = options.legacyTypeAddress, roots = []; let phase = 'type', dynamic = false;
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
        exports.__uwt_legacy_ctor(value, path, 0);
        dynamic = !!exports.__uwt_legacy_dynamic?.(value, 0);
        phase = 'request';
        if (typeof exports.__uwt_legacy_request_chars === 'function') {
          const probe = options.string('译'); roots.push(exports.__uwt_root(probe, 0, 2));
          if (!roots.at(-1)) throw new Error('Legacy glyph root unavailable');
          exports.__uwt_legacy_request_chars(value, probe, 48, 0, 0);
        }
        phase = 'glyph';
        if (!exports.__uwt_legacy_has_char(value, 0x8bd1, 0)) throw new Error('Legacy font glyphs unavailable');
        legacyAsset = value; legacyHandle = roots.shift();
        console.info('[Unity Web Translator] legacyFont=ready');
      } catch {
        legacyFailed = true; console.warn('[Unity Web Translator] legacyFont=failed phase=' + phase + ' dynamic=' + dynamic);
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
      // Preserve an existing font when it already covers the translated characters.
      if (state?.font && legacyAvailable) {
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
      if (disposed || options.active?.() === false || !/[\u3040-\u30ff\u3400-\u9fff]/.test(text)) return;
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
      dispose: () => { for (const pointer of [...observed.keys()]) forget(pointer); for (const pointer of [...legacyObserved.keys()]) forgetLegacy(pointer); restoreFallbacks(); disposed = true; bytes = null; if (handle) { exports.__uwt_unroot(handle); handle = 0; } if (legacyHandle) { exports.__uwt_unroot(legacyHandle); legacyHandle = 0; } } };
  }
  root.__UnityNativeFont = Object.freeze({ create });
})(globalThis);
