// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
(function (root) {
  'use strict';
  if (root.__UnityNativeLabels) return;
  const builds = [{
    sha256: '62bd9e5b555b392b10c20e83f52ed118326702a51fc74fa4d4e10250105d8d15',
    importedFunctions: 624,
    font: { byteArrayTypeAddress: 9899276 },
    hooks: [
      { name: 'labelSet', function: 31008 }, { name: 'labelEnable', function: 31532 },
      { name: 'labelDisable', function: 31534 }, { name: 'labelDestroy', function: 31535 },
      { name: 'storyParse', function: 67659 }, { name: 'nameSet', function: 56345 },
      { name: 'scriptLoad', function: 113268 },
      { name: 'balloonStart', function: 66103 },
      { name: 'glyphInitialize', function: 68187 },
      { name: 'windowText', function: 56350 }, { name: 'windowClear', function: 56344 },
      { name: 'windowLog', function: 56351 }, { name: 'windowDispose', function: 56357 },
      { name: 'windowShow', function: 67661 },
    ],
    exports: { __uwt_string: 151240, __uwt_label_text: 31006, __uwt_root: 167969, __uwt_unroot: 167959,
      __uwt_type: 1616, __uwt_array: 1319, __uwt_write_file: 143267, __uwt_create_font: 31790,
      __uwt_font: 12833, __uwt_set_font: 31010, __uwt_add_chars: 31842,
      __uwt_font_material: 4636, __uwt_label_material: 5142, __uwt_set_material: 31011,
      __uwt_color: 31017, __uwt_set_color: 31018, __uwt_property: 129310,
      __uwt_has_property: 129494, __uwt_material_color: 129475,
      __uwt_fallbacks: 14415, __uwt_clear_fallbacks: 31812, __uwt_dirty: 31134,
      __uwt_balloon_complete: 66110 },
  }, {
    sha256: 'bd48af8399673bb377a0c4274432f53c0790b006050a2ecd50c8f9c72af6f406',
    importedFunctions: 701,
    font: { byteArrayTypeAddress: 13964456, legacyTypeAddress: 13974152 },
    hooks: [
      { name: 'labelSet', function: 34714 }, { name: 'labelEnable', function: 33200 },
      { name: 'labelDisable', function: 33202 }, { name: 'labelDestroy', function: 33203 },
      { name: 'revealText', function: 139786 }, { name: 'nameSet', function: 139902 },
      { name: 'scriptPrefetch', function: 54652 },
      { name: 'labelProcessing', function: 34886 },
      { name: 'meshEnable', function: 33134 }, { name: 'meshDisable', function: 33135 },
      { name: 'meshDestroy', function: 33136 },
      { name: 'legacySet', function: 139210 }, { name: 'legacyEnable', function: 139234 },
      { name: 'legacyDisable', function: 139235 }, { name: 'legacyDestroy', function: 92525 },
    ],
    exports: { __uwt_string: 198601, __uwt_label_text: 34712, __uwt_root: 220084, __uwt_unroot: 220070,
      __uwt_type: 2388, __uwt_array: 2032, __uwt_write_file: 181784, __uwt_create_font: 33612,
      __uwt_font: 25121, __uwt_set_font: 34717, __uwt_add_chars: 33666,
      __uwt_font_material: 25085, __uwt_label_material: 32638, __uwt_set_material: 34718,
      __uwt_color: 34724, __uwt_set_color: 34725, __uwt_property: 156346,
      __uwt_has_property: 156764, __uwt_material_color: 156746,
      __uwt_fallbacks: 31253, __uwt_clear_fallbacks: 33634, __uwt_dirty: 34841,
      __uwt_reveal_progress: 139989, __uwt_set_reveal_progress: 139990, __uwt_mesh: 33191,
      __uwt_new_object: 1417, __uwt_legacy_ctor: 33323, __uwt_legacy_has_char: 33333,
      __uwt_legacy_request_chars: 33344, __uwt_legacy_dynamic: 33253,
      __uwt_legacy_font: 139207, __uwt_legacy_set_font: 139209, __uwt_legacy_text: 25118 },
  }, {
    sha256: 'adc902bca80fb14b6963d32196a7691a55d500614515f6c15a3b410153d2d162',
    importedFunctions: 612,
    runtimeExports: { memory: 'tk', __indirect_function_table: 'Sk', malloc: 'Nk', free: 'Ok' },
    font: { byteArrayTypeAddress: 8391080, legacyTypeAddress: 8398628, createFontFromLegacy: true,
      legacyNativeData: { data: 48, buffer: 76, length: 84, capacity: 88, dynamic: 36, copy: true } },
    layout: { novel: { body: 68, name: 72 } },
    hooks: [
      { name: 'labelSet', function: 133895 }, { name: 'labelEnable', function: 134421 },
      { name: 'labelDisable', function: 134413 }, { name: 'labelDestroy', function: 134408 },
      { name: 'labelProcessing', function: 8929 }, { name: 'meshEnable', function: 134710 },
      { name: 'meshDisable', function: 134709 }, { name: 'meshDestroy', function: 134708 },
      { name: 'legacySet', function: 184705 }, { name: 'legacyEnable', function: 73257 },
      { name: 'legacyDisable', function: 73256 }, { name: 'legacyDestroy', function: 43092 },
      { name: 'novelWindow', function: 123757 }, { name: 'novelLength', function: 17997 },
    ],
    exports: { __uwt_string: 68674, __uwt_label_text: 133901, __uwt_root: 30849, __uwt_unroot: 175606,
      __uwt_write_file: 31346, __uwt_create_font: 43274, __uwt_font: 2999, __uwt_set_font: 29135,
      __uwt_add_chars: 95755, __uwt_fallbacks: 4516, __uwt_dirty: 134570, __uwt_legacy_ctor: 116252,
      __uwt_legacy_has_char: 18055, __uwt_legacy_request_chars: 116142, __uwt_legacy_dynamic: 6059, __uwt_legacy_font: 184707,
      __uwt_legacy_set_font: 5804, __uwt_legacy_text: 2917, __uwt_text_data_raw: 6739, __uwt_type: 612,
      __uwt_array: 628, __uwt_new_object: 615, __uwt_legacy_initialize_native: 61843,
      __uwt_legacy_refresh_native: 10557, __uwt_legacy_reserve_native: 1131 },
  }, {
    sha256: '71962a64c4e0f31ff858f2b83346de116d7709c5fbada7dbce468b27997206c6',
    importedFunctions: 589,
    runtimeExports: { memory: 'Yj', __indirect_function_table: 'yk', malloc: 'mk', free: 'nk' },
    font: { byteArrayTypeAddress: 5983264, legacyTypeAddress: 5951480, legacyNamesArray: true,
      stringArrayTypeAddress: 5983396, legacyPreferFallback: true,
      legacyNativeData: { data: 40, buffer: 124, length: 132, capacity: 136, dynamic: 84, copy: true } },
    layout: { message: { text: 8, name: 12, view: 24 } },
    hooks: [
      { name: 'legacySet', function: 49186 }, { name: 'legacyEnable', function: 49161 },
      { name: 'legacyDisable', function: 49160 }, { name: 'legacyDestroy', function: 48977 },
      { name: 'messageFrame', function: 26272 }, { name: 'messageText', function: 16537 },
      { name: 'nameSet', function: 26293 },
    ],
    exports: { __uwt_string: 1212, __uwt_label_text: 5053, __uwt_root: 113391, __uwt_unroot: 113379,
      __uwt_write_file: 113636, __uwt_legacy_ctor: 69089, __uwt_legacy_has_char: 28015, __uwt_legacy_dynamic: 69112,
      __uwt_legacy_material: 12228,
      __uwt_legacy_font: 49188, __uwt_legacy_set_font: 7282, __uwt_legacy_text: 5053, __uwt_type: 589,
      __uwt_array: 599, __uwt_new_object: 591, __uwt_legacy_initialize_native: 27948,
      __uwt_legacy_refresh_native: 5970, __uwt_legacy_reserve_native: 1078 },
  }];
  function create(exports, options) {
    const slots = new Map(), windows = new Map(), sources = new Map(), translated = new Map(), balloons = new Set(), glyphs = new Set();
    const revealable = new Set();
    let scene = 0, speaker = '', busy = false, replaying = false, disposed = false, messageContext, legacyContext;
    const memory = exports.memory;
    if (!(memory instanceof WebAssembly.Memory)) throw new Error('Native memory unavailable');
    for (const name of ['malloc', 'free', '__uwt_string', '__uwt_label_text', '__uwt_root', '__uwt_unroot']) if (typeof exports[name] !== 'function') throw new Error('Native string helpers unavailable');
    const key = text => text.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]{1,100}>/g, '').replace(/\r\n/g, '\n');
    const japanese = text => /[\u3040-\u30ff\uff66-\uff9f]/.test(text);
    function read(pointer, limit = 2000) {
      if (!pointer) return '';
      const view = new DataView(memory.buffer);
      if (!Number.isInteger(pointer) || pointer < 8 || pointer + 12 > view.byteLength) throw new Error('Invalid managed string');
      const length = view.getInt32(pointer + 8, true);
      if (length < 0 || length > limit || pointer + 12 + length * 2 > view.byteLength) throw new Error('Managed string size limit');
      let result = '';
      for (let index = 0; index < length; index++) result += String.fromCharCode(view.getUint16(pointer + 12 + index * 2, true));
      return result;
    }
    function string(text) {
      if (typeof text !== 'string' || text.length > 10000) throw new Error('Translation size limit');
      const buffer = exports.malloc((text.length + 1) * 2);
      if (!buffer) throw new Error('Native allocation failed');
      try {
        const view = new DataView(memory.buffer);
        if (buffer + (text.length + 1) * 2 > view.byteLength) throw new Error('Native allocation outside memory');
        for (let index = 0; index < text.length; index++) view.setUint16(buffer + index * 2, text.charCodeAt(index), true);
        view.setUint16(buffer + text.length * 2, 0, true);
        return exports.__uwt_string(buffer, 0, text.length, 0);
      } finally { exports.free(buffer); }
    }
    const font = root.__UnityNativeFont?.create(exports, { ...options.font, string, load: options.loadFont, status: options.fontStatus,
      active: () => options.active() && (options.enabled('story') || options.enabled('ui')),
      ready: () => { for (const slot of slots.values()) if (slot.output !== slot.text) slot.apply?.(slot.output); } });
    function drop(pointer) {
      const slot = slots.get(pointer); if (!slot) return;
      slots.delete(pointer); balloons.delete(pointer); if (slot.legacy) revealable.delete(pointer); slot.release?.();
      if (slot.fontState) try { if (slot.legacy) font?.restoreLegacy(pointer, slot.fontState); else font?.restore(pointer, slot.fontState); } catch { /* Component may already be disposing. */ }
      for (const handle of slot.roots) if (handle) exports.__uwt_unroot(handle);
    }
    function dropWindow(pointer) {
      const slot = windows.get(pointer); if (!slot) return;
      windows.delete(pointer); slot.release?.();
      for (const handle of slot.roots) if (handle) exports.__uwt_unroot(handle);
    }
    function register(text, kind, name = speaker) {
      if (!text.trim() || text.length > 2000) return;
      const normalized = key(text);
      if (!sources.has(normalized) && sources.size >= 4096) sources.delete(sources.keys().next().value);
      sources.set(normalized, { kind, speaker: name });
    }
    function bind(pointer, value, original, owner = 0, knownContext, legacy = false) {
      if (disposed || busy) return;
      if (glyphs.has(pointer)) return;
      if (!options.active()) { drop(pointer); return; }
      let text; try { text = read(value); } catch { return; }
      if (!text.trim() || text.length > 2000) { drop(pointer); return; }
      const context = knownContext || sources.get(key(text)), kind = context?.kind || 'ui';
      if (!options.enabled(kind) || (!context && !japanese(text))) { drop(pointer); return; }
      if (context?.original) { text = context.original; value = string(text); }
      const current = slots.get(pointer);
      if (current?.text === text) { if (current.output !== text) current.apply?.(current.output); return; }
      drop(pointer); if (slots.size >= 256) return;
      const roots = [];
      try {
        roots.push(exports.__uwt_root(pointer, 0, 2), exports.__uwt_root(value, 0, 2));
        if (owner) roots.push(exports.__uwt_root(owner, 0, 2));
        const fontState = legacy ? font?.snapshotLegacy(pointer) : font?.snapshot(pointer), originalFont = fontState?.font || 0;
        if (originalFont) roots.push(exports.__uwt_root(originalFont, 0, 2));
        if (fontState?.material) roots.push(exports.__uwt_root(fontState.material, 0, 2));
        if (roots.some(handle => !handle)) throw new Error('Native root unavailable');
        const slot = { text, roots, fontState, legacy, output: text, release: null }; slots.set(pointer, slot);
        slot.apply = output => {
          if (slots.get(pointer) !== slot || disposed) return;
          busy = true;
          let temporary = 0;
          try {
            slot.output = output;
            const next = output === text ? value : string(output);
            if (output !== text) { temporary = exports.__uwt_root(next, 0, 2); if (!temporary) return; }
            original(pointer, next, 0);
            if (legacy) { if (output === text) font?.restoreLegacy(pointer, fontState); else font?.applyLegacy(pointer, output, fontState); }
            else { if (output === text) font?.restore(pointer, fontState); else font?.apply(pointer, output, fontState); }
          }
          finally { if (temporary) exports.__uwt_unroot(temporary); busy = false; }
        };
        slot.release = options.bind('native-' + pointer, text, slot.apply, { kind, speaker: context?.speaker || '', scene: 'native-' + scene });
        options.onBound?.(kind);
      } catch {
        slots.delete(pointer); for (const handle of roots) if (handle) exports.__uwt_unroot(handle);
      }
    }
    function remember(text, kind, name = speaker) {
      register(text, kind, name);
      if (!options.enabled(kind)) return;
      const context = options.context?.();
      options.translate(text, { kind, speaker: name, recordHistory: false }).then(result => {
        if (!disposed && context === options.context?.() && typeof result === 'string' && result !== text) {
          if (translated.size >= 4096) translated.delete(translated.keys().next().value);
          translated.set(text, result);
        }
      }).catch(() => {});
    }
    function wholeLegacy(original, pointer, value, info, context) {
      if (!options.active() || !options.enabled(context.kind)) { drop(pointer); return original(pointer, value, info); }
      const visible = read(value), full = read(context.value);
      if (!visible.trim() || !full.trim()) { drop(pointer); return original(pointer, value, info); }
      const current = slots.get(pointer);
      if (current?.text === full && current.output !== full) return;
      const result = original(pointer, value, info);
      if (current?.text === full) return result;
      let initial = true, lastOutput = full;
      bind(pointer, context.value, (_label, next) => {
        if (initial) { initial = false; return; }
        const output = read(next, 10000);
        if (output === lastOutput) return;
        original(pointer, next, info);
        lastOutput = output;
        if (context.novel) exports.__uwt_original_novelLength?.(pointer, 0x7fffffff, 0);
      }, context.owner, context, true);
      if (slots.has(pointer)) { revealable.add(pointer); options.onStory?.(); }
      return result;
    }
    function reset() {
      for (const pointer of [...slots.keys()]) drop(pointer);
      for (const pointer of [...windows.keys()]) dropWindow(pointer);
      sources.clear(); translated.clear(); glyphs.clear(); revealable.clear(); messageContext = legacyContext = undefined; speaker = ''; scene++;
    }
    function rows(text) {
      // Read only a bounded CSV sample for prefetch. The original script is untouched.
      if (text.length > 1000000) return [];
      const result = []; let row = [], value = '', quoted = false;
      for (let i = 0; i < text.length && result.length < 20000; i++) {
        const char = text[i];
        if (char === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
        else if (!quoted && (char === ',' || char === '\n')) { row.push(value.replace(/\r$/, '')); value = ''; if (char === '\n') { result.push(row); row = []; } }
        else value += char;
      }
      if (value || row.length) { row.push(value); result.push(row); }
      return result;
    }
    const handlers = {
      labelSet(original, pointer, value, info) {
        const result = original(pointer, value, info);
        try { font?.observe(pointer, read(value)); } catch { /* Font observation never blocks native text. */ }
        if (balloons.has(pointer) || revealable.has(pointer)) return result;
        try { bind(pointer, value, original); } catch { /* Preserve the native setter's result. */ }
        return result;
      },
      labelProcessing(original, pointer, info) {
        const result = original(pointer, info);
        if (busy || disposed || revealable.has(pointer)) return result;
        try {
          const value = exports.__uwt_label_text(pointer, 0), text = read(value);
          if (slots.get(pointer)?.output === text) return result;
          font?.observe(pointer, text);
          bind(pointer, value, exports.__uwt_original_labelSet);
        } catch { /* Numeric formatting and array-based text keep their native result. */ }
        return result;
      },
      legacySet(original, pointer, value, info) {
        if (!busy && !disposed) try {
          const context = legacyContext?.labels ? legacyContext.labels.get(pointer) : legacyContext;
          if (context) { font?.observeLegacy(pointer, read(context.value)); return wholeLegacy(original, pointer, value, info, context); }
        } catch { /* Preserve native text if a whole-message context is unavailable. */ }
        const result = original(pointer, value, info);
        if (busy || disposed) return result;
        if (revealable.has(pointer)) { try { if (!read(value).trim()) drop(pointer); } catch { /* Retain native cleanup. */ } return result; }
        try { font?.observeLegacy(pointer, read(value)); bind(pointer, value, original, 0, undefined, true); } catch { /* Preserve legacy text if unavailable. */ }
        return result;
      },
      legacyEnable(original, pointer, info) {
        const result = original(pointer, info);
        if (!revealable.has(pointer)) try { const value = exports.__uwt_legacy_text(pointer, 0); font?.observeLegacy(pointer, read(value)); bind(pointer, value, exports.__uwt_original_legacySet, 0, undefined, true); } catch { /* Serialized text may not be initialized. */ }
        return result;
      },
      legacyDisable(original, pointer, info) { try { if (slots.get(pointer)?.legacy) drop(pointer); font?.forgetLegacy(pointer); } catch { /* Continue native cleanup. */ } return original(pointer, info); },
      legacyDestroy(original, pointer, info) { try { if (slots.get(pointer)?.legacy) drop(pointer); font?.forgetLegacy(pointer); } catch { /* Other graphic components are unaffected. */ } return original(pointer, info); },
      novelWindow(original, pointer, window, info) {
        const previous = legacyContext;
        try {
          const layout = options.layout?.novel, view = new DataView(memory.buffer);
          if (layout && pointer >= 8 && pointer + Math.max(layout.body, layout.name) + 4 <= view.byteLength && window >= 8 && window + 20 <= view.byteLength) {
            const body = view.getUint32(pointer + layout.body, true), name = view.getUint32(pointer + layout.name, true);
            const data = view.getUint32(window + 12, true), nameValue = view.getUint32(window + 16, true);
            const value = data ? exports.__uwt_text_data_raw(data, 0) : 0;
            speaker = read(nameValue); register(speaker, 'name', speaker); register(read(value), 'story', speaker);
            const labels = new Map();
            if (body) labels.set(body, { value, kind: 'story', speaker, owner: pointer, novel: true });
            if (name) labels.set(name, { value: nameValue, kind: 'name', speaker, owner: pointer });
            legacyContext = { labels };
          }
        } catch { legacyContext = previous; }
        try { return original(pointer, window, info); } finally { legacyContext = previous; }
      },
      novelLength(original, pointer, length, info) {
        const slot = slots.get(pointer);
        if (slot?.legacy && slot.output !== slot.text && options.active() && options.enabled('story')) length = 0x7fffffff;
        return original(pointer, length, info);
      },
      messageFrame(original, pointer, deltaTime, info) {
        const previous = messageContext;
        try {
          const layout = options.layout?.message, view = new DataView(memory.buffer);
          if (layout && pointer >= 8 && pointer + Math.max(layout.text, layout.name, layout.view) + 4 <= view.byteLength) {
            const value = view.getUint32(pointer + layout.text, true), nameValue = view.getUint32(pointer + layout.name, true);
            speaker = read(nameValue); register(speaker, 'name', speaker); register(read(value), 'story', speaker);
            messageContext = { value, kind: 'story', speaker, owner: view.getUint32(pointer + layout.view, true) };
          }
        } catch { messageContext = previous; }
        try { return original(pointer, deltaTime, info); } finally { messageContext = previous; }
      },
      messageText(original, pointer, value, info) {
        const previous = legacyContext;
        if (messageContext?.owner === pointer) legacyContext = messageContext;
        try { return original(pointer, value, info); } finally { legacyContext = previous; }
      },
      labelEnable(original, pointer, info) {
        const result = original(pointer, info);
        try { font?.observe(pointer, read(exports.__uwt_label_text(pointer, 0))); } catch { /* Component not ready. */ }
        if (!revealable.has(pointer)) try { bind(pointer, exports.__uwt_label_text(pointer, 0), exports.__uwt_original_labelSet); } catch { /* Component not ready. */ }
        return result;
      },
      labelDisable(original, pointer, info) { try { drop(pointer); font?.forget(pointer); glyphs.delete(pointer); revealable.delete(pointer); } catch { /* Continue native cleanup. */ } return original(pointer, info); },
      labelDestroy(original, pointer, info) { try { drop(pointer); font?.forget(pointer); glyphs.delete(pointer); revealable.delete(pointer); } catch { /* Continue native cleanup. */ } return original(pointer, info); },
      revealText(original, pointer, value, info) {
        if (busy || disposed) return original(pointer, value, info);
        if (revealable.size < 256) revealable.add(pointer);
        const result = original(pointer, value, info);
        try {
          const text = read(value); register(text, 'story');
          let initial = true;
          // Refresh only the renderer. The script source, backlog, voice and command execution stay native.
          bind(pointer, value, (_label, next) => {
            if (initial) { initial = false; return; }
            const progress = exports.__uwt_reveal_progress(pointer, 0);
            original(pointer, next, info);
            exports.__uwt_mesh(pointer, 0, 1, 0);
            if (Number.isFinite(progress)) exports.__uwt_set_reveal_progress(pointer, Math.min(1, Math.max(0, progress)), 0);
          }, 0, { kind: 'story', speaker });
          options.onStory?.();
        } catch { /* Preserve the native printer when a component is unavailable. */ }
        return result;
      },
      scriptPrefetch(original, path, value, file, info) {
        try {
          const script = read(value, 1000000), lookahead = Math.min(10, Math.max(0, options.lookahead?.() ?? 3));
          let count = 0;
          // Warm plain script lines only; commands, variables and embedded events are untouched.
          for (const row of script.split(/\r?\n/).slice(0, 20000)) {
            const line = row.trim();
            if (!line || /^[;@#]/.test(line) || /[{}\[\]]/.test(line)) continue;
            const match = /^([^:\s]{1,80}):\s*(.*)$/.exec(line), name = match?.[1] || '', text = match?.[2] ?? line;
            register(text, 'story', name); if (name) register(name, 'name', name);
            if (count++ < lookahead) { remember(text, 'story', name); if (name) remember(name, 'name', name); }
          }
        } catch { /* Compiled or unavailable scripts need no prefetch. */ }
        return original(path, value, file, info);
      },
      glyphInitialize(original, pointer, letter, parent, active, info) {
        const mark = () => { try {
          const view = new DataView(memory.buffer);
          if (pointer > 0 && pointer + 36 <= view.byteLength) for (const offset of [28, 32]) {
            const label = view.getUint32(pointer + offset, true);
            if (label && glyphs.size < 512) glyphs.add(label);
          }
        } catch { /* Native layout checks never alter letter initialization. */ } };
        mark(); const result = original(pointer, letter, parent, active, info); mark(); return result;
      },
      storyParse(original, pointer, letters, value, info) {
        if (busy) return original(pointer, letters, value, info);
        let temporary = 0;
        try {
          const text = read(value); register(text, 'story');
          const ready = translated.get(text);
          if (ready && options.enabled('story')) { register(ready, 'story'); sources.get(key(ready)).original = text; const next = string(ready); temporary = exports.__uwt_root(next, 0, 2); if (temporary) value = next; }
          else remember(text, 'story');
        } catch { /* Preserve original parsing. */ }
        try { return original(pointer, letters, value, info); } finally { if (temporary) exports.__uwt_unroot(temporary); }
      },
      windowText(original, pointer, value, info) {
        if (busy || disposed) return original(pointer, value, info);
        let text; try { text = read(value); } catch { return original(pointer, value, info); }
        dropWindow(pointer);
        if (!options.active() || !options.enabled('story') || !text.trim() || windows.size >= 16) return original(pointer, value, info);
        register(text, 'story');
        const roots = [], slot = { roots, initialized: false, output: null, release: null };
        let started = false;
        try {
          roots.push(exports.__uwt_root(pointer, 0, 2), exports.__uwt_root(value, 0, 2));
          if (roots.some(handle => !handle)) throw new Error('Native window root unavailable');
          windows.set(pointer, slot);
          const apply = output => {
            if (windows.get(pointer) !== slot || disposed) return;
            if (slot.initialized && slot.output === output) return;
            let temporary = 0;
            const previousBusy = busy, previousReplay = replaying;
            try {
              const next = output === text ? value : string(output);
              if (output !== text) { temporary = exports.__uwt_root(next, 0, 2); if (!temporary) return; }
              busy = true; replaying = slot.initialized; started = true;
              original(pointer, next, info); slot.initialized = true; slot.output = output;
            } finally { if (temporary) exports.__uwt_unroot(temporary); busy = previousBusy; replaying = previousReplay; }
          };
          slot.release = options.bind('native-window-' + pointer, text, apply, { kind: 'story', speaker, scene: 'native-' + scene });
          options.onStory?.();
        } catch (error) {
          if (windows.get(pointer) === slot) dropWindow(pointer); else for (const handle of roots) if (handle) exports.__uwt_unroot(handle);
          if (!started) return original(pointer, value, info);
          throw error;
        }
      },
      windowClear(original, pointer, info) { if (!busy) dropWindow(pointer); return original(pointer, info); },
      windowLog(original, pointer, value, info) { if (!replaying) return original(pointer, value, info); },
      windowDispose(original, pointer, info) { dropWindow(pointer); return original(pointer, info); },
      windowShow(original, pointer, letters, positions, variant, immediately, info) {
        // Refresh visibility only; native timing, interrupts and command completion stay intact.
        return original(pointer, letters, positions, variant, replaying ? 1 : immediately, info);
      },
      balloonStart(original, pointer, value, windowType, fontSize, info) {
        let label;
        try {
          const text = read(value);
          label = new DataView(memory.buffer).getUint32(pointer + 16, true);
          if (!label || !text.trim() || !options.enabled('story')) { if (label) drop(label); return original(pointer, value, windowType, fontSize, info); }
          drop(label); register(text, 'story');
          const context = sources.get(key(text));
          // A balloon owns one complete sentence. Its per-frame prefixes are not UI requests.
          let initialized = false, lastOutput;
          bind(label, value, (_label, output) => {
            const next = read(output, 10000);
            if (initialized && lastOutput === next) return;
            const refresh = initialized;
            original(pointer, output, windowType, fontSize, info);
            initialized = true; lastOutput = next;
            if (refresh) exports.__uwt_balloon_complete?.(pointer, 0);
          }, pointer, context);
          if (!slots.has(label)) return original(pointer, value, windowType, fontSize, info);
          balloons.add(label); options.onStory?.();
          return;
        } catch { return original(pointer, value, windowType, fontSize, info); }
      },
      nameSet(original, pointer, value, info) {
        let temporary = 0;
        try { speaker = read(value); register(speaker, 'name', speaker); const ready = translated.get(speaker); if (ready && options.enabled('name')) { register(ready, 'name', speaker); sources.get(key(ready)).original = speaker; const next = string(ready); temporary = exports.__uwt_root(next, 0, 2); if (temporary) value = next; } else remember(speaker, 'name', speaker); } catch { /* Preserve original name. */ }
        try { return original(pointer, value, info); } finally { if (temporary) exports.__uwt_unroot(temporary); }
      },
      scriptLoad(original, pointer, value, info) {
        try {
          reset(); options.resetHistory?.();
          const script = read(value, 1000000), lookahead = Math.min(10, Math.max(0, options.lookahead?.() ?? 3));
          let count = 0;
          for (const row of rows(script)) {
            if (!['message', 'dotmessage', 'messageTextCenter'].includes(row[0]) || row.length < 3) continue;
            register(row[2], 'story', row[1]); register(row[1], 'name', row[1]);
            if (count++ < lookahead) { remember(row[2], 'story', row[1]); if (row[1]) remember(row[1], 'name', row[1]); }
          }
        } catch { /* Script limits never stop the game. */ }
        return original(pointer, value, info);
      },
    };
    handlers.meshEnable = handlers.labelEnable; handlers.meshDisable = handlers.labelDisable; handlers.meshDestroy = handlers.labelDestroy;
    return { handlers, reset, invalidate: () => { translated.clear(); font?.synchronize(); }, dispose: () => { reset(); disposed = true; font?.dispose(); }, diagnostics: () => ({ nativeBindings: slots.size + windows.size }) };
  }
  root.__UnityNativeLabels = Object.freeze({ builds, create });
})(globalThis);
