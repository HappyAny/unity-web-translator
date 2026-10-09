import assert from 'node:assert/strict';
import '../extension/native-labels.js';

const build = globalThis.__UnityNativeLabels.builds.find(value => value.layout?.instruction);
const tick = async () => { for (let i = 0; i < 16; i++) await new Promise(resolve => setImmediate(resolve)); };
function fixture(lookahead, translate = async text => '译文：' + text) {
  const memory = new WebAssembly.Memory({ initial: 4 }), view = new DataView(memory.buffer);
  const state = { lookahead, active: true, enabled: true, epoch: 0 };
  const calls = [], events = [], instructions = [], argumentsByWork = new Map(), labels = new Map(), bindings = new Map(), roots = new Set();
  let cursor = 20000, handle = 1, advances = 0, historyResets = 0;
  function managed(text) {
    const pointer = cursor; cursor += 12 + (text.length + 1) * 2;
    view.setInt32(pointer + 8, text.length, true);
    for (let i = 0; i < text.length; i++) view.setUint16(pointer + 12 + i * 2, text.charCodeAt(i), true);
    return pointer;
  }
  function read(pointer) {
    if (!pointer) return '';
    let text = '';
    for (let i = 0, length = view.getInt32(pointer + 8, true); i < length; i++) text += String.fromCharCode(view.getUint16(pointer + 12 + i * 2, true));
    return text;
  }
  const exports = {
    memory, malloc(size) { const pointer = cursor; cursor += size; return pointer; }, free() {},
    __uwt_string(pointer, start, count) { let text = ''; for (let i = 0; i < count; i++) text += String.fromCharCode(view.getUint16(pointer + (start + i) * 2, true)); return managed(text); },
    __uwt_root() { roots.add(handle); return handle++; }, __uwt_unroot(value) { assert(roots.delete(value)); },
    __uwt_label_text: pointer => labels.get(pointer) || 0,
    __uwt_original_legacySet(pointer, value) { labels.set(pointer, value); },
    __uwt_instruction_string(owner, index, work, info) {
      assert.equal(owner, 8000); assert.equal(info, 0);
      const values = argumentsByWork.get(work); assert(values, 'Only native preload work is inspected');
      return values[index] || 0;
    },
  };
  const adapter = globalThis.__UnityNativeLabels.create(exports, {
    layout: build.layout, active: () => state.active, enabled: () => state.enabled,
    context: () => state.epoch, lookahead: () => state.lookahead,
    onPrefetch: (status, count) => events.push({ status, count }), resetHistory: () => { historyResets++; },
    translate: (text, options) => { calls.push({ text, ...options }); return translate(text, options); },
    bind(id, original, apply, context, prepared) {
      const entry = { original, apply, context, prepared }; bindings.set(id, entry); apply(original);
      return () => { if (bindings.get(id) === entry) bindings.delete(id); };
    },
  });
  let rows;
  function initialize(input) {
    rows = input.map((row, index) => ({ instruction: 1, offset: index * 100, ...row, work: 100 + index * 48 }));
    const result = adapter.handlers.scriptInitialize((owner, data, info) => {
      assert.deepEqual([owner, data, info], [8000, 17, 29]);
      for (const row of rows) {
        view.setUint32(row.work + 8, row.offset, true);
        argumentsByWork.set(row.work, [managed(row.speaker || ''), row.text === null ? 0 : managed(row.text)]);
        const args = [owner, row.instruction, 7100, row.work, 31];
        assert.equal(adapter.handlers.scriptInstruction((...actual) => { instructions.push(actual); assert.deepEqual(actual, args); return 93; }, ...args), 93);
      }
      return 77;
    }, 8000, 17, 29);
    assert.equal(result, 77); return rows;
  }
  function advance(index) {
    const result = adapter.handlers.scriptAdvance((...args) => { assert.deepEqual(args, [8000, rows[index].work, 43]); advances++; return 1; }, 8000, rows[index].work, 43);
    assert.equal(result, 1);
  }
  function frame() { adapter.handlers.messageFrame(() => {}, 0, Math.fround(1 / 60), 0); }
  function display(text, speaker = '') {
    const full = managed(text), name = managed(speaker), message = 9000, owner = 9100, label = 9200;
    view.setUint32(message + 8, full, true); view.setUint32(message + 12, name, true); view.setUint32(message + 24, owner, true);
    adapter.handlers.messageFrame(() => {
      adapter.handlers.messageText((_owner, value) => adapter.handlers.legacySet(exports.__uwt_original_legacySet, label, value, 0), owner, managed(text.slice(0, 1)), 0);
    }, message, Math.fround(1 / 60), 0);
    return { text: read(labels.get(label)), binding: bindings.get('native-' + label), label, full };
  }
  return { state, adapter, calls, events, initialize, advance, frame, display, read, managed, exports, roots, bindings, instructions,
    get advances() { return advances; }, get historyResets() { return historyResets; } };
}
const dialogue = Array.from({ length: 6 }, (_, index) => ({ text: `これは${index + 1}番目の台詞です。`, speaker: 'アリス' }));
const f = fixture(undefined);
f.initialize([{ text: '@control', instruction: 2 }, { text: '一行目$n二行目$です。', speaker: 'アリス' }, ...dialogue]);
assert.equal(f.calls.length, 0, 'Native initialization returns before any network work starts');
await tick();
assert.deepEqual(f.calls.filter(row => row.kind === 'story').map(row => row.text), ['一行目\n二行目です。', dialogue[0].text], 'Default prefetch covers exactly two dialogue lines, skipping native commands');
assert.equal(f.instructions.length, 8); assert.equal(f.advances, 0, 'Preloading never executes dialogue commands');
assert.equal(f.historyResets, 1); assert(f.calls.every(row => row.recordHistory === false));
assert.deepEqual(f.events[0], { status: 'captured', count: 7 });
assert.equal(f.calls.filter(row => row.kind === 'name').length, 1, 'Shared speaker names are deduplicated independently of the sentence limit');
for (let i = 0; i < 30; i++) f.frame(); await tick();
assert.equal(f.calls.filter(row => row.kind === 'story').length, 2, 'Repeated frames cannot expand the configured window to the entire scene');
f.advance(1); await tick();
assert.deepEqual(f.calls.filter(row => row.kind === 'story').map(row => row.text), ['一行目\n二行目です。', dialogue[0].text, dialogue[1].text]);
f.advance(2); await tick(); assert.equal(f.calls.filter(row => row.kind === 'story').length, 4, 'Advancing replenishes the future window');
const shown = f.display(dialogue[0].text, 'アリス');
assert.equal(shown.text, '译文：' + dialogue[0].text, 'A prepared complete translation reaches the native label synchronously');
assert.equal(shown.binding.prepared, shown.text); assert.equal(shown.binding.context.speaker, 'アリス');
const advanceWrites = [];
f.adapter.handlers.legacySet((pointer, value) => { advanceWrites.push(f.read(value)); f.exports.__uwt_original_legacySet(pointer, value); }, shown.label, shown.full, 0);
assert.deepEqual(advanceWrites, [shown.text], 'Prefetch preserves the stable native advance-write guard');
f.state.active = false; f.advance(3); await tick(); const paused = f.calls.length;
f.frame(); await tick(); assert.equal(f.calls.length, paused);
f.state.active = true; f.state.enabled = false; f.frame(); await tick(); assert.equal(f.calls.length, paused);
f.state.enabled = true; f.frame(); await tick(); assert(f.calls.length > paused);
assert.equal(f.adapter.handlers.scriptDispose((owner, info) => { assert.deepEqual([owner, info], [8000, 53]); return 89; }, 8000, 53), 89);
assert.equal(f.roots.size, 0); assert.equal(f.bindings.size, 0); assert.equal(f.historyResets, 2);
const ended = f.calls.length; f.frame(); await tick(); assert.equal(f.calls.length, ended);
f.adapter.dispose();

