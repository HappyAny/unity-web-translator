import assert from 'node:assert/strict';
import '../extension/native-font.js';

function fixture({ names = false, tmp = false, glyph = true, arrayType = 3 } = {}) {
  const memory = new WebAssembly.Memory({ initial: 4 }), strings = new Map(), roots = new Set(), states = [];
  let cursor = 1000, handle = 1, font = 42, writes = 0, constructors = 0, assets = 0;
  const view = new DataView(memory.buffer); view.setUint32(100, 1, true); view.setUint32(104, 2, true); view.setUint32(108, arrayType, true);
  const exports = {
    memory, malloc(size) { const pointer = cursor; cursor += size; return pointer; }, free() {}, __uwt_type() {},
    __uwt_array(type, count) { assert(type); const pointer = exports.malloc(16 + Math.max(count, count * 4)); new DataView(memory.buffer).setUint32(pointer + 12, count, true); return pointer; },
    __uwt_root() { roots.add(handle); return handle++; }, __uwt_unroot(value) { assert(roots.delete(value)); },
    __uwt_write_file(path, array) { assert.equal(strings.get(path), '/tmp/unity-translator-cjk.ttf'); assert.equal(new DataView(memory.buffer).getUint32(array + 12, true), 1000); writes++; },
    __uwt_new_object(type) { assert.equal(type, 2); return 900; },
    __uwt_legacy_ctor(value, argument, size, info) {
      assert.equal(value, 900); constructors++;
      if (names) { assert.equal(size, 48); assert.equal(info, 0); assert.equal(new DataView(memory.buffer).getUint32(argument + 12, true), 1); argument = new DataView(memory.buffer).getUint32(argument + 16, true); }
      else assert.equal(size, 0);
      assert.equal(strings.get(argument), '/tmp/unity-translator-cjk.ttf');
    },
    __uwt_legacy_has_char: value => value === 900 && glyph ? 1 : 0,
    __uwt_legacy_font: () => font, __uwt_legacy_set_font(_pointer, value) { font = value; },
  };
  if (tmp) Object.assign(exports, {
    __uwt_create_font(source, size, padding, mode, width, height, population, multi, info) {
      assert.deepEqual([source, size, padding, mode, width, height, population, multi, info], [900, 48, 5, 4165, 1024, 1024, 1, 1, 0]); assets++; return 901;
    },
    __uwt_font: () => font, __uwt_set_font(_pointer, value) { font = value; }, __uwt_add_chars() {},
  });
  const adapter = globalThis.__UnityNativeFont.create(exports, {
    byteArrayTypeAddress: 100, legacyTypeAddress: 104, stringArrayTypeAddress: 108, legacyNamesArray: names, createFontFromLegacy: tmp,
    string(text) { const pointer = exports.malloc(text.length * 2 + 12); strings.set(pointer, text); return pointer; },
    load: async () => new Uint8Array(1000), status: state => states.push(state),
  });
  return { adapter, roots, states, get font() { return font; }, get writes() { return writes; }, get constructors() { return constructors; }, get assets() { return assets; } };
}
for (const names of [false, true]) {
  const f = fixture({ names }); await new Promise(resolve => setImmediate(resolve));
  f.adapter.applyLegacy(200, '中文菜单', { font: 42 });
  assert.equal(f.font, 900); assert.equal(f.constructors, 1); assert.equal(f.writes, 1); assert.equal(f.roots.size, 3);
  f.adapter.applyLegacy(201, '下一句', { font: 42 }); assert.equal(f.constructors, 1);
  f.adapter.restoreLegacy(200, { font: 42 }); assert.equal(f.font, 42);
  f.adapter.dispose(); assert.equal(f.roots.size, 0); assert.deepEqual(f.states, ['loading', 'available', 'ready']);
}
const tmp = fixture({ tmp: true }); await new Promise(resolve => setImmediate(resolve));
tmp.adapter.apply(200, '中文菜单', { font: 42 });
assert.equal(tmp.font, 901); assert.equal(tmp.assets, 1); assert.equal(tmp.constructors, 1); assert.equal(tmp.writes, 1); assert.equal(tmp.roots.size, 2);
tmp.adapter.dispose(); assert.equal(tmp.roots.size, 0); assert.equal(tmp.states.filter(value => value === 'ready').length, 1);
for (const config of [{ names: true, arrayType: 0 }, { names: true, glyph: false }]) {
  const f = fixture(config); await new Promise(resolve => setImmediate(resolve));
  f.adapter.applyLegacy(200, '译文', { font: 42 }); assert.equal(f.font, 42, 'An unavailable constructor/type/glyph preserves the native font');
  assert.equal(f.roots.size, 2, 'A failed font probe retains only the observed label and original font');
  assert.equal(f.states.at(-1), 'failed', 'Legacy-only failures appear in the font diagnostics');
  f.adapter.dispose(); assert.equal(f.roots.size, 0);
}
console.log('Native font compatibility: legacy-only, names-array ABI, older TMP creation, glyph rejection and root disposal passed.');
