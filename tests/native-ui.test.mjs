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
labels.set(4500, managed('任務一覧'));
adapter.handlers.legacyEnable(() => {}, 4500, 0);
assert.equal(bindings.get('native-4500')?.original, '任務一覧', 'A visible kanji-only menu must not require a story context');
const kanji = bindings.get('native-4500'); kanji.apply('任务列表');
adapter.handlers.legacyEnable(() => {}, 4500, 0);
assert.equal(bindings.get('native-4500'), kanji, 'Enabling a translated CJK label must not translate its own output again');
adapter.handlers.legacyDisable(() => {}, 4500, 0);
adapter.handlers.legacyEnable(() => {}, 4500, 0);
assert.equal(bindings.get('native-4500')?.original, '任務一覧', 'A reused label recovers the source of its own localized output');
bindings.get('native-4500').apply('任务列表'); adapter.reset();
adapter.handlers.legacyEnable(() => {}, 4500, 0);
assert.equal(bindings.get('native-4500')?.original, '任務一覧', 'Changing a script does not erase source provenance for a persistent UI label');
bindings.get('native-4500').apply('任务列表'); adapter.handlers.legacyDisable(() => {}, 4500, 0); adapter.invalidate();
adapter.handlers.legacyEnable(() => {}, 4500, 0);
assert.equal(bindings.get('native-4500')?.original, '任務一覧', 'Configuration invalidation keeps source provenance without reusing a translation');
adapter.handlers.legacyDestroy(() => {}, 4500, 0); assert.equal(roots.size, 0);

// Direct backing-field writes and custom setter paths still reach native mesh population.
labels.set(4600, managed('表示中の説明です。'));
let populated = 0;
const populate = (pointer, mesh, info) => { assert.equal(pointer, 4600); assert.equal(mesh, 77); assert.equal(info, 91); populated++; return 123; };
assert.equal(adapter.handlers.legacyProcessing(populate, 4600, 77, 91), 123);
const drawing = bindings.get('native-4600'); assert.equal(drawing.original, '表示中の説明です。');
drawing.apply('正在显示的说明。');
assert.equal(adapter.handlers.legacyProcessing(populate, 4600, 77, 91), 123);
assert.equal(bindings.get('native-4600'), drawing, 'Mesh refreshes keep the original binding instead of retranslating the output');
assert.equal(populated, 2, 'Native mesh population keeps its arguments, result and call count');
adapter.handlers.legacyDestroy(() => {}, 4600, 0); assert.equal(roots.size, 0);

labels.set(4700, managed('123 / 456')); adapter.handlers.legacyEnable(() => {}, 4700, 0);
assert(!bindings.has('native-4700'), 'Numeric displays do not become model requests');
labels.set(4800, managed('あ'.repeat(2001))); adapter.handlers.legacyEnable(() => {}, 4800, 0);
assert(!bindings.has('native-4800'), 'The bounded input limit still applies to large managed strings');
adapter.handlers.legacySet(exports.__uwt_original_legacySet, 4900, source, 0);
const oldLarge = bindings.get('native-4900'), oversized = managed('あ'.repeat(2001));
adapter.handlers.legacySet(exports.__uwt_original_legacySet, 4900, oversized, 0);
oldLarge.apply('已经过期的译文');
assert.equal(labels.get(4900), oversized, 'Replacing a binding with an oversized string cancels stale write-back');
adapter.handlers.labelSet(exports.__uwt_original_labelSet, 4950, source, 0);
const oldDirect = bindings.get('native-4950'); labels.set(4950, oversized);
adapter.handlers.labelProcessing(() => {}, 4950, 0); oldDirect.apply('已经过期的译文');
assert.equal(labels.get(4950), oversized, 'Oversized backing-field writes also release the old binding');
assert(adapter.diagnostics().skipped.language >= 1); assert(adapter.diagnostics().skipped.length >= 1);
uiEnabled = false; adapter.handlers.legacySet(exports.__uwt_original_legacySet, 5000, source, 0);
assert.equal(bindings.size, 0); assert.equal(read(labels.get(5000)), read(source));
adapter.dispose(); assert.equal(roots.size, 0);
console.log('Native UI: kanji menus, output reuse, mesh-only paths, serialized labels, TMP processing, native arguments, bounded capture, fonts, pause and stale responses passed.');
