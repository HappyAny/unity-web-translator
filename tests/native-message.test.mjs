import assert from 'node:assert/strict';
import '../extension/native-labels.js';

const memory = new WebAssembly.Memory({ initial: 4 });
let cursor = 10000, handle = 1, active = true, enabled = true;
const roots = new Set(), labels = new Map(), bindings = new Map(), lengths = [];
function managed(text) {
  const pointer = cursor; cursor += 12 + (text.length + 1) * 2;
  const view = new DataView(memory.buffer); view.setInt32(pointer + 8, text.length, true);
  for (let i = 0; i < text.length; i++) view.setUint16(pointer + 12 + i * 2, text.charCodeAt(i), true);
  return pointer;
}
function read(pointer) {
  if (!pointer) return '';
  const view = new DataView(memory.buffer); let text = '';
  for (let i = 0, length = view.getInt32(pointer + 8, true); i < length; i++) text += String.fromCharCode(view.getUint16(pointer + 12 + i * 2, true));
  return text;
}
const exports = {
  memory, malloc(size) { const pointer = cursor; cursor += size; return pointer; }, free() {},
  __uwt_string(pointer, start, count) { return managed(String.fromCharCode(...new Uint16Array(memory.buffer, pointer + start * 2, count))); },
  __uwt_root() { roots.add(handle); return handle++; }, __uwt_unroot(value) { assert(roots.delete(value)); },
  __uwt_label_text: pointer => labels.get(pointer) || 0,
  __uwt_original_legacySet(pointer, value) { labels.set(pointer, value); },
  __uwt_original_novelLength(pointer, length) { lengths.push([pointer, length]); },
  __uwt_text_data_raw: pointer => pointer,
};
const options = {
  active: () => active, enabled: () => enabled, translate: async text => text,
  bind(id, original, apply, context) {
    const entry = { original, apply, context }; bindings.set(id, entry); apply(original);
    return () => { if (bindings.get(id) === entry) bindings.delete(id); };
  },
};
const adapter = globalThis.__UnityNativeLabels.create(exports, { ...options, layout: { message: { text: 8, name: 12, view: 24 } } });
const view = new DataView(memory.buffer), owner = 1000, message = 2000, label = 3000;
const first = managed('これは最初の全文です。'), next = managed('これは次の全文です。'), name = managed('アリス');
view.setUint32(message + 8, first, true); view.setUint32(message + 12, name, true); view.setUint32(message + 24, owner, true);
let frames = 0;
function frame(pointer, deltaTime, info) {
  assert.equal(pointer, message); assert.equal(deltaTime, Math.fround(1 / 60)); assert.equal(info, 19); frames++;
  adapter.handlers.messageText((_owner, value, method) => {
    assert.equal(method, 13);
    adapter.handlers.legacySet(exports.__uwt_original_legacySet, label, value, 0);
  }, owner, managed(read(view.getUint32(message + 8, true)).slice(0, frames)), 13);
}
const tick = () => adapter.handlers.messageFrame(frame, message, Math.fround(1 / 60), 19);
tick();
const previous = bindings.get('native-3000');
assert.equal(previous.original, read(first)); assert.equal(previous.context.kind, 'story'); assert.equal(previous.context.speaker, read(name));
assert.equal(read(labels.get(label)), 'こ', 'The source retains its initial native reveal');
previous.apply(read(first)); assert.equal(read(labels.get(label)), 'こ', 'A failed translation retains the native prefix and timing');
tick(); assert.equal(bindings.get('native-3000'), previous); assert.equal(bindings.size, 1, 'Prefixes never become separate UI requests');
previous.apply('这是第一句完整对白。'); assert.equal(read(labels.get(label)), '这是第一句完整对白。');
tick(); assert.equal(frames, 3, 'Native timing continues after translation');
assert.equal(read(labels.get(label)), '这是第一句完整对白。', 'Later prefixes cannot restart or overwrite the translation');
view.setUint32(message + 8, next, true); tick();
assert.equal(bindings.get('native-3000').original, read(next));
previous.apply('迟到的旧译文'); assert.equal(read(labels.get(label)), read(next).slice(0, frames), 'A stale result cannot rewrite a new message');
active = false; tick(); assert.equal(bindings.size, 0); assert.equal(roots.size, 0);
assert.equal(read(labels.get(label)), read(next).slice(0, frames), 'Pause resumes the native prefix');
active = true; tick();
adapter.handlers.legacyDisable(() => {}, label, 0); assert.equal(roots.size, 0);
adapter.dispose();

const novel = globalThis.__UnityNativeLabels.create(exports, { ...options, layout: { novel: { body: 68, name: 72 } } });
const window = 4000, data = 5000, body = 6000, nameLabel = 7000;
view.setUint32(window + 68, body, true); view.setUint32(window + 72, nameLabel, true);
view.setUint32(data + 12, first, true); view.setUint32(data + 16, name, true);
let changes = 0;
function changed(pointer, messageData, info) {
  assert.equal(pointer, window); assert.equal(messageData, data); assert.equal(info, 23); changes++;
  novel.handlers.legacySet(exports.__uwt_original_legacySet, body, managed(''), 0);
  novel.handlers.legacySet(exports.__uwt_original_legacySet, body, view.getUint32(data + 12, true), 0);
  novel.handlers.legacySet(exports.__uwt_original_legacySet, nameLabel, view.getUint32(data + 16, true), 0);
  novel.handlers.novelLength(exports.__uwt_original_novelLength, body, 2, 0);
}
novel.handlers.novelWindow(changed, window, data, 23);
assert.equal(bindings.get('native-6000').original, read(first)); assert.equal(bindings.get('native-7000').context.kind, 'name');
assert.deepEqual(lengths.at(-1), [body, 2], 'The initial source retains native visibility');
const oldNovel = bindings.get('native-6000'); oldNovel.apply('完整中文对白。');
assert.equal(read(labels.get(body)), '完整中文对白。'); assert.deepEqual(lengths.at(-1), [body, 0x7fffffff]);
const updates = lengths.length; oldNovel.apply('完整中文对白。'); assert.equal(lengths.length, updates, 'An unchanged translation does not replay rendering');
novel.handlers.novelLength(exports.__uwt_original_novelLength, body, 3, 0);
assert.deepEqual(lengths.at(-1), [body, 0x7fffffff], 'Translated text stays visible while native commands continue');
assert.equal(changes, 1, 'Refreshing a translation never replays the window or command callback');
enabled = false; oldNovel.apply(read(first));
novel.handlers.novelLength(exports.__uwt_original_novelLength, body, 4, 0); assert.deepEqual(lengths.at(-1), [body, 4]);
enabled = true; view.setUint32(data + 12, next, true);
novel.handlers.novelWindow(changed, window, data, 23); oldNovel.apply('过期结果');
assert.equal(read(labels.get(body)), read(next));
novel.handlers.novelWindow(() => { changes++; }, -1, 0, 0); assert.equal(changes, 3, 'An invalid layout still calls the original exactly once');
novel.handlers.legacySet(exports.__uwt_original_legacySet, body, managed(''), 0);
assert(!bindings.has('native-6000'), 'An empty native message releases the whole-sentence binding');
novel.dispose(); assert.equal(roots.size, 0); assert.equal(bindings.size, 0);
console.log('Native messages: complete sentences, float frame time, native reveal, stable translations, names, pause, stale results and cleanup passed.');
