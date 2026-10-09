// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
(function (root) {
  'use strict';
  if (root.__UnityNativeDiscovery) return;
  const maxBytes = 100 * 1024 * 1024;
  const decoder = new TextDecoder();
  function reader(bytes) {
    return {
      bytes, at: 0,
      byte() { if (this.at >= bytes.length) throw new Error('Truncated WASM'); return bytes[this.at++]; },
      uint() { let n = 0; for (let s = 0; s < 35; s += 7) { const b = this.byte(); n += (b & 127) * 2 ** s; if (!(b & 128)) { if (n > 0xffffffff) throw new Error('WASM integer overflow'); return n; } } throw new Error('Invalid WASM integer'); },
      sint() { let n = 0, s = 0, b; do { b = this.byte(); n += (b & 127) * 2 ** s; s += 7; if (s > 35) throw new Error('Invalid WASM signed integer'); } while (b & 128); return b & 64 ? n - 2 ** s : n; },
      take(n) { if (n < 0 || n > bytes.length - this.at) throw new Error('Invalid WASM span'); const value = bytes.subarray(this.at, this.at + n); this.at += n; return value; },
      text() { return decoder.decode(this.take(this.uint())); },
    };
  }
  function limits(r) { const flags = r.uint(), min = r.uint(); if (flags > 1) throw new Error('Unsupported WASM limits'); const max = flags ? r.uint() : null; return { min, max }; }
  function analyze(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length > maxBytes || bytes.length < 8 || [...bytes.subarray(0, 8)].join() !== '0,97,115,109,1,0,0,0') throw new Error('Invalid WASM');
    const r = reader(bytes); r.at = 8; const sections = new Map();
    while (r.at < bytes.length) { const id = r.byte(), body = r.take(r.uint()); if (id && sections.has(id)) throw new Error('Duplicate WASM section'); if (id) sections.set(id, body); }
    if (sections.has(8)) throw new Error('Unsupported WASM start');
    const types = [], functions = [], imports = [], bodies = [], exports = [], data = [];
    let table;
    let memoryBytes = 0, importedFunctions = 0;
    let s = reader(sections.get(1) || Uint8Array.of(0));
    for (let count = s.uint(); count--; ) { if (s.byte() !== 0x60) throw new Error('Unsupported WASM type'); const args = [...s.take(s.uint())], returns = [...s.take(s.uint())]; types.push({ args, returns }); }
    s = reader(sections.get(2) || Uint8Array.of(0));
    for (let count = s.uint(); count--; ) {
      const module = s.text(), name = s.text(), kind = s.byte();
      if (kind === 0) { const type = s.uint(); functions.push(type); imports.push({ module, name, type }); importedFunctions++; }
      else if (kind === 1) { if (s.byte() !== 0x70) throw new Error('Unsupported imported table'); limits(s); }
      else if (kind === 2) memoryBytes = limits(s).min * 65536;
      else if (kind === 3) { s.byte(); s.byte(); }
      else if (kind === 4) { s.byte(); s.uint(); }
      else throw new Error('Unsupported WASM import');
    }
    s = reader(sections.get(3) || Uint8Array.of(0));
    for (let count = s.uint(); count--; ) functions.push(s.uint());
    if (functions.length > 300000 || types.length > 10000) throw new Error('WASM analysis limit');
    s = reader(sections.get(5) || Uint8Array.of(0));
    for (let count = s.uint(); count--; ) memoryBytes = Math.max(memoryBytes, limits(s).min * 65536);
    s = reader(sections.get(7) || Uint8Array.of(0));
    for (let count = s.uint(); count--; ) exports.push({ name: s.text(), kind: s.byte(), index: s.uint() });
    s = reader(sections.get(4) || Uint8Array.of(0));
    if (s.uint() !== 1 || s.byte() !== 0x70) throw new Error('Expected one native function table');
    const tableLimits = limits(s); if (tableLimits.min > 1000000) throw new Error('WASM table analysis limit');
    table = new Int32Array(tableLimits.min).fill(-1);
    s = reader(sections.get(9) || Uint8Array.of(0));
    for (let count = s.uint(); count--; ) {
      const flags = s.uint(); if (![0, 2, 4, 6].includes(flags)) throw new Error('Unsupported WASM element segment');
      if ((flags === 2 || flags === 6) && s.uint() !== 0) throw new Error('Unsupported WASM table index');
      if (s.byte() !== 0x41) throw new Error('Unsupported WASM element offset');
      const offset = s.sint(); if (offset < 0 || s.byte() !== 0x0b) throw new Error('Invalid WASM element offset');
      if (flags === 2 && s.byte() !== 0 || flags === 6 && s.byte() !== 0x70) throw new Error('Unsupported WASM element type');
      const n = s.uint(); if (n > table.length - offset) throw new Error('WASM element span outside table');
      for (let i = 0; i < n; i++) {
        if (flags >= 4 && s.byte() !== 0xd2) throw new Error('Unsupported WASM element expression');
        const id = s.uint(); if (id >= functions.length) throw new Error('Invalid WASM table function');
        if (flags >= 4 && s.byte() !== 0x0b) throw new Error('Invalid WASM element expression');
        table[offset + i] = id;
      }
    }
    s = reader(sections.get(10) || Uint8Array.of(0));
    for (let count = s.uint(); count--; ) bodies.push(s.take(s.uint()));
    if (bodies.length !== functions.length - importedFunctions || s.at !== s.bytes.length) throw new Error('Invalid WASM bodies');
    s = reader(sections.get(11) || Uint8Array.of(0));
    for (let count = s.uint(); count--; ) {
      const flags = s.uint(); if (![0, 1, 2].includes(flags)) throw new Error('Unsupported WASM data');
      let address = null;
      if (flags !== 1) { if (flags === 2 && s.uint() !== 0) throw new Error('Unsupported WASM memory'); if (s.byte() !== 0x41) throw new Error('Unsupported WASM data offset'); address = s.sint(); if (s.byte() !== 0x0b || address < 0) throw new Error('Invalid WASM data offset'); }
      const span = s.take(s.uint()); if (address !== null) data.push({ address, bytes: span });
    }
    data.sort((a, b) => a.address - b.address);
    for (let i = 1; i < data.length; i++) if (data[i - 1].address + data[i - 1].bytes.length > data[i].address) throw new Error('Overlapping WASM data');
    const signatures = types.map(t => [t.args.length, ...t.args, t.returns.length, ...t.returns]);
    const abi = functions.map(type => signatures[type]);
    if (abi.some(t => !t)) throw new Error('Invalid WASM function type');
    return { bytes, functions, types, abi, imports, importedFunctions, bodies, exports, data, memoryBytes, table };
  }
  function dataSpan(module, address) {
    let low = 0, high = module.data.length - 1;
    while (low <= high) {
      const middle = (low + high) >>> 1, segment = module.data[middle];
      if (address < segment.address) high = middle - 1;
      else if (address >= segment.address + segment.bytes.length) low = middle + 1;
      else return { bytes: segment.bytes, offset: address - segment.address };
    }
    return null;
  }
  function pointerLiteral(module, address) {
    const span = dataSpan(module, address); if (!span) return [];
    let length = 0, letters = 0;
    for (; length < 256 && span.offset + length < span.bytes.length; length++) {
      const b = span.bytes[span.offset + length];
      if (!b) {
        const literal = span.bytes.subarray(span.offset, span.offset + length);
        return length >= 6 && letters >= 2 && literal.some((value, index) => value === 58 && literal[index + 1] === 58) ? literal : [];
      }
      if (b < 32 || b > 126) return [];
      if (b >= 65 && b <= 90 || b >= 97 && b <= 122) letters++;
    }
    return [];
  }
  // Keep ABI, control flow, field offsets, small constants and pointer reuse.
  // Function/type numbering and relocated static addresses do not identify a role.
  function describe(module, id, detailed = false) {
    if (id < module.importedFunctions || id >= module.functions.length) throw new Error('Invalid defined function');
    const r = reader(module.bodies[id - module.importedFunctions]);
    let h1 = 2166136261, h2 = 0x9e3779b9, count = 0;
    const words = detailed ? [] : null, calls = detailed ? [] : null, constants = detailed ? [] : null;
    const pointerIds = new Map();
    function put(n) { n >>>= 0; h1 = Math.imul(h1 ^ n, 16777619); h2 = Math.imul(h2 ^ n, 0x85ebca6b); h2 ^= h2 >>> 13; count++; if (words) words.push(n); }
    const signature = type => { const value = module.abi[type]; if (!value) throw new Error('Invalid call target'); for (const n of value) put(n); };
    const typeSignature = type => { const t = module.types[type]; if (!t) throw new Error('Invalid type index'); put(t.args.length); for (const n of t.args) put(n); put(t.returns.length); for (const n of t.returns) put(n); };
    function block() { const type = r.sint(); put(type < 0 ? 0 : 1); if (type < 0) put(type); else typeSignature(type); }
    const memarg = () => { const flags = r.uint(); if (flags > 63) throw new Error('Unsupported memory argument'); put(flags); put(r.uint()); };
    signature(id); const localGroups = r.uint(); put(localGroups);
    for (let i = 0; i < localGroups; i++) { put(r.uint()); put(r.byte()); }
    while (r.at < r.bytes.length) {
      const op = r.byte(); put(op);
      if ([2, 3, 4, 6].includes(op)) block();
      else if ([7, 8, 9, 12, 13, 24, 32, 33, 34, 35, 36, 37, 38, 63, 64, 213, 214].includes(op)) put(r.uint());
      else if (op === 14) { const n = r.uint(); put(n); for (let i = 0; i <= n; i++) put(r.uint()); }
      else if ([16, 18, 210].includes(op)) { const target = r.uint(); signature(target); if (calls) calls.push(target); }
      else if ([17, 19, 20, 21].includes(op)) { typeSignature(r.uint()); if (op === 17 || op === 19) put(r.uint()); }
      else if (op === 28) { const n = r.uint(); put(n); for (let i = 0; i < n; i++) put(r.byte()); }
      else if (op === 31) { block(); const n = r.uint(); put(n); for (let i = 0; i < n; i++) { const kind = r.byte(); put(kind); if (kind < 2) put(r.uint()); if (kind > 3) throw new Error('Unsupported WASM catch'); put(r.uint()); } }
      else if (op >= 40 && op <= 62) memarg();
      else if (op === 65) { const n = r.sint(), relocated = n >= 65536 && n < module.memoryBytes; put(relocated ? 1 : 0); if (relocated && !pointerIds.has(n)) pointerIds.set(n, pointerIds.size); put(relocated ? pointerIds.get(n) : n); if (relocated) { const literal = pointerLiteral(module, n); put(literal.length); for (const b of literal) put(b); } if (constants) constants.push({ value: n, relocated }); }
      else if (op === 66) { let b, n = 0; do { b = r.byte(); put(b); if (++n > 10) throw new Error('Invalid i64 constant'); } while (b & 128); }
      else if (op === 67 || op === 68) { for (const b of r.take(op === 67 ? 4 : 8)) put(b); }
      else if (op === 208) put(r.sint());
      else if (op === 252) {
        const sub = r.uint(); put(sub);
        if (sub <= 7) continue;
        if ([8, 10, 12, 14].includes(sub)) { put(r.uint()); put(r.uint()); }
        else if ([9, 11, 13, 15, 16, 17].includes(sub)) put(r.uint());
        else throw new Error('Unsupported WASM bulk instruction');
      } else if (op === 253) {
        const sub = r.uint(); put(sub);
        if (sub <= 11 || sub === 92 || sub === 93) memarg();
        else if (sub === 12 || sub === 13) { for (const b of r.take(16)) put(b); }
        else if (sub >= 21 && sub <= 34) put(r.byte());
        else if (sub >= 84 && sub <= 91) { memarg(); put(r.byte()); }
        else if (sub > 255) throw new Error('Unsupported WASM SIMD instruction');
      } else if (op === 254) {
        const sub = r.uint(); put(sub);
        if (sub === 3) { if (r.byte() !== 0) throw new Error('Invalid atomic fence'); put(0); }
        else if (sub <= 2 || sub >= 16 && sub <= 78) memarg();
        else throw new Error('Unsupported WASM atomic instruction');
      } else if (![0, 1, 5, 10, 11, 15, 25, 26, 27, 209, 211, 212].includes(op) && !(op >= 69 && op <= 196)) throw new Error('Unsupported WASM instruction');
    }
    return { key: (h1 >>> 0).toString(16) + '-' + (h2 >>> 0).toString(16) + '-' + count, calls, constants, words };
  }
  async function digest(words) {
    const buffer = new ArrayBuffer(words.length * 4), view = new DataView(buffer);
    for (let i = 0; i < words.length; i++) view.setUint32(i * 4, words[i], true);
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))].map(n => n.toString(16).padStart(2, '0')).join('');
  }
  async function scan(module, selected) {
    const index = new Map(); let skipped = 0;
    for (let id = module.importedFunctions; id < module.functions.length; id++) {
      try { const { key } = describe(module, id); if (!selected || selected.has(key)) { let list = index.get(key); if (!list) index.set(key, list = []); list.push(id); } } catch { skipped++; }
      if (id % 4096 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    return { index, skipped };
  }
  // Fast keys only select candidates; SHA-256 and graph constraints authorize them.
  async function resolve(input, profiles, templates, report) {
    if (!Array.isArray(profiles) || !profiles.length || profiles.length > 16) return null;
    if (profiles.some(p => !Array.isArray(p.nodes) || p.nodes.length > 1024 || !Array.isArray(p.edges) || p.edges.length > 10000)) return null;
    const started = performance.now(), module = analyze(input);
    const keys = new Set(profiles.flatMap(p => p.nodes.filter(Boolean).map(n => n.key)));
    const { index, skipped } = await scan(module, keys);
    const descriptions = new Map(), hashes = new Map();
    function detail(id) { if (!descriptions.has(id)) descriptions.set(id, describe(module, id, true)); return descriptions.get(id); }
    async function hash(id) {
      if (id === undefined || id < 0 || id >= module.functions.length) return null;
      if (!hashes.has(id)) hashes.set(id, id < module.importedFunctions ? JSON.stringify(module.imports[id]) : await digest(detail(id).words));
      return hashes.get(id);
    }
    function positions(id) {
      const values = []; for (let at = module.table.indexOf(id); at >= 0; at = module.table.indexOf(id, at + 1)) values.push(at);
      return values;
    }
    for (const profile of profiles) {
      const template = templates.find(t => t.sha256 === profile.template); if (!template) continue;
      const candidates = [];
      for (const node of profile.nodes) {
        const list = [];
        if (node && (index.get(node.key)?.length || 0) <= 2048) for (const id of index.get(node.key) || []) {
          if (await hash(id) !== node.sha) continue;
          let valid = true;
          for (const proof of node.context || []) if (await hash(detail(id).calls[proof.ordinal]) !== proof.sha) { valid = false; break; }
          if (valid) list.push(id);
        }
        candidates.push(list);
      }
      if (candidates.some((list, i) => profile.nodes[i] && !list.length)) continue;
      let changed = true;
      for (let pass = 0; changed && pass < profile.nodes.length; pass++) {
        changed = false;
        const retain = (i, condition) => { const filtered = candidates[i].filter(condition); if (filtered.length !== candidates[i].length) { candidates[i] = filtered; changed = true; } };
        for (const [i, node] of profile.nodes.entries()) {
          if (!node) continue;
          if (node.anchor) {
            const targets = new Set(candidates[node.anchor.node].map(id => detail(id).calls[node.anchor.ordinal]));
            retain(i, id => targets.has(id));
          }
          if (node.tableAnchors) {
            let slots;
            for (const anchor of node.tableAnchors) {
              const possible = new Set(candidates[anchor.node].flatMap(id => positions(id).map(at => at + anchor.offset)));
              slots = slots ? new Set([...slots].filter(at => possible.has(at))) : possible;
            }
            retain(i, id => [...slots].some(at => module.table[at] === id));
          }
        }
        for (const edge of profile.edges) {
          const targets = new Set(candidates[edge.to]);
          retain(edge.from, id => targets.has(detail(id).calls[edge.ordinal]));
          const called = new Set(candidates[edge.from].map(id => detail(id).calls[edge.ordinal]));
          retain(edge.to, id => called.has(id));
        }
      }
      if (candidates.some((list, i) => profile.nodes[i] && list.length !== 1)) continue;
      const ids = candidates.map(list => list[0]), hooks = [], helperExports = {}, runtimeExports = {};
      let valid = true;
      for (const hook of profile.hooks) {
        let id = ids[hook.node];
        if (hook.interface) {
          const anchor = hook.interface.anchor; id = detail(ids[anchor.node]).calls[anchor.ordinal];
          if (!module.abi[id] || module.abi[id].join() !== hook.interface.abi.join()) { valid = false; break; }
        }
        if (id < module.importedFunctions || hooks.some(h => h.function === id)) { valid = false; break; }
        hooks.push({ name: hook.name, function: id });
      }
      for (const [name, node] of Object.entries(profile.exports)) helperExports[name] = ids[node];
      for (const [alias, entry] of Object.entries(profile.runtime)) {
        const choices = module.exports.filter(e => e.kind === entry.kind && (entry.kind !== 0 || e.index === ids[entry.node]));
        if (choices.length !== 1) { valid = false; break; }
        const existing = module.exports.find(e => e.name === alias);
        if (existing && (existing.kind !== choices[0].kind || existing.index !== choices[0].index)) { valid = false; break; }
        if (choices[0].name !== alias) runtimeExports[alias] = choices[0].name;
      }
      const font = structuredClone(template.font || {}), layout = structuredClone(template.layout || {});
      const plan = { importedFunctions: module.importedFunctions, hooks, exports: helperExports, runtimeExports, font, layout };
      for (const relocation of profile.relocations) {
        const constants = detail(ids[relocation.node]).constants;
        const values = relocation.ordinals.map(ordinal => constants[ordinal]).filter(Boolean);
        const address = values[0]?.value;
        if (values.length !== relocation.ordinals.length || !values.every(c => c.relocated && c.value === address) || address % 4) { valid = false; break; }
        const span = dataSpan(module, address);
        if (!span || span.offset + 4 > span.bytes.length || address + 4 > module.memoryBytes) { valid = false; break; }
        const tag = new DataView(span.bytes.buffer, span.bytes.byteOffset + span.offset, 4).getUint32(0, true);
        if (tag >>> 29 !== relocation.tag || (tag & 1) !== relocation.odd) { valid = false; break; }
        let target = plan;
        for (const part of relocation.path.slice(0, -1)) target = target[part];
        target[relocation.path.at(-1)] = address;
      }
      if (!valid) continue;
      const ms = Math.round(performance.now() - started);
      report?.({ mode: 'structural', hooks: hooks.length, helpers: Object.keys(helperExports).length, ms, skipped });
      return plan;
    }
    return null;
  }
  root.__UnityNativeDiscovery = Object.freeze({ analyze, describe, digest, scan, dataSpan, resolve });
})(globalThis);
