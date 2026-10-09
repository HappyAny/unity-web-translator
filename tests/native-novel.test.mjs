import assert from 'node:assert/strict';
import '../extension/native-labels.js';

const build = globalThis.__UnityNativeLabels.builds[2];
const memory = new WebAssembly.Memory({ initial: 4 }), labels = new Map(), roots = new Set(), bindings = new Map(), dataText = new Map();
let cursor = 12000, handle = 1, active = true, enabled = true, growOnRaw = true;
const managed = text => {
  const pointer = cursor; cursor += text.length * 2 + 16;
  const view = new DataView(memory.buffer); view.setInt32(pointer + 8, text.length, true);
  for (let index = 0; index < text.length; index++) view.setUint16(pointer + 12 + index * 2, text.charCodeAt(index), true);
  return pointer;
};
const read = pointer => {
  const view = new DataView(memory.buffer); let result = '';
  for (let index = 0, count = view.getInt32(pointer + 8, true); index < count; index++) result += String.fromCharCode(view.getUint16(pointer + 12 + index * 2, true));
  return result;
};
const plain = text => text.replace(/<[^>]*>/g, '');
const writes = [], lengths = [];
const exports = {
  memory, malloc(size) { const pointer = cursor; cursor += size; return pointer; }, free() {},
  __uwt_string(pointer, start, count) { return managed(String.fromCharCode(...new Uint16Array(memory.buffer, pointer + start * 2, count))); },
  __uwt_root() { roots.add(handle); return handle++; }, __uwt_unroot(id) { assert(roots.delete(id)); },
  __uwt_label_text: pointer => labels.get(pointer) || 0, __uwt_legacy_text: pointer => labels.get(pointer) || 0,
  __uwt_original_legacySet(pointer, value) { labels.set(pointer, value); writes.push(read(value)); },
  __uwt_original_novelLength(pointer, length) { lengths.push([pointer, length]); },
  __uwt_text_data_raw(pointer) {
    if (growOnRaw) { memory.grow(1); view = new DataView(memory.buffer); growOnRaw = false; }
    return dataText.get(pointer);
  },
  __uwt_text_data_plain: pointer => managed(plain(read(dataText.get(pointer)))),
  __uwt_text_data_length: pointer => plain(read(dataText.get(pointer))).length,
  __uwt_novel_engine: () => 8000, __uwt_engine_page: () => 9000,
  __uwt_command_text: pointer => commands.get(pointer),
  __uwt_type() {}, __uwt_new_object() { const pointer = cursor; cursor += 24; return pointer; },
  __uwt_text_data_ctor(pointer, value) { dataText.set(pointer, value); },
  __uwt_novel_dirty() {},
};
let view = new DataView(memory.buffer);
const window = 1000, windowData = 2000, body = 3000, nameLabel = 4000, page = 9000;
const first = '<b>これは最初の言葉です。</b>', second = '次は二番目の言葉です。', third = 'この言葉はまだ表示しません。';
const full = first + '\n' + second + '\n' + third;
const commands = new Map([[5000, managed(first)], [6000, managed(second)], [7000, managed(third)]]);
dataText.set(10000, managed(full));
view.setUint32(128, 99, true);
view.setUint32(window + 68, body, true); view.setUint32(window + 72, nameLabel, true);
view.setUint32(windowData + 12, 10000, true); view.setUint32(windowData + 16, managed('話し手'), true);
view.setUint32(page + 76, 11000, true); view.setUint32(page + 84, 5000, true);
view.setInt32(page + 104, plain(first).length + 1, true); view.setUint8(5000 + 29, 1);
view.setUint8(6000 + 29, 1);
view.setUint32(11000 + 12, 11500, true); view.setUint32(11500 + 8, 11600, true);
view.setInt32(11500 + 12, 3, true); view.setUint32(11600 + 12, 3, true);
[5000, 6000, 7000].forEach((pointer, index) => view.setUint32(11600 + 16 + index * 4, pointer, true));
const prefetch = [];
const adapter = globalThis.__UnityNativeLabels.create(exports, {
  active: () => active, enabled: () => enabled, lookahead: () => 1,
  layout: { novel: { ...build.layout.novel, textType: 128 } },
  translate: async (text, context) => { prefetch.push({ text, context }); return '预读的第二句。'; },
  bind(id, original, apply, context) {
    const binding = { original, apply, context }; bindings.set(id, binding); apply(original);
    return () => { if (bindings.get(id) === binding) bindings.delete(id); };
  },
});
let callbacks = 0;
const change = length => {
  view.setInt32(windowData + 24, length, true);
  adapter.handlers.novelWindow((pointer, value, info) => {
    assert.deepEqual([pointer, value, info], [window, windowData, 17]); callbacks++;
    adapter.handlers.legacySet(exports.__uwt_original_legacySet, body, managed(''), 0);
    adapter.handlers.legacySet(exports.__uwt_original_legacySet, body, dataText.get(10000), 0);
    adapter.handlers.legacySet(exports.__uwt_original_legacySet, nameLabel, view.getUint32(windowData + 16, true), 0);
    adapter.handlers.novelLength(exports.__uwt_original_novelLength, body, length, 23);
  }, window, windowData, 17);
};
change(2);
for (let index = 0; index < 10; index++) await new Promise(resolve => setImmediate(resolve));
assert.deepEqual(prefetch.map(entry => entry.text), [second], 'Lookahead prepares only the configured number of complete future commands');
assert.equal(prefetch[0].context.recordHistory, false, 'Future commands are never added to dialogue history');
const firstBinding = bindings.get('native-3000');
assert.equal(firstBinding.original, first, 'Only the current command is submitted; future click segments must not be included');
assert.equal(adapter.diagnostics().novel.commands, 1, 'Native allocation can grow memory without losing the command boundary');
assert.equal(firstBinding.context.kind, 'story');
assert.equal(read(labels.get(body)), full, 'Untranslated text retains its original native view mask');
const firstOutput = '<b>（对不起，朋友。）</b>';
firstBinding.apply(firstOutput);
assert.equal(read(labels.get(body)), firstOutput + '\n', 'Translated text excludes all upcoming click segments');
assert.equal(lengths.at(-1)[1], Math.ceil(2 * (plain(firstOutput).length + 1) / (plain(first).length + 1)), 'The translation follows native reveal progress');
adapter.handlers.novelLength(exports.__uwt_original_novelLength, body, plain(first).length + 1, 23);
assert.equal(lengths.at(-1)[1], plain(firstOutput).length + 1);
adapter.handlers.novelLength(exports.__uwt_original_novelLength, body, -1, 23);
assert.equal(lengths.at(-1)[1], -1, 'The native show-all sentinel must remain visible rather than become a zero-character mask');
adapter.handlers.novelLength(exports.__uwt_original_novelLength, body, -2, 23);
assert.equal(lengths.at(-1)[1], -2, 'Every negative native view length denotes show-all');
assert(!read(labels.get(body)).includes(second), 'Show-all still excludes commands the player has not advanced to');
const firstRoots = roots.size, beforeWrites = writes.length;
firstBinding.apply(firstOutput);
assert.equal(roots.size, firstRoots); assert.equal(writes.length, beforeWrites, 'Repeated results do not restart the reveal');
change(-1);
assert.equal(lengths.at(-1)[1], -1, 'Cached writeback preserves a native instant-display mask');
assert.equal(adapter.diagnostics().novel.last.displayVisible, -1);
assert.equal(adapter.diagnostics().novel.last.translated, true);
adapter.handlers.legacySet(exports.__uwt_original_legacySet, body, dataText.get(10000), 0);
assert.equal(read(labels.get(body)), firstOutput + '\n', 'A repeated whole-page source cannot flash or reveal future text');

