import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import '../extension/native-wasm.js';
import '../extension/native-labels.js';

const tools = globalThis.__UnityWasmTools;
const uint = value => { const result = []; do { const b = value & 127; value >>>= 7; result.push(b | (value ? 128 : 0)); } while (value); return result; };
const text = value => [...uint(Buffer.byteLength(value)), ...Buffer.from(value)];
const section = (id, data) => [id, ...uint(data.length), ...data];
const fixture = Uint8Array.from([0, 97, 115, 109, 1, 0, 0, 0,
  ...section(1, [1, 0x60, 2, 0x7f, 0x7f, 1, 0x7f]),
  ...section(3, [1, 0]), ...section(4, [1, 0x70, 1, 1, 1]),
  ...section(7, [2, ...text('add'), 0, 0, ...text('__indirect_function_table'), 1, 0]),
  ...section(10, [1, 7, 0, 0x20, 0, 0x20, 1, 0x6a, 0x0b]),
  ...section(0, [...text('padding'), ...new Array(1100).fill(0)]),
]);
assert(WebAssembly.validate(fixture));
const spec = { sha256: createHash('sha256').update(fixture).digest('hex'), importedFunctions: 0, hooks: [{ name: 'add', function: 0 }] };
const patched = tools.rewrite(fixture, spec);
assert(WebAssembly.validate(patched.bytes));
const { instance } = await WebAssembly.instantiate(patched.bytes);
assert.equal(instance.exports.__uwt_original_add(2, 3), 5);
const thunk = await WebAssembly.instantiate(tools.trampoline(patched.hooks[0].signature), { bridge: { call: (a, b) => instance.exports.__uwt_original_add(a, b) + 10 } });
instance.exports.__indirect_function_table.set(patched.hooks[0].slot, thunk.instance.exports.call);
assert.equal(instance.exports.add(2, 3), 15, 'The original call now enters a typed JS hook');
assert.equal(instance.exports.__indirect_function_table.length, 2);
assert.throws(() => tools.rewrite(fixture.subarray(0, -2), spec));
assert.throws(() => tools.rewrite(fixture, { ...spec, hooks: [{ name: 'invalid', function: 1 }] }));

const nativeInstantiate = WebAssembly.instantiate, states = [];
let active = true;
const restore = tools.install({ builds: [spec], enabled: () => active, createHandlers: () => ({ add: (original, a, b) => original(a, b) * 3 }), onStatus: value => states.push(value) });
let result = await WebAssembly.instantiate(fixture);
assert.equal(result.instance.exports.add(2, 3), 15);
assert.deepEqual(states, ['ready']);
active = false; result = await WebAssembly.instantiate(fixture);
assert.equal(result.instance.exports.add(2, 3), 5, 'An inactive profile leaves the module unchanged');
active = true; const unknown = fixture.slice(); unknown[unknown.length - 1] = 1;
result = await WebAssembly.instantiate(unknown); assert.equal(result.instance.exports.add(2, 3), 5, 'A different fingerprint keeps native behavior');
restore(); assert.equal(WebAssembly.instantiate, nativeInstantiate);

