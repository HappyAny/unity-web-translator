// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
(function (root) {
  'use strict';
  if (root.__UnityNativeLabels) return;
  const builds = [{
    sha256: '62bd9e5b555b392b10c20e83f52ed118326702a51fc74fa4d4e10250105d8d15',
    importedFunctions: 624,
    hooks: [
      { name: 'labelSet', function: 31008 }, { name: 'labelEnable', function: 31532 },
      { name: 'labelDisable', function: 31534 }, { name: 'labelDestroy', function: 31535 },
      { name: 'storyParse', function: 67659 }, { name: 'nameSet', function: 56345 },
      { name: 'scriptLoad', function: 113268 },
      { name: 'balloonStart', function: 66103 },
      { name: 'glyphInitialize', function: 68187 },
      { name: 'windowText', function: 56350 }, { name: 'windowClear', function: 56344 },
      { name: 'windowLog', function: 56351 }, { name: 'windowDispose', function: 56357 },
    ],
    exports: { __uwt_string: 151240, __uwt_label_text: 31006, __uwt_root: 167969, __uwt_unroot: 167959,
      __uwt_type: 1616, __uwt_array: 1319, __uwt_write_file: 143267, __uwt_create_font: 31790,
      __uwt_font: 12833, __uwt_set_font: 31010, __uwt_add_chars: 31842,
      __uwt_font_material: 4636, __uwt_label_material: 5142, __uwt_set_material: 31011,
      __uwt_color: 31017, __uwt_set_color: 31018, __uwt_property: 129310,
      __uwt_has_property: 129494, __uwt_material_color: 129475,
      __uwt_fallbacks: 14415, __uwt_clear_fallbacks: 31812, __uwt_dirty: 31134 },
  }];
  function create(exports, options) {
    const slots = new Map(), windows = new Map(), sources = new Map(), translated = new Map(), balloons = new Set(), glyphs = new Set();
    let scene = 0, speaker = '', busy = false, replaying = false, disposed = false;
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
    const font = root.__UnityNativeFont?.create(exports, { string, load: options.loadFont, status: options.fontStatus,
      active: () => options.active() && (options.enabled('story') || options.enabled('ui')),
      ready: () => { for (const slot of slots.values()) if (slot.output !== slot.text) slot.apply?.(slot.output); } });
    function drop(pointer) {
      const slot = slots.get(pointer); if (!slot) return;
      slots.delete(pointer); balloons.delete(pointer); slot.release?.();
      if (slot.fontState) try { font?.restore(pointer, slot.fontState); } catch { /* Component may already be disposing. */ }
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
    function bind(pointer, value, original, owner = 0, knownContext) {
      if (disposed || busy) return;
      if (glyphs.has(pointer)) return;
      if (!options.active()) { drop(pointer); return; }
      let text; try { text = read(value); } catch { return; }
      if (!text.trim() || text.length > 2000) { drop(pointer); return; }
      const context = knownContext || sources.get(key(text)), kind = context?.kind || 'ui';
      if (!options.enabled(kind) || (!context && !japanese(text))) { drop(pointer); return; }
      if (context?.original) { text = context.original; value = string(text); }
      if (slots.get(pointer)?.text === text) return;
      drop(pointer); if (slots.size >= 256) return;
      const roots = [];
      try {
        roots.push(exports.__uwt_root(pointer, 0, 2), exports.__uwt_root(value, 0, 2));
        if (owner) roots.push(exports.__uwt_root(owner, 0, 2));
        const fontState = font?.snapshot(pointer), originalFont = fontState?.font || 0;
        if (originalFont) roots.push(exports.__uwt_root(originalFont, 0, 2));
        if (fontState?.material) roots.push(exports.__uwt_root(fontState.material, 0, 2));
        if (roots.some(handle => !handle)) throw new Error('Native root unavailable');
        const slot = { text, roots, fontState, output: text, release: null }; slots.set(pointer, slot);
        slot.apply = output => {
          if (slots.get(pointer) !== slot || disposed) return;
          busy = true;
          let temporary = 0;
          try {
            slot.output = output;
            const next = output === text ? value : string(output);
            if (output !== text) { temporary = exports.__uwt_root(next, 0, 2); if (!temporary) return; }
            original(pointer, next, 0);
            if (output === text) font?.restore(pointer, fontState); else font?.apply(pointer, output, fontState);
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
    function reset() {
      for (const pointer of [...slots.keys()]) drop(pointer);
      for (const pointer of [...windows.keys()]) dropWindow(pointer);
      sources.clear(); translated.clear(); glyphs.clear(); speaker = ''; scene++;
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
        if (balloons.has(pointer)) return result;
        try { bind(pointer, value, original); } catch { /* Preserve the native setter's result. */ }
        return result;
      },
      labelEnable(original, pointer, info) {
        const result = original(pointer, info);
        try { font?.observe(pointer, read(exports.__uwt_label_text(pointer, 0))); } catch { /* Component not ready. */ }
        try { bind(pointer, exports.__uwt_label_text(pointer, 0), exports.__uwt_original_labelSet); } catch { /* Component not ready. */ }
        return result;
      },
      labelDisable(original, pointer, info) { try { drop(pointer); font?.forget(pointer); glyphs.delete(pointer); } catch { /* Continue native cleanup. */ } return original(pointer, info); },
      labelDestroy(original, pointer, info) { try { drop(pointer); font?.forget(pointer); glyphs.delete(pointer); } catch { /* Continue native cleanup. */ } return original(pointer, info); },
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
        const roots = [], slot = { roots, initialized: false, release: null };
        let started = false;
        try {
          roots.push(exports.__uwt_root(pointer, 0, 2), exports.__uwt_root(value, 0, 2));
          if (roots.some(handle => !handle)) throw new Error('Native window root unavailable');
          windows.set(pointer, slot);
          const apply = output => {
            if (windows.get(pointer) !== slot || disposed) return;
            let temporary = 0;
            const previousBusy = busy, previousReplay = replaying;
            try {
              const next = output === text ? value : string(output);
              if (output !== text) { temporary = exports.__uwt_root(next, 0, 2); if (!temporary) return; }
              busy = true; replaying = slot.initialized; started = true;
              original(pointer, next, info); slot.initialized = true;
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
      balloonStart(original, pointer, value, windowType, fontSize, info) {
        let label;
        try {
          const text = read(value);
          label = new DataView(memory.buffer).getUint32(pointer + 16, true);
          if (!label || !text.trim() || !options.enabled('story')) { if (label) drop(label); return original(pointer, value, windowType, fontSize, info); }
          drop(label); register(text, 'story');
          const context = sources.get(key(text));
          // A balloon owns one complete sentence. Its per-frame prefixes are not UI requests.
          bind(label, value, (_label, output) => original(pointer, output, windowType, fontSize, info), pointer, context);
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
    return { handlers, reset, invalidate: () => { translated.clear(); font?.synchronize(); }, dispose: () => { reset(); disposed = true; font?.dispose(); }, diagnostics: () => ({ nativeBindings: slots.size + windows.size }) };
  }
  root.__UnityNativeLabels = Object.freeze({ builds, create });
})(globalThis);
