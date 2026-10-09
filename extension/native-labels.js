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
      { name: 'labelProcessing', function: 31180 },
      { name: 'labelDrawing', function: 31510 }, { name: 'meshDrawing', function: 31452 },
      { name: 'meshEnable', function: 31467 }, { name: 'meshDisable', function: 31468 },
      { name: 'meshDestroy', function: 31469 },
      { name: 'legacySet', function: 108362 }, { name: 'legacyEnable', function: 108386 },
      { name: 'legacyDisable', function: 108387 }, { name: 'legacyDestroy', function: 30377 },
      { name: 'legacyProcessing', function: 108393 },
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
      __uwt_balloon_complete: 66110, __uwt_legacy_text: 11263,
      __uwt_legacy_font: 108359, __uwt_legacy_set_font: 108361 },
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
      { name: 'labelDrawing', function: 33178 }, { name: 'meshDrawing', function: 33119 },
      { name: 'meshEnable', function: 33134 }, { name: 'meshDisable', function: 33135 },
      { name: 'meshDestroy', function: 33136 },
      { name: 'legacySet', function: 139210 }, { name: 'legacyEnable', function: 139234 },
      { name: 'legacyDisable', function: 139235 }, { name: 'legacyDestroy', function: 92525 },
      { name: 'legacyProcessing', function: 139241 },
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
    font: { byteArrayTypeAddress: 8391080, legacyTypeAddress: 8398628, createFontFromLegacy: true, legacyPreferFallback: true,
      legacyNamesArray: true, stringArrayTypeAddress: 8392052,
      legacyNativeData: { data: 48, buffer: 76, length: 84, capacity: 88, dynamic: 36, copy: true,
        metrics: { ascent: 176, lineHeight: 32, fontSize: 36 } } },
    layout: { novel: { body: 68, name: 72, textType: 8412656, pageData: 76, pageCommand: 84, pageMax: 104, pageCommands: 12, commandLineBreak: 29 } },
    hooks: [
      { name: 'labelSet', function: 133895 }, { name: 'labelEnable', function: 134421 },
      { name: 'labelDisable', function: 134413 }, { name: 'labelDestroy', function: 134408 },
      { name: 'labelProcessing', function: 8929 }, { name: 'meshEnable', function: 134710 },
      { name: 'labelDrawing', function: 13676 }, { name: 'meshDrawing', function: 13690 },
      { name: 'meshDisable', function: 134709 }, { name: 'meshDestroy', function: 134708 },
      { name: 'legacySet', function: 184705 }, { name: 'legacyEnable', function: 73257 },
      { name: 'legacyDisable', function: 73256 }, { name: 'legacyDestroy', function: 43092 },
      { name: 'legacyProcessing', function: 184685 },
      { name: 'novelWindow', function: 123757 }, { name: 'novelLength', function: 17997 },
      { name: 'novelDrawing', function: 115410 },
    ],
    exports: { __uwt_string: 68674, __uwt_label_text: 133901, __uwt_root: 30849, __uwt_unroot: 175606,
      __uwt_write_file: 31346, __uwt_create_font: 43274, __uwt_font: 2999, __uwt_set_font: 29135,
      __uwt_add_chars: 95755, __uwt_fallbacks: 4516, __uwt_dirty: 134570, __uwt_legacy_ctor: 27465,
      __uwt_legacy_has_char: 18055, __uwt_legacy_request_chars: 116142, __uwt_legacy_dynamic: 6059, __uwt_legacy_font: 184707,
      __uwt_legacy_set_font: 5804, __uwt_legacy_text: 2917, __uwt_text_data_raw: 6739, __uwt_type: 612,
      __uwt_novel_engine: 3844, __uwt_engine_page: 1287, __uwt_command_text: 8431,
      __uwt_text_data_plain: 7583, __uwt_text_data_length: 10191, __uwt_text_data_ctor: 6048, __uwt_novel_dirty: 115402,
      __uwt_array: 628, __uwt_new_object: 615, __uwt_legacy_initialize_native: 61843,
      __uwt_legacy_refresh_native: 10557, __uwt_legacy_reserve_native: 1131 },
  }, {
    sha256: '71962a64c4e0f31ff858f2b83346de116d7709c5fbada7dbce468b27997206c6',
    importedFunctions: 589,
    runtimeExports: { memory: 'Yj', __indirect_function_table: 'yk', malloc: 'mk', free: 'nk' },
    font: { byteArrayTypeAddress: 5983264, legacyTypeAddress: 5951480, legacyNamesArray: true,
      stringArrayTypeAddress: 5983396, legacyPreferFallback: true,
      legacyNativeData: { data: 40, buffer: 124, length: 132, capacity: 136, dynamic: 84, copy: true,
        metrics: { ascent: 228, lineHeight: 24, fontSize: 28 } } },
    layout: { message: { text: 8, name: 12, view: 24 },
      instruction: { message: 1, name: 0, text: 1, offset: 8, lineFeed: '$n', marker: '$' } },
    hooks: [
      { name: 'legacySet', function: 49186 }, { name: 'legacyEnable', function: 49161 },
      { name: 'legacyDisable', function: 49160 }, { name: 'legacyDestroy', function: 48977 },
      { name: 'legacyProcessing', function: 49155 },
      { name: 'messageFrame', function: 26272 }, { name: 'messageText', function: 16537 },
      { name: 'nameSet', function: 26293 },
      { name: 'scriptInitialize', function: 27278 }, { name: 'scriptInstruction', function: 58481 },
      { name: 'scriptAdvance', function: 26178 }, { name: 'scriptDispose', function: 58483 },
    ],
    exports: { __uwt_string: 1212, __uwt_label_text: 5053, __uwt_root: 113391, __uwt_unroot: 113379,
      __uwt_write_file: 113636, __uwt_legacy_ctor: 69089, __uwt_legacy_has_char: 28015, __uwt_legacy_dynamic: 69112,
      __uwt_legacy_material: 12228,
      __uwt_legacy_font: 49188, __uwt_legacy_set_font: 7282, __uwt_legacy_text: 5053, __uwt_type: 589,
      __uwt_array: 599, __uwt_new_object: 591, __uwt_instruction_string: 6831, __uwt_legacy_initialize_native: 27948,
      __uwt_legacy_refresh_native: 5970, __uwt_legacy_reserve_native: 1078 },
  }];
  function create(exports, options) {
    const slots = new Map(), windows = new Map(), sources = new Map(), translated = new Map(), balloons = new Set(), glyphs = new Set();
    const revealable = new Set(), novels = new Map(), novelLabels = new Set();
    const warming = new Map(), localized = new Map();
    const skipped = { language: 0, length: 0, capacity: 0, unreadable: 0 };
    const novelCapture = { commands: 0, unverified: 0, last: null };
    let observed = 0;
    let scriptPlan, scriptCollector, prefetchGeneration = 0, prefetchBusy = false;
    let scene = 0, speaker = '', busy = false, replaying = false, disposed = false, messageContext, legacyContext;
    const memory = exports.memory;
    if (!(memory instanceof WebAssembly.Memory)) throw new Error('Native memory unavailable');
    for (const name of ['malloc', 'free', '__uwt_string', '__uwt_label_text', '__uwt_root', '__uwt_unroot']) if (typeof exports[name] !== 'function') throw new Error('Native string helpers unavailable');
    const key = text => text.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]{1,100}>/g, '').replace(/\r\n/g, '\n');
    const japanese = text => /[\u3040-\u30ff\uff66-\uff9f\u3400-\u9fff]/.test(text);
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
      if (slot.outputRoot) exports.__uwt_unroot(slot.outputRoot);
      if (slot.novel?.renderRoot) { exports.__uwt_unroot(slot.novel.renderRoot); slot.novel.renderRoot = slot.novel.renderValue = 0; }
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
      observed++;
      let text; try { text = read(value); } catch (error) {
        skipped[error.message === 'Managed string size limit' ? 'length' : 'unreadable']++; drop(pointer); return;
      }
      if (!text.trim()) { drop(pointer); return; }
      const current = slots.get(pointer);
      if (current?.output === text && current.text !== text) { current.apply?.(current.output); return; }
      const context = knownContext || sources.get(key(text)) || localized.get(key(text)), kind = context?.kind || 'ui';
      if (!context && localized.has(key(text))) return;
      if (!options.enabled(kind)) { drop(pointer); return; }
      if (!context && !japanese(text)) { skipped.language++; drop(pointer); return; }
      if (context?.original) { text = context.original; value = string(text); }
      if (current?.text === text) { if (current.output !== text) current.apply?.(current.output); return; }
      drop(pointer); if (slots.size >= 256) { skipped.capacity++; return; }
      const roots = []; let slot;
      try {
        roots.push(exports.__uwt_root(pointer, 0, 2), exports.__uwt_root(value, 0, 2));
        if (owner) roots.push(exports.__uwt_root(owner, 0, 2));
        if (knownContext?.novel?.fullValue) roots.push(exports.__uwt_root(knownContext.novel.fullValue, 0, 2));
        const fontState = legacy ? font?.snapshotLegacy(pointer) : font?.snapshot(pointer), originalFont = fontState?.font || 0;
        if (originalFont) roots.push(exports.__uwt_root(originalFont, 0, 2));
        if (fontState?.material) roots.push(exports.__uwt_root(fontState.material, 0, 2));
        if (roots.some(handle => !handle)) throw new Error('Native root unavailable');
        slot = { text, kind, roots, fontState, legacy, novel: knownContext?.novel, output: text, outputValue: value, outputRoot: 0, release: null }; slots.set(pointer, slot);
        slot.apply = output => {
          if (slots.get(pointer) !== slot || disposed) return;
          const previousBusy = busy; busy = true;
          try {
            let next = value, outputRoot = 0;
            if (output === slot.output) { next = slot.outputValue; outputRoot = slot.outputRoot; }
            else if (output !== text) { next = string(output); outputRoot = exports.__uwt_root(next, 0, 2); if (!outputRoot) return; }
            const previousRoot = slot.outputRoot;
            slot.output = output; slot.outputValue = next; slot.outputRoot = outputRoot;
            if (previousRoot && previousRoot !== outputRoot) exports.__uwt_unroot(previousRoot);
            if (output !== text) {
              if (localized.size >= 4096 && !localized.has(key(output))) localized.delete(localized.keys().next().value);
              const normalized = key(output), previous = localized.get(normalized);
              // Colliding outputs cannot identify an original after a pooled component is released.
              localized.set(normalized, localized.has(normalized) && (!previous || previous.original !== text) ? null : { original: text, kind, speaker: context?.speaker || '' });
            }
            original(pointer, next, 0);
            if (legacy) { if (output === text) font?.restoreLegacy(pointer, fontState); else font?.applyLegacy(pointer, output, fontState); }
            else { if (output === text) font?.restore(pointer, fontState); else font?.apply(pointer, output, fontState); }
          }
          finally { busy = previousBusy; }
        };
        const ready = translated.get(text);
        slot.release = options.bind('native-' + pointer, text, slot.apply, { kind, speaker: context?.speaker || '', scene: 'native-' + scene }, ready);
        if (ready && ready !== text) slot.apply(ready);
        options.onBound?.(kind);
      } catch {
        if (slot) { if (slots.get(pointer) === slot) drop(pointer); }
        else for (const handle of roots) if (handle) exports.__uwt_unroot(handle);
      }
    }
    function stableText(pointer, value) {
      if (busy || disposed || (!revealable.has(pointer) && !balloons.has(pointer))) return value;
      const slot = slots.get(pointer); if (!slot) return value;
      try {
        const text = read(value, 10000);
        if (!text.trim()) { drop(pointer); return value; }
        if (!options.active() || !options.enabled(slot.kind) || slot.output === slot.text) return value;
        const normalized = key(text);
        if (slot.novel?.renderValue && normalized === key(slot.novel.full)) return slot.novel.renderValue;
        // Advance and reveal updates may repeat the source outside the full-message callback.
        // Substitute before the native setter; replaying the renderer would restart its timing.
        if (normalized && (key(slot.text).startsWith(normalized) || key(slot.output).startsWith(normalized))) return slot.outputValue;
        drop(pointer);
      } catch { /* Unknown native input retains its original behavior. */ }
      return value;
    }
    function remember(text, kind, name = speaker) {
      register(text, kind, name);
      if (!options.active() || !options.enabled(kind)) return Promise.resolve(text);
      if (translated.has(text)) return Promise.resolve(translated.get(text));
      const context = options.context?.(), generation = scene, id = JSON.stringify([kind, name, text]);
      if (warming.has(id)) return warming.get(id);
      const work = Promise.resolve().then(() => {
        if (disposed || generation !== scene || context !== options.context?.() || !options.active() || !options.enabled(kind)) return text;
        return options.translate(text, { kind, speaker: name, recordHistory: false,
          isCurrent: () => !disposed && generation === scene && context === options.context?.() });
      }).then(result => {
        if (!disposed && generation === scene && context === options.context?.() && warming.get(id) === work && typeof result === 'string' && result !== text) {
          if (translated.size >= 4096) translated.delete(translated.keys().next().value);
          translated.set(text, result);
        }
        return result;
      }).catch(() => text).finally(() => { if (warming.get(id) === work) warming.delete(id); });
      warming.set(id, work); return work;
    }
    function lookahead() {
      const value = options.lookahead?.() ?? 2;
      return Number.isInteger(value) ? Math.min(20, Math.max(0, value)) : 2;
    }
    function warmUpcoming() {
      const plan = scriptPlan;
      if (!plan || prefetchBusy || disposed || !options.active() || !options.enabled('story')) return;
      const next = () => {
        const end = Math.min(plan.rows.length, plan.cursor + 1 + lookahead());
        for (let index = plan.cursor + 1; index < end; index++) if (!plan.prepared.has(index)) return index;
        return -1;
      };
      if (next() < 0) return;
      const generation = prefetchGeneration; prefetchBusy = true;
      // One background line at a time leaves capacity for the displayed dialogue.
      (async () => {
        while (!disposed && scriptPlan === plan && generation === prefetchGeneration && options.active() && options.enabled('story')) {
          const index = next(); if (index < 0) break;
          const row = plan.rows[index]; plan.prepared.add(index);
          const output = await remember(row.text, 'story', row.speaker);
          if (scriptPlan !== plan || generation !== prefetchGeneration || disposed || !options.active() || !options.enabled('story')) break;
          if (output !== row.text) { plan.ready++; options.onPrefetch?.('ready', plan.ready); }
          if (row.speaker) await remember(row.speaker, 'name', row.speaker);
        }
      })().catch(() => {}).finally(() => { if (generation === prefetchGeneration) prefetchBusy = false; });
    }
    function wholeLegacy(original, pointer, value, info, context) {
      if (!options.active() || !options.enabled(context.kind)) { drop(pointer); return original(pointer, value, info); }
      if (context.novelUnsupported) { drop(pointer); return original(pointer, value, info); }
      const visible = read(value, context.novel ? 20000 : 2000), full = read(context.value);
      if (!visible.trim() || !full.trim()) { if (!context.novel) drop(pointer); return original(pointer, value, info); }
      const current = slots.get(pointer);
      if (current?.text === full && current.output !== full) {
        if (context.novel?.renderValue) return original(pointer, context.novel.renderValue, info);
        return;
      }
      const result = original(pointer, value, info);
      if (current?.text === full) return result;
      let initial = true, lastOutput = full, lastRevision = context.novel?.record.revision;
      bind(pointer, context.value, (_label, next) => {
        const output = read(next, 10000);
        if (initial) { initial = false; if (output === full) return; }
        if (output === lastOutput && lastRevision === context.novel?.record.revision) return;
        if (context.novel) renderNovel(pointer, context.novel, next, output, original, info);
        else original(pointer, next, info);
        lastOutput = output;
        lastRevision = context.novel?.record.revision;
      }, context.owner, context, true);
      if (slots.has(pointer)) { revealable.add(pointer); options.onStory?.(); }
      return result;
    }
    function novelTextInfo(value) {
      const address = options.layout?.novel?.textType, roots = [];
      try {
        if (!Number.isInteger(address) || address < 8 || address + 4 > memory.buffer.byteLength) throw new Error('Native text parser unavailable');
        roots.push(exports.__uwt_root(value, 0, 2));
        if (!roots[0]) throw new Error('Native text root unavailable');
        exports.__uwt_type(address);
        const type = new DataView(memory.buffer).getUint32(address, true);
        if (!type) throw new Error('Native text type unavailable');
        const data = exports.__uwt_new_object(type); roots.push(exports.__uwt_root(data, 0, 2));
        if (!data || !roots.at(-1)) throw new Error('Native text data unavailable');
        exports.__uwt_text_data_ctor(data, value, 0);
        const plain = read(exports.__uwt_text_data_plain(data, 0), 10000), length = exports.__uwt_text_data_length(data, 0);
        if (!Number.isInteger(length) || length < 0 || length > 10000) throw new Error('Native text count unavailable');
        return { plain, length };
      } finally { for (const handle of roots) if (handle) exports.__uwt_unroot(handle); }
    }
    function prepareNovel(pointer, owner, data, fullValue, nativeLength) {
      const layout = options.layout?.novel;
      const engine = exports.__uwt_novel_engine(owner, 0);
      if (!engine) return;
      const page = exports.__uwt_engine_page(engine, 0);
      const view = new DataView(memory.buffer);
      if (page < 8 || page + Math.max(layout.pageMax, layout.pageCommand, layout.pageData) + 4 > view.byteLength) return;
      const command = view.getUint32(page + layout.pageCommand, true), pageData = view.getUint32(page + layout.pageData, true);
      if (command < 8 || command + layout.commandLineBreak >= view.byteLength || !pageData) return;
      const value = exports.__uwt_command_text(command, 0), text = read(value);
      if (!text.trim()) return;
      const full = read(fullValue, 20000), plain = read(exports.__uwt_text_data_plain(data, 0), 20000);
      const total = exports.__uwt_text_data_length(data, 0), current = novelTextInfo(value);
      const joiner = new DataView(memory.buffer).getUint8(command + layout.commandLineBreak) ? '\n' : '';
      const end = new DataView(memory.buffer).getInt32(page + layout.pageMax, true), start = end - current.length - joiner.length;
      // Require the native parser and command boundaries to agree before replacing a page.
      if (plain.length !== total || current.plain.length !== current.length || start < 0 || end > total || plain.slice(start, end) !== current.plain + joiner) return;
      let record = novels.get(pointer);
      if (!record || record.pageData !== pageData || record.full !== full) {
        drop(pointer);
        if (novels.size >= 256 && !novels.has(pointer)) novels.delete(novels.keys().next().value);
        record = { pageData, full, plain, entries: new Map(), current: null, revision: 0 }; novels.set(pointer, record);
        prepareNovelPrefetch(record, command);
      }
      if (record.plan) { const index = record.plan.commands.indexOf(command); if (index >= 0) { record.plan.cursor = index; scriptPlan = record.plan; } }
      if (record.current?.command === command && record.current.text === text && record.current.end === end) {
        record.current.nativeLength = nativeLength; return record.current;
      }
      drop(pointer);
      const capture = { sourceStart: start, sourceEnd: end, currentCharacters: current.length, pageCharacters: total,
        nativeVisible: nativeLength, displayVisible: nativeLength, translated: false };
      const stage = { record, command, value, text, full, fullValue, start, end, joiner, nativeLength, capture, renderRoot: 0, renderValue: 0 };
      novelCapture.commands++; novelCapture.last = capture;
      record.current = stage; return stage;
    }
    function prepareNovelPrefetch(record, current) {
      try {
        const layout = options.layout.novel, view = new DataView(memory.buffer);
        const pageData = record.pageData;
        if (pageData + layout.pageCommands + 4 > view.byteLength) return;
        const list = view.getUint32(pageData + layout.pageCommands, true);
        if (list < 8 || list + 16 > view.byteLength) return;
        const items = view.getUint32(list + 8, true), size = view.getInt32(list + 12, true);
        if (items < 8 || items + 16 > view.byteLength || size < 1 || size > 512) return;
        const capacity = view.getUint32(items + 12, true);
        if (size > capacity || capacity > 2048 || items + 16 + capacity * 4 > view.byteLength) return;
        const commands = Array.from({ length: size }, (_v, index) => view.getUint32(items + 16 + index * 4, true));
        if (!commands.includes(current) || commands.some(pointer => pointer < 8 || pointer + layout.commandLineBreak >= view.byteLength)) return;
        const rows = commands.map(pointer => ({ text: read(exports.__uwt_command_text(pointer, 0)), speaker: '' }));
        prefetchGeneration++; prefetchBusy = false;
        record.plan = { commands, rows, cursor: commands.indexOf(current), prepared: new Set(), ready: 0 };
      } catch { /* Optional lookahead never changes native playback. */ }
    }
    function novelVisible(stage, length) {
      // The native renderer treats every negative view length as show-all.
      // The translated buffer contains only commands already reached by the player.
      if (length < 0) return length;
      if (length < stage.start && stage.start > 0) return Math.floor(Math.max(0, length) * stage.prefixLength / stage.start);
      const progress = Math.min(1, Math.max(0, (length - stage.start) / Math.max(1, stage.end - stage.start)));
      return stage.prefixLength + Math.ceil(stage.currentLength * progress);
    }
    function renderNovel(pointer, stage, next, output, original, info) {
      if (output === stage.text) {
        original(pointer, stage.fullValue, info);
        exports.__uwt_original_novelLength(pointer, stage.nativeLength, 0);
        Object.assign(stage.capture, { nativeVisible: stage.nativeLength, displayVisible: stage.nativeLength, translated: false });
        if (stage.renderRoot) exports.__uwt_unroot(stage.renderRoot);
        stage.renderRoot = stage.renderValue = 0; return;
      }
      let prefix = '', position = 0;
      for (const entry of [...stage.record.entries.values()].sort((a, b) => a.start - b.start)) {
        if (entry.end > stage.start || entry.start < position) continue;
        prefix += stage.record.plain.slice(position, entry.start) + entry.output;
        position = entry.end;
      }
      prefix += stage.record.plain.slice(position, stage.start);
      const renderText = prefix + output + stage.joiner, renderValue = string(renderText), renderRoot = exports.__uwt_root(renderValue, 0, 2);
      if (!renderRoot) return;
      const previousRoot = stage.renderRoot;
      try {
        const complete = novelTextInfo(renderValue), current = novelTextInfo(next);
        stage.prefixLength = complete.length - current.length - stage.joiner.length;
        stage.currentLength = current.length + stage.joiner.length;
        // Set the verified CJK face before the custom renderer reads glyph metrics.
        font?.applyLegacy(pointer, renderText, slots.get(pointer)?.fontState);
        original(pointer, renderValue, info);
        exports.__uwt_novel_dirty?.(pointer, 0);
        const visible = novelVisible(stage, stage.nativeLength);
        exports.__uwt_original_novelLength(pointer, visible, 0);
        Object.assign(stage.capture, { nativeVisible: stage.nativeLength, displayVisible: visible, translated: true });
        stage.renderValue = renderValue; stage.renderRoot = renderRoot;
        if (stage.record.entries.size >= 128 && !stage.record.entries.has(stage.command)) stage.record.entries.delete(stage.record.entries.keys().next().value);
        stage.record.entries.set(stage.command, { start: stage.start, end: stage.end, output: output + stage.joiner });
        if (localized.size >= 4096 && !localized.has(key(renderText))) localized.delete(localized.keys().next().value);
        localized.set(key(renderText), null);
      } catch (error) { exports.__uwt_unroot(renderRoot); throw error; }
      if (previousRoot) exports.__uwt_unroot(previousRoot);
    }
    function reset() {
      for (const pointer of [...slots.keys()]) drop(pointer);
      for (const pointer of [...windows.keys()]) dropWindow(pointer);
      sources.clear(); translated.clear(); warming.clear(); glyphs.clear(); revealable.clear(); novels.clear(); novelLabels.clear(); messageContext = legacyContext = undefined; speaker = ''; scene++;
      scriptPlan = scriptCollector = undefined; prefetchGeneration++; prefetchBusy = false;
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
        const protectedLabel = balloons.has(pointer) || revealable.has(pointer);
        value = stableText(pointer, value);
        const result = original(pointer, value, info);
        try { font?.observe(pointer, read(value)); } catch { /* Font observation never blocks native text. */ }
        if (protectedLabel) return result;
        try { bind(pointer, value, original); } catch { /* Preserve the native setter's result. */ }
        return result;
      },
      labelProcessing(original, pointer, info) {
        const protectedLabel = balloons.has(pointer) || revealable.has(pointer);
        if (protectedLabel) try {
          const value = exports.__uwt_label_text(pointer, 0), next = stableText(pointer, value);
          if (next !== value) exports.__uwt_original_labelSet(pointer, next, 0);
        } catch { /* Unavailable fields retain native processing. */ }
        const result = original(pointer, info);
        if (busy || disposed || protectedLabel) return result;
        try {
          const value = exports.__uwt_label_text(pointer, 0);
          if (slots.get(pointer)?.outputValue === value) return result;
          try { font?.observe(pointer, read(value)); } catch { /* Font observation does not suppress capture. */ }
          bind(pointer, value, exports.__uwt_original_labelSet);
        } catch { /* Numeric formatting and array-based text keep their native result. */ }
        return result;
      },
      legacySet(original, pointer, value, info) {
        if (!busy && !disposed) try {
          const context = legacyContext?.labels ? legacyContext.labels.get(pointer) : legacyContext;
          if (context) { font?.observeLegacy(pointer, read(context.value)); return wholeLegacy(original, pointer, value, info, context); }
        } catch { /* Preserve native text if a whole-message context is unavailable. */ }
        const protectedLabel = revealable.has(pointer) || novelLabels.has(pointer);
        value = stableText(pointer, value);
        const result = original(pointer, value, info);
        if (busy || disposed) return result;
        if (protectedLabel) return result;
        try { font?.observeLegacy(pointer, read(value)); } catch { /* Font observation does not suppress capture. */ }
        try { bind(pointer, value, original, 0, undefined, true); } catch { /* Preserve legacy text if unavailable. */ }
        return result;
      },
      legacyEnable(original, pointer, info) {
        const result = original(pointer, info);
        if (!revealable.has(pointer) && !novelLabels.has(pointer)) try {
          const value = exports.__uwt_legacy_text(pointer, 0);
          try { font?.observeLegacy(pointer, read(value)); } catch { /* Font observation does not suppress capture. */ }
          bind(pointer, value, exports.__uwt_original_legacySet, 0, undefined, true);
        } catch { /* Serialized text may not be initialized. */ }
        return result;
      },
      legacyProcessing(original, pointer, mesh, info) {
        const result = original(pointer, mesh, info);
        if (busy || disposed || revealable.has(pointer) || novelLabels.has(pointer)) return result;
        try {
          const value = exports.__uwt_legacy_text(pointer, 0);
          if (slots.get(pointer)?.outputValue === value) return result;
          try { font?.observeLegacy(pointer, read(value)); } catch { /* Font observation does not suppress capture. */ }
          bind(pointer, value, exports.__uwt_original_legacySet, 0, undefined, true);
        } catch { /* Unknown renderers keep their native mesh. */ }
        return result;
      },
      legacyDisable(original, pointer, info) { try { if (slots.get(pointer)?.legacy) drop(pointer); novels.delete(pointer); font?.forgetLegacy(pointer); } catch { /* Continue native cleanup. */ } return original(pointer, info); },
      legacyDestroy(original, pointer, info) { try { if (slots.get(pointer)?.legacy) drop(pointer); novels.delete(pointer); novelLabels.delete(pointer); font?.forgetLegacy(pointer); } catch { /* Other graphic components are unaffected. */ } return original(pointer, info); },
      novelWindow(original, pointer, window, info) {
        const previous = legacyContext;
        try {
          const layout = options.layout?.novel, view = new DataView(memory.buffer);
          if (layout && pointer >= 8 && pointer + Math.max(layout.body, layout.name) + 4 <= view.byteLength && window >= 8 && window + 28 <= view.byteLength) {
            const body = view.getUint32(pointer + layout.body, true), name = view.getUint32(pointer + layout.name, true);
            const data = view.getUint32(window + 12, true), nameValue = view.getUint32(window + 16, true), nativeLength = view.getInt32(window + 24, true);
            const value = data ? exports.__uwt_text_data_raw(data, 0) : 0;
            speaker = read(nameValue); register(speaker, 'name', speaker);
            const labels = new Map();
            if (body) {
              if (novelLabels.size < 256) novelLabels.add(body);
              let novel;
              try { if (data) novel = prepareNovel(body, pointer, data, value, nativeLength); } catch { /* Unverified boundaries retain the original masked page. */ }
              if (!novel) novelCapture.unverified++;
              if (novel) register(novel.text, 'story', speaker);
              labels.set(body, { value: novel?.value || value, kind: 'story', speaker, owner: pointer, novel, novelUnsupported: !novel });
            }
            if (name) labels.set(name, { value: nameValue, kind: 'name', speaker, owner: pointer });
            legacyContext = { labels };
          }
        } catch { legacyContext = previous; }
        try { return original(pointer, window, info); } finally { legacyContext = previous; warmUpcoming(); }
      },
      novelLength(original, pointer, length, info) {
        const slot = slots.get(pointer);
        if (slot?.novel) {
          slot.novel.nativeLength = length;
          slot.novel.capture.nativeVisible = length;
          if (slot.novel.renderValue && slot.output !== slot.text && options.active() && options.enabled('story')) length = novelVisible(slot.novel, length);
          slot.novel.capture.displayVisible = length;
        }
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
        try { return original(pointer, deltaTime, info); } finally { messageContext = previous; warmUpcoming(); }
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
          const script = read(value, 1000000), countAhead = lookahead();
          let count = 0;
          // Warm plain script lines only; commands, variables and embedded events are untouched.
          for (const row of script.split(/\r?\n/).slice(0, 20000)) {
            const line = row.trim();
            if (!line || /^[;@#]/.test(line) || /[{}\[\]]/.test(line)) continue;
            const match = /^([^:\s]{1,80}):\s*(.*)$/.exec(line), name = match?.[1] || '', text = match?.[2] ?? line;
            register(text, 'story', name); if (name) register(name, 'name', name);
            if (count++ < countAhead) { remember(text, 'story', name); if (name) remember(name, 'name', name); }
          }
        } catch { /* Compiled or unavailable scripts need no prefetch. */ }
        return original(path, value, file, info);
      },
      scriptInitialize(original, pointer, ...args) {
        const previous = scriptCollector; reset(); options.resetHistory?.();
        const plan = { owner: pointer, rows: [], offsets: new Map(), prepared: new Set(), cursor: -1, ready: 0, characters: 0 };
        scriptCollector = plan;
        let result;
        try { result = original(pointer, ...args); } finally { scriptCollector = previous; }
        scriptPlan = plan; options.onPrefetch?.('captured', plan.rows.length); warmUpcoming();
        return result;
      },
      scriptInstruction(original, pointer, instruction, command, work, ...args) {
        try {
          const plan = scriptCollector, layout = options.layout?.instruction;
          if (plan?.owner === pointer && layout && instruction === layout.message && plan.rows.length < 4096) {
            const offset = new DataView(memory.buffer).getUint32(work + layout.offset, true);
            const name = read(exports.__uwt_instruction_string(pointer, layout.name, work, 0)).slice(0, 150);
            let text = read(exports.__uwt_instruction_string(pointer, layout.text, work, 0));
            if (layout.lineFeed) text = text.replaceAll(layout.lineFeed, '\n');
            if (layout.marker) text = text.replaceAll(layout.marker, '');
            if (text.trim() && !plan.offsets.has(offset) && plan.characters + text.length + name.length <= 1000000) {
              plan.offsets.set(offset, plan.rows.length); plan.rows.push({ text, speaker: name }); plan.characters += text.length + name.length;
            }
          }
        } catch { /* Dynamic or unavailable arguments wait until actual display. */ }
        return original(pointer, instruction, command, work, ...args);
      },
      scriptAdvance(original, pointer, work, ...args) {
        try {
          const plan = scriptPlan, layout = options.layout?.instruction;
          if (plan?.owner === pointer && layout) {
            const index = plan.offsets.get(new DataView(memory.buffer).getUint32(work + layout.offset, true));
            if (index !== undefined) { plan.cursor = index; warmUpcoming(); }
          }
        } catch { /* Unknown command positions keep native execution. */ }
        return original(pointer, work, ...args);
      },
      scriptDispose(original, pointer, ...args) {
        if (scriptPlan?.owner === pointer) { reset(); options.resetHistory?.(); }
        return original(pointer, ...args);
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
          const script = read(value, 1000000), countAhead = lookahead();
          let count = 0;
          for (const row of rows(script)) {
            if (!['message', 'dotmessage', 'messageTextCenter'].includes(row[0]) || row.length < 3) continue;
            register(row[2], 'story', row[1]); register(row[1], 'name', row[1]);
            if (count++ < countAhead) { remember(row[2], 'story', row[1]); if (row[1]) remember(row[1], 'name', row[1]); }
          }
        } catch { /* Script limits never stop the game. */ }
        return original(pointer, value, info);
      },
    };
    handlers.meshEnable = handlers.labelEnable; handlers.meshDisable = handlers.labelDisable; handlers.meshDestroy = handlers.labelDestroy;
    handlers.labelDrawing = handlers.labelProcessing; handlers.meshDrawing = handlers.labelProcessing;
    handlers.novelDrawing = handlers.legacyProcessing;
    return { handlers, reset, invalidate: () => {
      translated.clear(); warming.clear(); prefetchGeneration++; prefetchBusy = false;
      for (const record of novels.values()) { record.entries.clear(); record.revision++; }
      if (scriptPlan) { scriptPlan.prepared.clear(); scriptPlan.ready = 0; }
      font?.synchronize(); warmUpcoming();
    }, dispose: () => { reset(); localized.clear(); disposed = true; font?.dispose(); }, diagnostics: () => ({ nativeBindings: slots.size + windows.size,
      observed, skipped: { ...skipped }, ...(novelCapture.commands || novelCapture.unverified ? { novel: { ...novelCapture, last: novelCapture.last && { ...novelCapture.last } } } : {}) }) };
  }
  root.__UnityNativeLabels = Object.freeze({ builds, create });
})(globalThis);