const zero = fixture(0); zero.initialize(dialogue); await tick(); assert.equal(zero.calls.length, 0);
zero.state.lookahead = 1; zero.state.epoch++; zero.adapter.invalidate(); await tick();
assert.deepEqual(zero.calls.filter(row => row.kind === 'story').map(row => row.text), [dialogue[0].text]);
zero.state.lookahead = 0; zero.state.epoch++; zero.adapter.invalidate(); zero.advance(0); await tick();
assert.equal(zero.calls.filter(row => row.kind === 'story').length, 1, 'Zero stops background work while retaining native playback'); zero.adapter.dispose();

const maximum = fixture(20); maximum.initialize(Array.from({ length: 25 }, (_, index) => ({ text: `日本語${index}` }))); await tick();
assert.equal(maximum.calls.length, 20); maximum.adapter.dispose();
const malformed = fixture(2);
malformed.initialize([{ text: null }, { text: '有効な会話です。' }, { text: '重複です。', offset: 100 }, { text: '制御です。', instruction: 5 }]);
await tick(); assert.deepEqual(malformed.calls.map(row => row.text), ['有効な会話です。']);
let invalidCalls = 0;
assert.equal(malformed.adapter.handlers.scriptAdvance(() => { invalidCalls++; return 5; }, 8000, 0x7fffffff, 0), 5);
assert.equal(invalidCalls, 1, 'Invalid native positions preserve the original call and result'); malformed.adapter.dispose();

const pending = [];
const delayed = fixture(2, text => new Promise(resolve => pending.push({ text, resolve })));
delayed.initialize(dialogue); await tick(); assert.equal(pending.length, 1, 'Only one future sentence is in flight');
delayed.state.active = false; pending[0].resolve('旧语言译文'); await tick();
assert.equal(pending.length, 1, 'Pause prevents the next sentence or name request');
delayed.state.active = true; delayed.state.epoch++; delayed.adapter.invalidate(); await tick();
assert.equal(pending.length, 2);
delayed.state.epoch++; delayed.adapter.invalidate(); await tick(); assert.equal(pending.length, 3);
pending[1].resolve('过期 Profile 译文'); await tick();
assert.equal(delayed.display(dialogue[0].text, 'アリス').text, dialogue[0].text.slice(0, 1), 'An old profile result cannot populate the new profile native cache');
delayed.adapter.handlers.legacyDisable(() => {}, 9200, 0);
pending[2].resolve('当前 Profile 译文'); await tick();
assert.equal(delayed.display(dialogue[0].text, 'アリス').text, '当前 Profile 译文');
delayed.initialize([{ text: '新场景の台詞です。' }]); await tick(); const sceneRequest = pending.at(-1);
for (const row of pending.filter(row => row !== sceneRequest)) row.resolve('迟到的旧场景');
await tick(); assert.equal(delayed.display('新场景の台詞です。').text, '新');
delayed.adapter.dispose(); sceneRequest.resolve('已销毁场景的译文'); await tick();
assert.equal(delayed.roots.size, 0); assert.equal(delayed.bindings.size, 0);
console.log('Native prefetch: bounded rolling dialogue, read-only commands, names, zero/pause, immediate prepared display, history exclusion and stale scene/profile cleanup passed.');