const start = plain(first).length + 1, end = start + second.length + 1;
view.setUint32(page + 84, 6000, true); view.setInt32(page + 104, end, true);
change(start);
const secondBinding = bindings.get('native-3000');
assert.equal(secondBinding.original, second); assert.notEqual(secondBinding, firstBinding);
const beforeStale = read(labels.get(body));
assert.equal(beforeStale, firstOutput + '\n预读的第二句。\n', 'A cached upcoming segment appears only after its native command starts');
firstBinding.apply('过期结果'); assert.equal(read(labels.get(body)), beforeStale, 'A late previous segment cannot replace the current segment');
secondBinding.apply('现在显示第二句。');
assert.equal(read(labels.get(body)), firstOutput + '\n现在显示第二句。\n', 'Previously displayed translations remain in a shared page');
assert.equal(lengths.at(-1)[1], plain(firstOutput).length + 1, 'The next segment initially reveals none of its new words');
adapter.handlers.novelLength(exports.__uwt_original_novelLength, body, end, 23);
assert.equal(lengths.at(-1)[1], plain(read(labels.get(body))).length);
assert(!read(labels.get(body)).includes(third)); assert.equal(callbacks, 3, 'Writeback never replays commands or clicks');
change(end);
assert.equal(read(labels.get(body)), firstOutput + '\n现在显示第二句。\n', 'A same-command window reset retains the masked translation');
adapter.invalidate(); secondBinding.apply('现在显示第二句。');
assert.equal(read(labels.get(body)), plain(first) + '\n现在显示第二句。\n', 'A Profile change cannot carry translations from the previous context into the prefix');

active = false; secondBinding.apply(second);
assert.equal(read(labels.get(body)), full, 'Pause restores the complete original native text, including its view mask');
assert.equal(lengths.at(-1)[1], end);
adapter.handlers.novelLength(exports.__uwt_original_novelLength, body, end - 1, 23);
assert.equal(lengths.at(-1)[1], end - 1);
active = true; secondBinding.apply('现在显示第二句。');
enabled = false;
adapter.handlers.legacySet(exports.__uwt_original_legacySet, body, dataText.get(10000), 0);
assert.equal(read(labels.get(body)), full, 'Disabling translation bypasses source substitution');
enabled = true;
adapter.handlers.legacyDisable(() => {}, body, 0);
secondBinding.apply('已经关闭的窗口'); assert.equal(read(labels.get(body)), full);
view.setInt32(page + 104, 1, true); change(1);
assert(!bindings.has('native-3000'), 'An inconsistent native boundary preserves the original page');
adapter.handlers.novelDrawing(() => {}, body, 100, 0);
assert(!bindings.has('native-3000'), 'The custom drawing path cannot translate an unverified whole page as UI');
adapter.dispose(); assert.equal(roots.size, 0); assert.equal(bindings.size, 0);
console.log('Native novel: click boundaries, future-text exclusion, exact native character counts, reveal mapping, previous segments, pause and root cleanup passed.');
