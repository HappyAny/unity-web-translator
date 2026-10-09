import assert from 'node:assert/strict';
import '../extension/native-labels.js';

const memory = new WebAssembly.Memory({ initial: 4 });
let cursor = 10000, handle = 1, calls = 0, meshCalls = 0, progress = 0.65, storyEnabled = true, uiEnabled = false;
const roots = new Set(), labels = new Map(), bindings = new Map(), warm = [];
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
  __uwt_label_text: pointer => labels.get(pointer) || 0,
  __uwt_original_labelSet(pointer, value) { labels.set(pointer, value); },
  __uwt_reveal_progress: () => progress,
  __uwt_set_reveal_progress(_pointer, value) { progress = value; },
  __uwt_mesh() { meshCalls++; },
};
const adapter = globalThis.__UnityNativeLabels.create(exports, {
  active: () => true, enabled: kind => kind === 'ui' ? uiEnabled : storyEnabled,
  bind(id, original, apply, options) { const entry = { original, apply, options }; bindings.set(id, entry); apply(original); return () => { if (bindings.get(id) === entry) bindings.delete(id); }; },
  translate: async (text, options) => { warm.push({ text, ...options }); return text; }, lookahead: () => 2,
});
function nativeRender(pointer, value) {
  calls++; progress = 0;
  adapter.handlers.labelSet(exports.__uwt_original_labelSet, pointer, value, 0);
}
adapter.handlers.nameSet(() => {}, 500, managed('アリス'), 0);
const first = managed('これは最初の全文です。');
adapter.handlers.revealText(nativeRender, 1000, first, 0);
assert.equal(calls, 1, 'A new sentence calls the native renderer only once');
assert.equal(bindings.size, 1, 'Dialogue never creates an extra UI binding');
const entry = bindings.get('native-1000');
assert.equal(entry.options.kind, 'story'); assert.equal(entry.options.speaker, 'アリス');
progress = 0.65; entry.apply('这是第一句完整对白。');
assert.equal(read(labels.get(1000)), '这是第一句完整对白。');
assert.equal(progress, 0.65, 'Translated text retains native reveal progress'); assert.equal(meshCalls, 1);
const repeatWrites = [], beforeCalls = calls;
const repeatSet = (pointer, value, info) => { repeatWrites.push(read(value)); labels.set(pointer, value); assert.equal(info, 17); return 83; };
assert.equal(adapter.handlers.labelSet(repeatSet, 1000, first, 17), 83);
adapter.handlers.labelSet(repeatSet, 1000, managed('これは'), 17);
adapter.handlers.labelSet(repeatSet, 1000, managed('这是'), 17);
assert.deepEqual(repeatWrites, Array(3).fill('这是第一句完整对白。'), 'Source and translated prefixes cannot replace an already displayed translation');
labels.set(1000, first);
assert.equal(adapter.handlers.labelProcessing(pointer => {
  assert.equal(read(labels.get(pointer)), '这是第一句完整对白。', 'Direct assignments are repaired before native text processing'); return 97;
}, 1000, 0), 97);
assert.equal(calls, beforeCalls); assert.equal(meshCalls, 1); assert.equal(progress, 0.65, 'Protected setter writes never replay the reveal renderer');
adapter.handlers.revealText(nativeRender, 1000, first, 0);
assert.equal(read(labels.get(1000)), '这是第一句完整对白。', 'Repeated native assignments retain a prepared translation');
progress = 1; entry.apply(read(first));
assert.equal(progress, 1, 'Pause restores the complete original sentence');
const next = managed('次の会話です。');
adapter.handlers.labelSet(exports.__uwt_original_labelSet, 1000, first, 0);
assert.equal(read(labels.get(1000)), read(first), 'Source restoration disables the translated setter guard');
adapter.handlers.revealText(nativeRender, 1000, next, 0);
entry.apply('迟到的旧译文'); assert.equal(read(labels.get(1000)), read(next));
const nextBinding = bindings.get('native-1000'); uiEnabled = true;
adapter.handlers.labelSet(exports.__uwt_original_labelSet, 1000, managed('次の'), 0);
adapter.handlers.labelProcessing(() => {}, 1000, 0);
assert.equal(bindings.get('native-1000'), nextBinding, 'Changing a full sentence retains the protected reveal component, even with UI translation enabled');
assert.equal(nextBinding.original, read(next));
nextBinding.apply('下一句完整中文。');
adapter.handlers.labelSet(exports.__uwt_original_labelSet, 1000, managed(''), 0);
nextBinding.apply('迟到的译文');
assert.equal(read(labels.get(1000)), ''); assert.equal(bindings.size, 0); assert.equal(roots.size, 0, 'Empty text clears the protected translation');
adapter.handlers.labelDisable(() => {}, 1000, 0); assert.equal(roots.size, 0); assert.equal(bindings.size, 0);
storyEnabled = false; uiEnabled = true;
adapter.handlers.revealText(nativeRender, 1000, first, 0);
assert.equal(read(labels.get(1000)), read(first)); assert.equal(bindings.size, 0, 'A disabled story switch cannot translate dialogue as UI');
storyEnabled = true;
adapter.handlers.scriptPrefetch((_path, value) => assert.equal(read(value).includes('@wait'), true), 0,
  managed('@wait 1\n;comment\nアリス: こんにちは\nお元気ですか？\n{variable}\n@print text:command\n次の行\n'), 0, 0);
await new Promise(resolve => setImmediate(resolve));
assert(warm.some(row => row.text === 'こんにちは' && row.speaker === 'アリス'));
assert(warm.some(row => row.text === 'お元気ですか？'));
assert(!warm.some(row => row.text === '次の行' || row.text.includes('variable') || row.text.includes('@')));
adapter.dispose(); assert.equal(roots.size, 0); assert.equal(bindings.size, 0);
console.log('Revealable text: whole sentences, native progress, speaker context, bounded prefetch, switches and stale-response cleanup passed.');
