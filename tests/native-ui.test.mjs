import assert from 'node:assert/strict';
import '../extension/native-labels.js';

const memory = new WebAssembly.Memory({ initial: 4 });
let cursor = 10000, handle = 1, uiEnabled = true;
const roots = new Set(), labels = new Map(), bindings = new Map(), styles = [];
const font = {
  snapshot: pointer => ({ font: pointer + 10 }), snapshotLegacy: pointer => ({ font: pointer + 20 }),
  observe() {}, observeLegacy() {}, forget() {}, forgetLegacy() {}, synchronize() {}, dispose() {},
  apply: pointer => styles.push(['tmp-apply', pointer]), restore: pointer => styles.push(['tmp-restore', pointer]),
  applyLegacy: pointer => styles.push(['legacy-apply', pointer]), restoreLegacy: pointer => styles.push(['legacy-restore', pointer]),
};
globalThis.__UnityNativeFont = { create: () => font };
function managed(text) {
  const pointer = cursor; cursor += 12 + (text.length + 1) * 2;
  const view = new DataView(memory.buffer); view.setInt32(pointer + 8, text.length, true);
  for (let i = 0; i < text.length; i++) view.setUint16(pointer + 12 + i * 2, text.charCodeAt(i), true);
  return pointer;
}
function read(pointer) {
  const view = new DataView(memory.buffer); let text = '';
  for (let i = 0, length = view.getInt32(pointer + 8, true); i < length; i++) text += String.fromCharCode(view.getUint16(pointer + 12 + i * 2, true));
  return text;
}
const exports = {
  memory, malloc(size) { const pointer = cursor; cursor += size; return pointer; }, free() {},
  __uwt_string(pointer, start, count) { const view = new DataView(memory.buffer); let text = ''; for (let i = 0; i < count; i++) text += String.fromCharCode(view.getUint16(pointer + (start + i) * 2, true)); return managed(text); },
  __uwt_root() { roots.add(handle); return handle++; }, __uwt_unroot(value) { assert(roots.delete(value)); },
  __uwt_label_text: pointer => labels.get(pointer) || 0, __uwt_legacy_text: pointer => labels.get(pointer) || 0,
  __uwt_original_labelSet(pointer, value) { labels.set(pointer, value); },
  __uwt_original_legacySet(pointer, value) { labels.set(pointer, value); },
};
const adapter = globalThis.__UnityNativeLabels.create(exports, {
  active: () => true, enabled: kind => kind === 'ui' ? uiEnabled : true,
  bind(id, original, apply, options) { const entry = { original, apply, options }; bindings.set(id, entry); apply(original); return () => { if (bindings.get(id) === entry) bindings.delete(id); }; },
});
const source = managed('サポートするので\n指示に従ってください！');
adapter.handlers.legacySet(exports.__uwt_original_legacySet, 1000, source, 0);
assert.equal(bindings.get('native-1000').options.kind, 'ui');
const previous = bindings.get('native-1000'); previous.apply('我会提供支援，\n请按照指示行动！');
assert.equal(read(labels.get(1000)), '我会提供支援，\n请按照指示行动！');
assert(styles.some(row => row[0] === 'legacy-apply' && row[1] === 1000));
assert(!styles.some(row => row[0].startsWith('tmp') && row[1] === 1000), 'Legacy labels cannot use TMP font helpers');
previous.apply(read(source)); assert.equal(read(labels.get(1000)), read(source));
const next = managed('次の指示です。'); adapter.handlers.legacySet(exports.__uwt_original_legacySet, 1000, next, 0);
previous.apply('旧提示'); assert.equal(read(labels.get(1000)), read(next));
adapter.handlers.legacyDisable(() => {}, 1000, 0); assert.equal(roots.size, 0);
labels.set(2000, source); adapter.handlers.legacyEnable(() => {}, 2000, 0);
assert(bindings.has('native-2000'), 'Serialized legacy UI text binds when enabled');
adapter.handlers.legacyDestroy(() => {}, 2000, 0); assert.equal(roots.size, 0);
// A formatted/string-builder/array path reaches the shared processing function without a property setter.
labels.set(3000, managed('ボス攻撃 20.5'));
adapter.handlers.labelProcessing(() => {}, 3000, 0);
const parsed = bindings.get('native-3000'); assert.equal(parsed.original, 'ボス攻撃 20.5');
parsed.apply('首领攻击 20.5'); assert.equal(read(labels.get(3000)), '首领攻击 20.5');
adapter.handlers.labelProcessing(() => {}, 3000, 0);
assert.equal(bindings.get('native-3000'), parsed, 'Rebuilding translated text cannot replace its original binding');
assert(styles.some(row => row[0] === 'tmp-apply' && row[1] === 3000));
adapter.handlers.meshDisable(() => {}, 3000, 0); assert.equal(roots.size, 0);
labels.set(4000, source); adapter.handlers.meshEnable(() => {}, 4000, 0);
assert(bindings.has('native-4000'), 'World-space TMP text also binds');
adapter.handlers.meshDestroy(() => {}, 4000, 0); assert.equal(roots.size, 0);
uiEnabled = false; adapter.handlers.legacySet(exports.__uwt_original_legacySet, 5000, source, 0);
assert.equal(bindings.size, 0); assert.equal(read(labels.get(5000)), read(source));
adapter.dispose(); assert.equal(roots.size, 0);
console.log('Native UI: legacy tutorial text, serialized labels, TMP processing paths, world-space cleanup, font separation, pause and stale responses passed.');
