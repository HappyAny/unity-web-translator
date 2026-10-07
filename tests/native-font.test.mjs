import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createFontReader } from '../extension/native-font.mjs';
import '../extension/native-font.js';

const data = new Uint8Array(70000).map((_v, index) => index % 255);
let reads = 0;
const reader = createFontReader({ url: 'font', fetch: async () => { reads++; return new Response(data); } });
const first = await reader({ offset: 0 }), second = await reader({ offset: 65536 });
assert.equal(reads, 1); assert.equal(first.total, data.length);
assert.deepEqual(Buffer.from(first.data, 'base64'), Buffer.from(data.subarray(0, 65536)));
assert.deepEqual(Buffer.from(second.data, 'base64'), Buffer.from(data.subarray(65536)));
for (const offset of [-1, 1, 131072, 13000000]) await assert.rejects(reader({ offset }));

// Verify actual managed-array layout, filesystem calls, glyph preloading and disposal.
const memory = new WebAssembly.Memory({ initial: 180 });
let cursor = 1000, next = 1, currentFont = 42, currentMaterial = 84, currentColor = [1, 1, 1, 1], writes = 0, ready = 0;
const strings = new Map(), roots = new Set(), chars = [], states = [];
new DataView(memory.buffer).setUint32(9899276, 123, true);
const exports = {
  malloc(length) { cursor = (cursor + 7) & ~7; const pointer = cursor; cursor += length; return pointer; }, free() {},
  memory, __uwt_type(address) { assert.equal(address, 9899276); },
  __uwt_array(type, length) { assert.equal(type, 123); const pointer = cursor; cursor += length + 16; new DataView(memory.buffer).setUint32(pointer + 12, length, true); return pointer; },
  __uwt_root() { const value = next++; roots.add(value); return value; }, __uwt_unroot(root) { assert(roots.delete(root)); },
  __uwt_write_file(path, array) { assert.equal(strings.get(path), '/tmp/unity-translator-cjk.ttf'); assert.deepEqual(new Uint8Array(memory.buffer, array + 16, data.length), data); writes++; },
  __uwt_create_font(path, face, size, padding, mode, width, height, population, multi) { assert.equal(strings.get(path), '/tmp/unity-translator-cjk.ttf'); assert.equal(face, 0); assert.equal(size, 48); assert.equal(population, 1); assert.equal(multi, 1); return 999; },
  __uwt_font() { return currentFont; }, __uwt_set_font(_label, font) { currentFont = font; },
  __uwt_add_chars(font, value) { assert.equal(font, 999); chars.push(strings.get(value)); },
  __uwt_font_material(font) { assert.equal(font, 999); return 1001; },
  __uwt_label_material() { return currentMaterial; }, __uwt_set_material(_label, material) { currentMaterial = material; },
  __uwt_color(output) { new Float32Array(memory.buffer, output, 4).set(currentColor); },
  __uwt_set_color(_label, value) { currentColor = Array.from(new Float32Array(memory.buffer, value, 4)); },
  __uwt_property(value) { assert.equal(strings.get(value), '_FaceColor'); return 25; },
  __uwt_has_property(material, property) { assert.equal(material, 84); assert.equal(property, 25); return 1; },
  __uwt_material_color(output) { new Float32Array(memory.buffer, output, 4).set([0, 0, 0, 1]); },
};
const font = globalThis.__UnityNativeFont.create(exports, { string(value) { const pointer = cursor; cursor += value.length * 2 + 12; strings.set(pointer, value); return pointer; }, load: async () => data, ready: () => ready++, status: value => states.push(value) });
await new Promise(resolve => setImmediate(resolve)); assert.equal(ready, 1); assert.equal(writes, 0, 'No native work before the engine is ready');
assert.equal(font.original(100), 42); const style = font.snapshot(100);
font.apply(100, '<b>点击查看</b>', style);
assert.equal(writes, 1); assert.equal(currentFont, 999); assert.equal(chars[0], '点击查看'); assert.equal(roots.size, 1);
assert.equal(currentMaterial, 1001); assert.deepEqual(currentColor, [0, 0, 0, 1], 'White vertex color retains the black face color of a light balloon');
currentMaterial = 84; font.apply(100, '点击', style); assert.equal(currentMaterial, 1001, 'Typewriter material changes cannot select the old atlas');
assert.equal(chars.length, 1); font.restore(100, style); assert.equal(currentFont, 42); assert.equal(currentMaterial, 84); assert.deepEqual(currentColor, [1, 1, 1, 1]);
font.dispose(); assert.equal(roots.size, 0); font.apply(100, '新字'); assert.equal(currentFont, 42);
assert.deepEqual(states, ['loading', 'available', 'ready']);

