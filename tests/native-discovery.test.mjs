// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import '../extension/native-wasm.js';
import '../extension/native-profiles.js';
import '../extension/native-labels.js';
import { generateProfile } from '../scripts/native-profile.mjs';
const discovery = globalThis.__UnityNativeDiscovery, tools = globalThis.__UnityWasmTools;
const uint = n => { const bytes = []; do { const b = n & 127; n >>>= 7; bytes.push(b | (n ? 128 : 0)); } while (n); return bytes; };
const sint = n => { const bytes = []; do { const b = n & 127; n >>= 7; const done = n === 0 && !(b & 64) || n === -1 && (b & 64); bytes.push(b | (done ? 0 : 128)); if (done) return bytes; } while (true); };
const string = s => [...uint(Buffer.byteLength(s)), ...Buffer.from(s)];
const section = (id, bytes) => [id, ...uint(bytes.length), ...bytes];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(options = {}) {
  const names = ['target', 'helper', 'probe', 'allocate', 'release', 'unrelated', 'multiply', 'cleanup'];
  const order = options.reorder ? [4, 2, 0, 6, 7, 1, 5, 3] : names.map((_, i) => i);
  const imported = options.extraImport ? 1 : 0, ids = Object.fromEntries(order.map((n, i) => [names[n], i + imported]));
  const address = options.address ?? 70000;
  const types = [[2, 127, 127, 1, 127], [0, 1, 127], [1, 127, 1, 127], [1, 127, 0]];
  const typeOrder = options.reorder ? [3, 1, 0, 2] : [0, 1, 2, 3], typeId = i => typeOrder.indexOf(i);
  const bodies = {
    target: [0, 0x20, 0, 0x20, 1, 0x10, ...uint(ids.helper), ...(options.interfaceAnchor ? [0x41, 0, 0x6a] : []), 0x0b],
    helper: [0, 0x20, 0, 0x20, 1, options.interfaceChanged ? 0x6c : 0x6a, 0x0b],
    probe: [0, 0x41, ...sint(address), 0x28, 2, options.fieldOffset || 0, 0x0b],
    allocate: [0, 0x20, 0, 0x41, 16, 0x6a, 0x0b],
    release: [0, 0x20, 0, 0x1a, 0x0b],
    unrelated: [0, 0x20, 0, 0x20, 1, 0x10, ...uint(ids.multiply), 0x0b],
    multiply: [0, 0x20, 0, 0x20, 1, options.ambiguous ? 0x6a : 0x6c, 0x0b],
    cleanup: [0, 0x20, 0, 0x1a, 0x0b],
  };
  const functionTypes = [0, 0, 1, 2, 3, 0, 0, 3];
  const memoryName = options.renamed ? 'newMemory' : 'oldMemory', tableName = options.renamed ? 'newTable' : 'oldTable';
  const mallocName = options.renamed ? 'newMalloc' : 'oldMalloc', freeName = options.renamed ? 'newFree' : 'oldFree';
  const exports = [['sum', 0, ids.target], [memoryName, 2, 0], [tableName, 1, 0], [mallocName, 0, ids.allocate], [freeName, 0, ids.release]];
  const tableOrder = options.brokenTable ? [2, 7, 0, 1, 3, 4, 5, 6] : names.map((_, i) => i);
  const value = options.tag ?? 0x20000003, data = Array.from({ length: 4 }, (_, i) => value >>> (i * 8) & 255);
  const bytes = Uint8Array.from([0, 97, 115, 109, 1, 0, 0, 0,
    ...section(1, [types.length, ...typeOrder.flatMap(i => [0x60, ...types[i]])]),
    ...(imported ? section(2, [1, ...string('env'), ...string('unused'), 0, typeId(2)]) : []),
    ...section(3, [order.length, ...order.map(i => typeId(functionTypes[i]))]),
    ...section(4, [1, 0x70, 1, 9, 9]), ...section(5, [1, 0, 2]),
    ...section(7, [exports.length, ...exports.flatMap(([name, kind, id]) => [...string(name), kind, ...uint(id)])]),
    ...section(9, [1, 0, 0x41, 1, 0x0b, tableOrder.length, ...tableOrder.flatMap(i => uint(ids[names[i]]))]),
    ...section(10, [order.length, ...order.flatMap(i => [bodies[names[i]].length, ...bodies[names[i]]])]),
    ...section(11, [1, 0, 0x41, ...sint(address), 0x0b, data.length, ...data]),
    ...section(0, [...string('revision'), ...new Array(1100).fill(options.revision || 0)]),
  ]);
  assert(WebAssembly.validate(bytes));
  const spec = { sha256: sha(bytes), importedFunctions: imported, hooks: [{ name: 'labelSet', function: ids.target }, { name: 'cleanup', function: ids.cleanup }],
    exports: { __uwt_helper: ids.helper, __uwt_probe: ids.probe, __uwt_allocator: ids.allocate }, font: { byteArrayTypeAddress: address },
    runtimeExports: { memory: memoryName, __indirect_function_table: tableName, malloc: mallocName, free: freeName } };
  return { bytes, ids, spec };
}
const old = fixture(), profile = await generateProfile(old.bytes, old.spec);
const newer = fixture({ reorder: true, renamed: true, extraImport: true, address: 91000, revision: 2 });
assert.notEqual(sha(newer.bytes), old.spec.sha256);
const resolved = await discovery.resolve(newer.bytes, [profile], [old.spec]);
assert(resolved); assert.equal(resolved.importedFunctions, 1);
assert.deepEqual(resolved.hooks, newer.spec.hooks);
assert.deepEqual(resolved.exports, newer.spec.exports);
assert.deepEqual(resolved.runtimeExports, newer.spec.runtimeExports);
assert.deepEqual(resolved.font, newer.spec.font, 'The old metadata address is replaced by the verified probe address');
assert.equal(profile.nodes.some(n => n.tableAnchors?.length >= 2), true, 'Ambiguous lifecycle functions require several known table anchors');
const patched = tools.rewrite(newer.bytes, resolved); assert(WebAssembly.validate(patched.bytes));
for (const options of [{ ambiguous: true }, { fieldOffset: 4 }, { tag: 0x40000003 }, { tag: 0x20000002 }, { brokenTable: true }]) {
  const incompatible = fixture(options);
  assert.equal(await discovery.resolve(incompatible.bytes, [profile], [old.spec]), null, JSON.stringify(options));
}
const corrupt = structuredClone(profile); corrupt.nodes[0].sha = '0'.repeat(64);
assert.equal(await discovery.resolve(newer.bytes, [corrupt], [old.spec]), null, 'Fast index hashes cannot authorize a patch without the strong digest');
await assert.rejects(discovery.resolve(newer.bytes.subarray(0, -10), [profile], [old.spec]));

