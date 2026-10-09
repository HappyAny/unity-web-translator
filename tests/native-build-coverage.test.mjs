import assert from 'node:assert/strict';
import '../extension/native-labels.js';

for (const build of globalThis.__UnityNativeLabels.builds.slice(0, 3)) {
  const memory = new WebAssembly.Memory({ initial: 4 });
  const labels = new Map(), roots = new Set(), bindings = new Map();
  let cursor = 10000, rootId = 1, active = true, uiEnabled = true;
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
    __uwt_string(pointer, start, length) { const view = new DataView(memory.buffer); let text = ''; for (let i = 0; i < length; i++) text += String.fromCharCode(view.getUint16(pointer + (start + i) * 2, true)); return managed(text); },
    __uwt_root() { roots.add(rootId); return rootId++; }, __uwt_unroot(handle) { assert(roots.delete(handle)); },
    __uwt_label_text: pointer => labels.get(pointer) || 0, __uwt_legacy_text: pointer => labels.get(pointer) || 0,
    __uwt_original_labelSet(pointer, value) { labels.set(pointer, value); },
    __uwt_original_legacySet(pointer, value) { labels.set(pointer, value); },
  };
  const adapter = globalThis.__UnityNativeLabels.create(exports, {
    layout: build.layout, font: build.font, active: () => active, enabled: kind => kind === 'ui' ? uiEnabled : true,
    bind(id, original, apply, options) { const slot = { original, apply, options }; bindings.set(id, slot); apply(original); return () => { if (bindings.get(id) === slot) bindings.delete(id); }; },
  });
  function call(name, original, ...args) {
    assert(build.hooks.some(hook => hook.name === name), `Matched build ${build.sha256.slice(0, 8)} does not install ${name}`);
    return adapter.handlers[name](original, ...args);
  }

  // A serialized world-space label can exist before the normal string setter runs.
  labels.set(1000, managed('任務一覧'));
  let enables = 0;
  call('meshEnable', (pointer, info) => { assert.deepEqual([pointer, info], [1000, 91]); enables++; }, 1000, 91);
  assert.equal(enables, 1); assert.equal(bindings.get('native-1000').original, '任務一覧');
  const world = bindings.get('native-1000'); world.apply('任务列表');
  call('meshDisable', () => {}, 1000, 0);
  world.apply('过期文本'); assert.equal(read(labels.get(1000)), '任务列表'); assert.equal(roots.size, 0);
  call('meshEnable', () => {}, 1000, 0);
  assert.equal(bindings.get('native-1000').original, '任務一覧', 'Component reuse keeps source provenance');
  call('meshDestroy', () => {}, 1000, 0); assert.equal(roots.size, 0);

  // A custom render path can expose a new canonical string without a property setter.
  for (const name of ['labelDrawing', 'meshDrawing']) {
    const pointer = name === 'labelDrawing' ? 2000 : 3000;
    labels.set(pointer, managed('最初の説明です。'));
    let draws = 0;
    const draw = (label, info) => { assert.deepEqual([label, info], [pointer, 92]); draws++; return 123; };
    assert.equal(call(name, draw, pointer, 92), 123);
    const stale = bindings.get('native-' + pointer); stale.apply('初始说明。');
    labels.set(pointer, managed('次の説明です。'));
    assert.equal(call(name, draw, pointer, 92), 123);
    stale.apply('旧译文'); assert.equal(read(labels.get(pointer)), '次の説明です。');
    const current = bindings.get('native-' + pointer); current.apply('下一条说明。');
    call(name, draw, pointer, 92);
    assert.equal(bindings.get('native-' + pointer), current, 'Repainting translated output must retain the source binding');
    assert.equal(draws, 3);
    const oversized = managed('あ'.repeat(2001)); labels.set(pointer, oversized);
    call(name, draw, pointer, 92); current.apply('已经过期');
    assert.equal(labels.get(pointer), oversized, 'Drawing an oversized replacement cancels the old task');
    assert.equal(roots.size, 0);
  }

  labels.set(4000, managed('報酬確認'));
  let legacyDraws = 0;
  call('legacyProcessing', (pointer, mesh, info) => { assert.deepEqual([pointer, mesh, info], [4000, 77, 93]); legacyDraws++; }, 4000, 77, 93);
  const legacy = bindings.get('native-4000'); assert.equal(legacy.original, '報酬確認'); legacy.apply('确认奖励');
  call('legacyProcessing', () => { legacyDraws++; }, 4000, 77, 93);
  assert.equal(bindings.get('native-4000'), legacy); assert.equal(legacyDraws, 2);
  call('legacyDestroy', () => {}, 9999, 0);
  assert.equal(bindings.get('native-4000'), legacy, 'An unrelated Graphic destructor cannot release another component');
  call('legacyDisable', () => {}, 4000, 0); assert.equal(roots.size, 0);
  adapter.invalidate(); call('legacyEnable', () => {}, 4000, 0);
  assert.equal(bindings.get('native-4000').original, '報酬確認');
  bindings.get('native-4000').apply('确认奖励'); adapter.reset();
  call('legacyEnable', () => {}, 4000, 0); assert.equal(bindings.get('native-4000').original, '報酬確認');
  call('legacyDestroy', () => {}, 4000, 0); assert.equal(roots.size, 0);

  uiEnabled = false; labels.set(5000, managed('未翻訳の設定'));
  call('labelDrawing', () => {}, 5000, 0); assert.equal(bindings.size, 0);
  uiEnabled = true; active = false;
  call('meshDrawing', () => {}, 5000, 0); assert.equal(bindings.size, 0);
  adapter.dispose(); assert.equal(roots.size, 0);
  console.log(`Matched TMP build ${build.sha256.slice(0, 8)}: world-space lifecycle, render paths, legacy UI, reuse, stale results, switches and root cleanup passed.`);
}
