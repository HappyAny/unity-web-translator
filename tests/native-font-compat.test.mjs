import assert from 'node:assert/strict';
import '../extension/native-font.js';

const classicLayout = { data: 48, buffer: 76, length: 84, capacity: 88, dynamic: 36 };
const recentLayout = { data: 40, buffer: 124, length: 132, capacity: 136, dynamic: 84 };
function fixture({ names = false, tmp = false, glyph = true, arrayType = 3, native = false, nativeLength = 1000,
  copy = false, empty = false, layout = classicLayout, grow = false, badReserve = false, originalCoverage = false, preferFallback = false, requireMaterial = false, material = true } = {}) {
  const memory = new WebAssembly.Memory({ initial: 4 }), strings = new Map(), roots = new Set(), states = [];
  let cursor = 1000, handle = 1, font = 42, writes = 0, constructors = 0, assets = 0, initialized = 0, reserves = 0;
  const source = new Uint8Array(1000); new DataView(source.buffer).setUint32(0, 0x00010000, false); source[100] = 99;
  const view = new DataView(memory.buffer); view.setUint32(100, 1, true); view.setUint32(104, 2, true); view.setUint32(108, arrayType, true);
  const exports = {
    memory, malloc(size) { const pointer = cursor; cursor += size; return pointer; }, free() {}, __uwt_type() {},
    __uwt_array(type, count) { assert(type); const pointer = exports.malloc(16 + Math.max(count, count * 4)); new DataView(memory.buffer).setUint32(pointer + 12, count, true); return pointer; },
    __uwt_root() { roots.add(handle); return handle++; }, __uwt_unroot(value) { assert(roots.delete(value)); },
    __uwt_write_file(path, array) { assert.equal(strings.get(path), '/tmp/unity-translator-cjk.ttf'); assert.equal(new DataView(memory.buffer).getUint32(array + 12, true), 1000); writes++; },
    __uwt_new_object(type) { assert.equal(type, 2); return 900; },
    __uwt_legacy_ctor(value, argument, size, info) {
      assert.equal(value, 900); constructors++;
      if (empty) { assert.equal(argument, 0); assert.equal(size, undefined); assert.equal(info, undefined); }
      else {
        if (names) { assert.equal(size, 48); assert.equal(info, 0); assert.equal(new DataView(memory.buffer).getUint32(argument + 12, true), 1); argument = new DataView(memory.buffer).getUint32(argument + 16, true); }
        else assert.equal(size, 0);
        assert.equal(strings.get(argument), '/tmp/unity-translator-cjk.ttf');
      }
      if (native) {
        const current = new DataView(memory.buffer);
        current.setUint32(value + 8, 20000, true); current.setUint32(20000 + layout.data, 21000, true);
        current.setUint32(21000 + layout.buffer, copy ? 0 : 22000, true);
        current.setUint32(21000 + layout.length, copy ? 0 : nativeLength, true);
        current.setUint32(21000 + layout.capacity, copy ? 0 : nativeLength * 2 + 1, true);
        if (!copy) new Uint8Array(memory.buffer, 22000, source.length).set(source);
      }
    },
    __uwt_legacy_has_char: value => (value === 42 && originalCoverage) || (value === 900 && glyph && (!native || initialized)) ? 1 : 0,
    __uwt_legacy_dynamic: () => native ? new DataView(memory.buffer).getInt32(21000 + layout.dynamic, true) === -2 : 1,
    __uwt_legacy_reserve_native(vector, count, alignment) {
      assert.deepEqual([vector, count, alignment], [21000 + layout.buffer, source.length, 1]); reserves++;
      if (grow) memory.grow(1);
      const current = new DataView(memory.buffer), target = memory.buffer.byteLength - 2000;
      current.setUint32(21000 + layout.buffer, target, true);
      current.setUint32(21000 + layout.capacity, (badReserve ? count - 1 : count) * 2 + 1, true);
    },
    __uwt_legacy_initialize_native(data) {
      const current = new DataView(memory.buffer); assert.equal(data, 21000); assert.equal(current.getInt32(data + layout.dynamic, true), -2);
      const buffer = current.getUint32(data + layout.buffer, true); assert.equal(current.getUint32(data + layout.length, true), source.length);
      assert.deepEqual(new Uint8Array(memory.buffer, buffer, source.length), source); initialized++;
    },
    __uwt_legacy_refresh_native(data) { assert.equal(data, 21000); assert.equal(initialized, 1); },
    __uwt_legacy_font: () => font, __uwt_legacy_set_font(_pointer, value) { font = value; },
  };
  if (tmp) Object.assign(exports, {
    __uwt_create_font(source, size, padding, mode, width, height, population, multi, info) {
      assert.deepEqual([source, size, padding, mode, width, height, population, multi, info], [900, 48, 5, 4165, 1024, 1024, 1, 1, 0]); assets++; return 901;
    },
    __uwt_font: () => font, __uwt_set_font(_pointer, value) { font = value; }, __uwt_add_chars() {},
  });
  if (requireMaterial) exports.__uwt_legacy_material = value => { assert.equal(value, 900); return material ? 902 : 0; };
  const adapter = globalThis.__UnityNativeFont.create(exports, {
    byteArrayTypeAddress: 100, legacyTypeAddress: 104, stringArrayTypeAddress: 108, legacyNamesArray: names, legacyEmptyConstructor: empty, legacyPreferFallback: preferFallback, createFontFromLegacy: tmp,
    ...(native ? { legacyNativeData: { ...layout, copy } } : {}),
    string(text) { const pointer = exports.malloc(text.length * 2 + 12); strings.set(pointer, text); return pointer; },
    load: async () => source, status: state => states.push(state),
  });
  return { adapter, roots, states, get font() { return font; }, get writes() { return writes; }, get constructors() { return constructors; }, get assets() { return assets; }, get initialized() { return initialized; }, get reserves() { return reserves; } };
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
const native = fixture({ native: true, tmp: true }); await new Promise(resolve => setImmediate(resolve));
native.adapter.apply(200, '字体', { font: 42 }); assert.equal(native.font, 901); assert.equal(native.initialized, 1);
native.adapter.dispose(); assert.equal(native.roots.size, 0);
for (const config of [{ tmp: true, layout: classicLayout }, { names: true, requireMaterial: true, layout: recentLayout, grow: true }]) {
  const f = fixture({ ...config, native: true, copy: true }); await new Promise(resolve => setImmediate(resolve));
  if (config.tmp) f.adapter.apply(200, '动态字体', { font: 42 }); else f.adapter.applyLegacy(200, '动态字体', { font: 42 });
  assert.equal(f.font, config.tmp ? 901 : 900); assert.equal(f.initialized, 1); assert.equal(f.reserves, 1);
  f.adapter.dispose(); assert.equal(f.roots.size, 0);
}
for (const preferFallback of [false, true]) {
  const f = fixture({ native: true, copy: true, names: true, requireMaterial: true, layout: recentLayout, originalCoverage: true, preferFallback });
  await new Promise(resolve => setImmediate(resolve));
  f.adapter.applyLegacy(200, '完整显示游戏设置', { font: 42 });
  assert.equal(f.font, preferFallback ? 900 : 42, 'The matched atlas override must not trust a false-positive coverage report');
  assert.equal(f.constructors, preferFallback ? 1 : 0);
  f.adapter.restoreLegacy(200, { font: 42 }); assert.equal(f.font, 42);
  f.adapter.applyLegacy(200, 'Settings', { font: 42 }); assert.equal(f.font, 42, 'The atlas override leaves covered Latin text in its original font');
  f.adapter.dispose(); assert.equal(f.roots.size, 0);
}
for (const config of [{ names: true, arrayType: 0 }, { names: true, glyph: false }, { native: true, nativeLength: 999 },
  { native: true, copy: true, names: true, layout: recentLayout, badReserve: true },
  { native: true, copy: true, empty: true, layout: recentLayout, requireMaterial: true, material: false }]) {
  const f = fixture(config); await new Promise(resolve => setImmediate(resolve));
  f.adapter.applyLegacy(200, '译文', { font: 42 }); assert.equal(f.font, 42, 'An unavailable constructor/type/glyph preserves the native font');
  assert.equal(f.roots.size, 2, 'A failed font probe retains only the observed label and original font');
  assert.equal(f.states.at(-1), 'failed', 'Legacy-only failures appear in the font diagnostics');
  assert.equal(f.initialized, 0, 'Unverified native bytes never reach the initializer');
  f.adapter.dispose(); assert.equal(f.roots.size, 0);
}
console.log('Native font compatibility: constructors, owned native byte vectors, memory growth, older TMP creation, rejection and root disposal passed.');