// An argument-only story hook can follow an unchanged, strongly matched call site.
const interfaceOld = fixture({ interfaceAnchor: true });
interfaceOld.spec.hooks[0].name = 'windowText';
interfaceOld.spec.hooks.push({ name: 'storyParse', function: interfaceOld.ids.helper });
delete interfaceOld.spec.exports.__uwt_helper;
const interfaceProfile = await generateProfile(interfaceOld.bytes, interfaceOld.spec);
const interfaceNew = fixture({ interfaceAnchor: true, interfaceChanged: true, reorder: true, address: 93000 });
const interfacePlan = await discovery.resolve(interfaceNew.bytes, [interfaceProfile], [interfaceOld.spec]);
assert(interfacePlan, 'Compatible argument contracts survive renderer implementation changes');
assert.equal(interfacePlan.hooks.find(h => h.name === 'storyParse').function, interfaceNew.ids.helper);
const patchedInterface = tools.rewrite(interfaceNew.bytes, interfacePlan), interfaceNative = (await WebAssembly.instantiate(patchedInterface.bytes)).instance.exports;
assert.equal(interfaceNative.__uwt_original_storyParse(2, 3), 6, 'The updated renderer body is preserved without replaying the older implementation');

const native = WebAssembly.instantiate, states = [], matches = [], unknown = [];
let active = true, createCount = 0;
const handlers = () => { createCount++; return { labelSet: (original, a, b) => original(a, b) + 10, cleanup: (original, ...args) => original(...args) }; };
const restore = tools.install({ builds: [old.spec], profiles: [profile], enabled: () => active, createHandlers: handlers,
  onStatus: s => states.push(s), onDiscovery: d => matches.push(d), onUnrecognized: hash => unknown.push(hash) });
const imports = { env: { unused: value => value } };
assert.equal((await WebAssembly.instantiate(newer.bytes, imports)).instance.exports.sum(2, 3), 15, 'An unlisted updated module reaches the typed text handler');
assert.equal(matches.length, 1); assert.deepEqual(states, ['ready']);
assert.equal((await WebAssembly.instantiate(old.bytes)).instance.exports.sum(2, 3), 15);
assert.equal(matches.length, 1, 'Verified complete-module matches keep the fast path');
active = false;
assert.equal((await WebAssembly.instantiate(newer.bytes, imports)).instance.exports.sum(2, 3), 5);
assert.equal(matches.length, 1); assert.equal(createCount, 2, 'No scan or hooks run for an unbound/inactive profile');
active = true;
const invalid = fixture({ fieldOffset: 4 });
assert.equal((await WebAssembly.instantiate(invalid.bytes)).instance.exports.sum(2, 3), 5, 'Incompatible layouts execute the untouched module');
assert.deepEqual(unknown, [sha(invalid.bytes)]); restore(); assert.equal(WebAssembly.instantiate, native);

let lateHandlers = 0;
const restoreLate = tools.install({ builds: [old.spec], profiles: [profile], enabled: () => active,
  createHandlers: () => { lateHandlers++; return handlers(); }, onDiscovery: () => { active = false; } });
active = true; assert.equal((await WebAssembly.instantiate(newer.bytes, imports)).instance.exports.sum(2, 3), 5);
assert.equal(lateHandlers, 0, 'Revoking the enabled Profile during discovery does not install a completed stale plan'); restoreLate();

// Generated rules contain opaque structural descriptors rather than source bodies.
for (const p of globalThis.__UnityNativeProfiles) {
  assert(globalThis.__UnityNativeLabels.builds.some(b => b.sha256 === p.template));
  assert(p.nodes.length <= 1024); assert(p.hooks.length > 0 && p.hooks.length <= 32);
  for (const n of p.nodes) assert(/^[0-9a-f]{64}$/.test(n.sha) && !Object.hasOwn(n, 'words') && !Object.hasOwn(n, 'function'));
}
console.log('Automatic update discovery, function/type/import relocation, lifecycle ambiguity, font address validation, digest checks and native fallback passed.');