const substituted = globalThis.__UnityNativeFont.create(exports, { string(value) { const pointer = exports.malloc(value.length * 2 + 12); strings.set(pointer, value); return pointer; }, load: async () => data });
await new Promise(resolve => setImmediate(resolve));
substituted.observe(100, '击'); assert.equal(currentFont, 999);
assert.equal(substituted.snapshot(100).font, 42, 'Bindings capture the original font even after glyph observation substituted it');
substituted.forget(100); substituted.dispose(); assert.equal(currentFont, 42); assert.equal(roots.size, 0);

// Per-character labels need font fallback without separate translation or style changes.
let active = true, dirty = 0, cleared = 0;
const list = exports.malloc(24), items = exports.malloc(24);
const layout = new DataView(memory.buffer);
layout.setUint32(list + 8, items, true); layout.setInt32(list + 12, 1, true); layout.setInt32(list + 16, 3, true);
layout.setUint32(items, 456, true); layout.setUint32(items + 12, 2, true); layout.setUint32(items + 16, 88, true);
const array = exports.__uwt_array;
exports.__uwt_array = (type, length) => {
  if (type === 123) return array(type, length);
  assert.equal(type, 456); const pointer = exports.malloc(16 + length * 4);
  const view = new DataView(memory.buffer); view.setUint32(pointer, type, true); view.setUint32(pointer + 12, length, true); return pointer;
};
exports.__uwt_fallbacks = source => { assert.equal(source, 42); return list; };
exports.__uwt_clear_fallbacks = source => { assert.equal(source, 42); cleared++; };
exports.__uwt_dirty = () => dirty++;
const fallback = globalThis.__UnityNativeFont.create(exports, { string(value) { const pointer = exports.malloc(value.length * 2 + 12); strings.set(pointer, value); return pointer; }, load: async () => data, active: () => active });
fallback.observe(100, '击');
assert.equal(currentFont, 42); assert.equal(roots.size, 3, 'A label waits safely while its font is loading');
await new Promise(resolve => setImmediate(resolve));
let nextItems = new DataView(memory.buffer).getUint32(list + 8, true);
assert.notEqual(nextItems, items);
assert.equal(new DataView(memory.buffer).getUint32(nextItems + 16, true), 88, 'Existing fallback remains first');
assert.equal(new DataView(memory.buffer).getUint32(nextItems + 20, true), 999);
assert.equal(currentFont, 42); assert.equal(currentMaterial, 84); assert.deepEqual(currentColor, [1, 1, 1, 1], 'Native fallback preserves the original material and vertex color');
const rootCount = roots.size; fallback.observe(100, '查'); assert.equal(roots.size, rootCount, 'Typewriter updates do not add roots');
assert(dirty > 0); assert.equal(cleared, 1);
active = false; fallback.synchronize();
assert.equal(new DataView(memory.buffer).getUint32(list + 8, true), items);
assert.equal(new DataView(memory.buffer).getInt32(list + 12, true), 1, 'Pause restores the original fallback list');
active = true; fallback.synchronize(); assert.notEqual(new DataView(memory.buffer).getUint32(list + 8, true), items);
fallback.forget(100); fallback.dispose(); assert.equal(roots.size, 0);
assert.equal(new DataView(memory.buffer).getUint32(list + 8, true), items, 'Disposal restores the original array and releases every root');
const packed = await fs.readFile(new URL('../extension/fonts/cjk-fallback.ttf', import.meta.url));
assert(packed.length < 12000000); assert.equal(packed.readUInt32BE(0), 0x10000);
assert((await fs.readFile(new URL('../extension/fonts/OFL.txt', import.meta.url), 'utf8')).includes('SIL OPEN FONT LICENSE'));
console.log('Native font: bounded chunks, managed arrays, host isolation, glyph deduplication and root disposal passed.');
