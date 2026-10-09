// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
import '../extension/native-discovery.js';
const d = globalThis.__UnityNativeDiscovery;
export async function generateProfile(input, spec) {
  const module = d.analyze(input);
  const scan = await d.scan(module), records = new Map(), reverseCalls = new Map(), reverseConstants = new Map();
  for (let id = module.importedFunctions; id < module.functions.length; id++) {
    const x = d.describe(module, id, true);
    for (const [ordinal, target] of x.calls.entries()) { if (!reverseCalls.has(target)) reverseCalls.set(target, []); reverseCalls.get(target).push({ id, ordinal }); }
    for (const [ordinal, constant] of x.constants.entries()) if (constant.relocated) { if (!reverseConstants.has(constant.value)) reverseConstants.set(constant.value, []); reverseConstants.get(constant.value).push({ id, ordinal }); }
  }
  const described = new Map(), hashed = new Map();
  const describe = id => { if (!described.has(id)) described.set(id, d.describe(module, id, true)); return described.get(id); };
  async function hash(id) {
    if (!hashed.has(id)) hashed.set(id, id < module.importedFunctions ? JSON.stringify(module.imports[id]) : await d.digest(describe(id).words));
    return hashed.get(id);
  }
  async function node(id) {
    if (records.has(id)) return records.get(id).index;
    const x = describe(id), value = { index: records.size, key: x.key, abi: module.abi[id] };
    records.set(id, value); value.sha = await hash(id);
    const candidates = scan.index.get(x.key);
    if (candidates.length > 1) {
      let survivors = candidates.slice(), proofs = [];
      for (let ordinal = 0; ordinal < x.calls.length && survivors.length > 1; ordinal++) {
        const expected = await hash(x.calls[ordinal]), filtered = [];
        for (const c of survivors) if (await hash(describe(c).calls[ordinal]) === expected) filtered.push(c);
        if (filtered.length < survivors.length) { proofs.push({ ordinal, sha: expected }); survivors = filtered; }
      }
      if (proofs.length) value.context = proofs;
      if (survivors.length > 1) {
        const callers = (reverseCalls.get(id) || []).filter(c => scan.index.get(describe(c.id).key).length === 1).sort((a, b) => describe(a.id).words.length - describe(b.id).words.length);
        if (callers.length) { const anchor = callers[0]; value.anchor = { node: await node(anchor.id), ordinal: anchor.ordinal }; }
        else {
          const position = module.table.indexOf(id);
          const nearby = [...new Set(Object.entries(roleFunctions).filter(([role]) => !['storyParse', 'windowShow'].includes(role)).map(([, id]) => id))].filter(other => other !== id && scan.index.get(describe(other).key).length === 1).map(other => ({ id: other, position: module.table.indexOf(other) })).filter(a => position >= 0 && a.position >= 0 && Math.abs(position - a.position) <= 32 && module.table.indexOf(a.id, a.position + 1) < 0).sort((a, b) => Math.abs(position - a.position) - Math.abs(position - b.position));
          if (nearby.length >= 2 && module.table.indexOf(id, position + 1) < 0) value.tableAnchors = await Promise.all(nearby.slice(0, 3).map(async a => ({ node: await node(a.id), offset: position - a.position })));
          else value.ambiguous = survivors.length;
        }
      }
    }
    return value.index;
  }
  const roleFunctions = Object.fromEntries([...spec.hooks.map(h => [h.name, h.function]), ...Object.entries(spec.exports)]);
  const roleNodes = {}, hooks = [], helpers = {}, interfaces = {};
  for (const [role, id] of Object.entries(roleFunctions)) {
    if (['storyParse', 'windowShow'].includes(role)) { interfaces[role] = { abi: module.abi[id] }; continue; }
    const index = await node(id), n = records.get(id);
    if (n.ambiguous) { throw new Error('Required role ambiguous: ' + role); }
    roleNodes[role] = index;
    if (role.startsWith('__uwt_')) helpers[role] = index; else hooks.push({ name: role, node: index });
  }
  for (const [role, value] of Object.entries(interfaces)) {
    const caller = roleFunctions.windowText, ordinal = describe(caller).calls.indexOf(roleFunctions[role]);
    if (ordinal < 0) throw new Error('Missing interface anchor');
    value.anchor = { node: roleNodes.windowText, ordinal }; hooks.push({ name: role, interface: value });
  }
  const relocations = [];
  async function relocate(path, address) {
    const candidates = (reverseConstants.get(address) || []).filter(c => scan.index.get(describe(c.id).key).length === 1).sort((a, b) => describe(a.id).words.length - describe(b.id).words.length);
    if (!candidates.length) throw new Error('No relocation probe: ' + path.join('.'));
    const chosen = candidates.find(c => Object.values(roleFunctions).includes(c.id)) || candidates[0], probe = await node(chosen.id);
    const ordinals = describe(chosen.id).constants.flatMap((c, i) => c.value === address ? [i] : []);
    const span = d.dataSpan(module, address), value = span && new DataView(span.bytes.buffer, span.bytes.byteOffset + span.offset, 4).getUint32(0, true);
    relocations.push({ path, node: probe, ordinals, tag: value >>> 29, odd: value & 1 });
  }
  for (const key of ['byteArrayTypeAddress', 'legacyTypeAddress', 'stringArrayTypeAddress']) if (spec.font[key]) await relocate(['font', key], spec.font[key]);
  if (spec.layout?.novel?.textType) await relocate(['layout', 'novel', 'textType'], spec.layout.novel.textType);
  const runtime = {};
  for (const alias of ['memory', '__indirect_function_table', 'malloc', 'free']) {
    const name = spec.runtimeExports?.[alias] || alias;
    const exported = module.exports.find(e => e.name === name); if (!exported) throw new Error('Runtime export missing');
    runtime[alias] = exported.kind === 0 ? { kind: 0, node: await node(exported.index) } : { kind: exported.kind };
  }
  const edges = [];
  for (const [role, id] of Object.entries(roleFunctions)) if (Object.hasOwn(roleNodes, role)) {
    const calls = describe(id).calls;
    for (const [targetRole, targetId] of Object.entries(roleFunctions)) if (Object.hasOwn(roleNodes, targetRole)) for (const [ordinal, callee] of calls.entries()) if (callee === targetId) edges.push({ from: roleNodes[role], ordinal, to: roleNodes[targetRole] });
  }
  const profile = { template: spec.sha256, nodes: [...records.values()].map(({ index, ...n }) => n), hooks, exports: helpers, runtime, edges, relocations };
  if (profile.nodes.some(n => n.ambiguous)) throw new Error('Profile contains unresolved nodes');
  return profile;
}