// Exercise native string allocation, root lifetime, classification and disposal.
const memory = new WebAssembly.Memory({ initial: 4 }); let cursor = 1024, nextHandle = 1, generation = 0;
const roots = new Map(), labels = new Map(), bindings = new Map(), deferred = [];
function managed(text) { const pointer = cursor; cursor += 12 + (text.length + 1) * 2; const view = new DataView(memory.buffer); view.setInt32(pointer + 8, text.length, true); for (let i = 0; i < text.length; i++) view.setUint16(pointer + 12 + i * 2, text.charCodeAt(i), true); return pointer; }
function read(pointer) { const view = new DataView(memory.buffer), count = view.getInt32(pointer + 8, true); let text = ''; for (let i = 0; i < count; i++) text += String.fromCharCode(view.getUint16(pointer + 12 + i * 2, true)); return text; }
const exports = {
  memory, malloc(bytes) { const pointer = cursor; cursor += bytes; return pointer; }, free() {},
  __uwt_string(pointer, start, count) { const view = new DataView(memory.buffer); let value = ''; for (let i = 0; i < count; i++) value += String.fromCharCode(view.getUint16(pointer + (start + i) * 2, true)); return managed(value); },
  __uwt_label_text: pointer => labels.get(pointer) || 0,
  __uwt_root(pointer) { const handle = nextHandle++; roots.set(handle, pointer); return handle; },
  __uwt_unroot(handle) { assert(roots.delete(handle), 'Each root is freed once'); },
  __uwt_original_labelSet(pointer, value) { labels.set(pointer, value); },
};
const adapter = globalThis.__UnityNativeLabels.create(exports, {
  active: () => true, enabled: kind => kind !== 'ui', context: () => generation,
  translate: text => new Promise(resolve => deferred.push({ text, resolve })),
  bind(id, original, apply, options) { const binding = { original, apply, options }; bindings.set(id, binding); apply(original); return () => { if (bindings.get(id) === binding) bindings.delete(id); }; },
});
const source = managed('こんにちは<br>元気？');
adapter.handlers.storyParse(() => {}, 100, 200, source, 0);
assert.equal(deferred[0].text, 'こんにちは<br>元気？');
const rendered = managed('こんにちは\n元気？');
adapter.handlers.labelSet(exports.__uwt_original_labelSet, 300, rendered, 0);
assert.equal(bindings.size, 1); assert.equal(roots.size, 2);
assert.equal(bindings.get('native-300').options.kind, 'story');
bindings.get('native-300').apply('你好\n好吗？');
assert.equal(read(labels.get(300)), '你好\n好吗？');
bindings.get('native-300').apply('こんにちは\n元気？');
assert.equal(read(labels.get(300)), 'こんにちは\n元気？', 'The original rooted string restores native text');
const stale = bindings.get('native-300'); adapter.handlers.labelDisable(() => {}, 300, 0);
assert.equal(roots.size, 0); stale.apply('旧译文'); assert.equal(read(labels.get(300)), 'こんにちは\n元気？');
generation++; adapter.invalidate(); deferred[0].resolve('你好<br>好吗？'); await new Promise(resolve => setImmediate(resolve));
let parseValue; adapter.handlers.storyParse((_pointer, _letters, value) => { parseValue = value; }, 100, 200, source, 0);
assert.equal(parseValue, source, 'A previous profile cannot prime the new profile cache');
const script = managed('dotmessage,アリス,こんにちは,,,,\n'.repeat(100));
adapter.handlers.scriptLoad(() => {}, 100, script, 0);
assert(deferred.some(item => item.text === 'アリス'), 'Script prefetch reads strings beyond the label limit');
const view = new DataView(memory.buffer); view.setUint32(500 + 16, 600, true);
const first = managed('これは最初の全文です。'), next = managed('これは次の全文です。');
let balloonSource, balloonCalls = 0;
const balloon = (_owner, value) => { balloonSource = read(value); balloonCalls++; adapter.handlers.labelSet(exports.__uwt_original_labelSet, 600, managed(balloonSource.slice(0, 2)), 0); };
adapter.handlers.balloonStart(balloon, 500, first, 2, 1, 0);
assert.equal(balloonCalls, 1, 'The original initializer runs exactly once');
assert.equal(bindings.get('native-600').original, read(first));
assert.equal(bindings.get('native-600').options.kind, 'story');
assert.equal(roots.size, 3, 'The balloon owner stays rooted along with its label and source');
const oldBalloon = bindings.get('native-600');
oldBalloon.apply('这是第一句话。'); assert.equal(balloonSource, '这是第一句话。');
adapter.handlers.labelSet(exports.__uwt_original_labelSet, 600, managed('这'), 0);
assert.equal(bindings.get('native-600'), oldBalloon, 'Per-frame prefixes cannot replace the full-sentence binding');
adapter.handlers.balloonStart(balloon, 500, next, 2, 1, 0);
oldBalloon.apply('迟到的译文'); assert.equal(balloonSource, read(next), 'A previous sentence cannot rewrite the current balloon');
adapter.handlers.labelDisable(() => {}, 600, 0); assert.equal(roots.size, 0);
view.setUint32(700 + 28, 800, true); view.setUint32(700 + 32, 900, true);
adapter.handlers.glyphInitialize(() => {}, 700, 0, 0, 1, 0);
adapter.handlers.labelSet(exports.__uwt_original_labelSet, 800, managed('あ'), 0);
assert.equal(bindings.size, 0, 'Individual native letters never create separate UI translation requests');
adapter.handlers.labelDisable(() => {}, 800, 0);
let shownWindow, gameLogs = 0, windowCalls = 0;
const windowText = (_owner, value) => {
  windowCalls++;
  adapter.handlers.windowClear(() => {}, 1100, 0);
  adapter.handlers.storyParse((_parser, _letters, source) => { shownWindow = read(source); }, 1200, 1300, value, 0);
  adapter.handlers.windowLog(() => { gameLogs++; }, 1100, value, 0);
};
adapter.handlers.windowText(windowText, 1100, first, 0);
assert.equal(windowCalls, 1); assert.equal(gameLogs, 1); assert.equal(roots.size, 2);
const previousWindow = bindings.get('native-window-1100');
previousWindow.apply('这是中文逐字剧情。'); assert.equal(shownWindow, '这是中文逐字剧情。');
assert.equal(gameLogs, 1, 'Refreshing translated text never adds another game history entry');
previousWindow.apply(read(first)); assert.equal(shownWindow, read(first), 'Pause restores the original parsed sentence');
assert.equal(gameLogs, 1);
adapter.handlers.windowText(windowText, 1100, next, 0);
previousWindow.apply('过期的剧情'); assert.equal(shownWindow, read(next)); assert.equal(gameLogs, 2);
adapter.handlers.windowClear(() => {}, 1100, 0); assert.equal(roots.size, 0); assert.equal(bindings.size, 0);
adapter.dispose(); assert.equal(roots.size, 0); assert.equal(bindings.size, 0);
console.log('WASM: typed hooks, native fallback, fingerprints, UTF-16, root lifetime, stale responses and disposal passed.');
