// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
(function (root) {
  'use strict';
  if (root.__UnityWasmTools) return;
  const maxBytes = 100 * 1024 * 1024;
  const encoder = new TextEncoder();
  function unsigned(value) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Invalid WASM integer');
    const bytes = [];
    do { const next = value % 128; value = Math.floor(value / 128); bytes.push(next | (value ? 128 : 0)); } while (value);
    return Uint8Array.from(bytes);
  }
  function signed(value) {
    const bytes = [];
    do { const next = value & 127; value >>= 7; const done = (value === 0 && !(next & 64)) || (value === -1 && (next & 64)); bytes.push(next | (done ? 0 : 128)); if (done) break; } while (true);
    return Uint8Array.from(bytes);
  }
  function concat(parts) {
    const size = parts.reduce((sum, part) => sum + part.length, 0);
    if (size > maxBytes) throw new Error('WASM size limit');
    const result = new Uint8Array(size); let offset = 0;
    for (const part of parts) { result.set(part, offset); offset += part.length; }
    return result;
  }
  function cursor(bytes, offset = 0) {
    return {
      offset,
      byte() { if (this.offset >= bytes.length) throw new Error('Truncated WASM'); return bytes[this.offset++]; },
      uint() { let value = 0; for (let shift = 0; shift < 35; shift += 7) { const byte = this.byte(); value += (byte & 127) * 2 ** shift; if (!(byte & 128)) { if (value > 0xffffffff) throw new Error('WASM integer overflow'); return value; } } throw new Error('Invalid WASM integer'); },
      take(length) { if (length < 0 || length > bytes.length - this.offset) throw new Error('Truncated WASM span'); const result = bytes.subarray(this.offset, this.offset + length); this.offset += length; return result; },
    };
  }
  const vector = items => concat([unsigned(items.length), ...items]);
  const name = value => { const bytes = encoder.encode(value); return concat([unsigned(bytes.length), bytes]); };
  const section = (id, body) => concat([Uint8Array.of(id), unsigned(body.length), body]);
  function rewrite(input, spec) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length > maxBytes || bytes.length < 8 || [...bytes.subarray(0, 8)].join(',') !== '0,97,115,109,1,0,0,0') throw new Error('Invalid WASM module');
    if (!spec?.hooks?.length || spec.hooks.length > 32) throw new Error('Invalid hook plan');
    const reader = cursor(bytes, 8), sections = [], byId = new Map();
    while (reader.offset < bytes.length) {
      const id = reader.byte(), length = reader.uint(), body = reader.take(length);
      if (id && byId.has(id)) throw new Error('Duplicate WASM section');
      const entry = { id, body }; sections.push(entry); if (id) byId.set(id, entry);
    }
    if (byId.has(8)) throw new Error('WASM start functions are not supported');
    for (const id of [1, 3, 4, 7, 10]) if (!byId.has(id)) throw new Error('Missing WASM section');
    const tr = cursor(byId.get(1).body), types = [];
    for (let count = tr.uint(); count > 0; count--) {
      if (tr.byte() !== 0x60) throw new Error('Unsupported WASM type');
      types.push({ args: [...tr.take(tr.uint())], returns: [...tr.take(tr.uint())] });
    }
    const fr = cursor(byId.get(3).body), functions = [];
    for (let count = fr.uint(); count > 0; count--) functions.push(fr.uint());
    const cr = cursor(byId.get(10).body), bodies = [];
    for (let count = cr.uint(); count > 0; count--) bodies.push(cr.take(cr.uint()));
    if (bodies.length !== functions.length || cr.offset !== byId.get(10).body.length) throw new Error('Invalid WASM code vector');
    const tableReader = cursor(byId.get(4).body);
    if (tableReader.uint() !== 1 || tableReader.byte() !== 0x70) throw new Error('Expected one function table');
    const flags = tableReader.uint(), minimum = tableReader.uint(), maximum = flags & 1 ? tableReader.uint() : null;
    if (flags > 1 || tableReader.offset !== byId.get(4).body.length || minimum > 1000000) throw new Error('Unsupported WASM table');
    const exportReader = cursor(byId.get(7).body), exports = [], names = new Set(), exportMap = new Map();
    for (let count = exportReader.uint(); count > 0; count--) {
      const start = exportReader.offset, text = new TextDecoder().decode(exportReader.take(exportReader.uint()));
      const kind = exportReader.byte(), index = exportReader.uint();
      if (names.has(text)) throw new Error('Duplicate WASM export');
      names.add(text); exportMap.set(text, { kind, index }); exports.push(byId.get(7).body.subarray(start, exportReader.offset));
    }
    const addExport = (alias, index, kind = 0) => { if (names.has(alias)) throw new Error('Duplicate helper export'); names.add(alias); exports.push(concat([name(alias), Uint8Array.of(kind), unsigned(index)])); };
    const runtimeKinds = { memory: 2, __indirect_function_table: 1, malloc: 0, free: 0 };
    for (const [alias, source] of Object.entries(spec.runtimeExports || {})) {
      const entry = exportMap.get(source);
      if (!Object.hasOwn(runtimeKinds, alias) || !entry || entry.kind !== runtimeKinds[alias]) throw new Error('Invalid WASM runtime export');
      addExport(alias, entry.index, entry.kind);
    }
    const originals = [], hooks = [], seen = new Set(), imported = spec.importedFunctions;
    if (!Number.isInteger(imported) || imported < 0 || imported > 10000) throw new Error('Invalid WASM imports');
    for (const [index, hook] of spec.hooks.entries()) {
      const defined = hook.function - imported;
      if (defined < 0 || defined >= bodies.length || seen.has(defined)) throw new Error('Invalid WASM hook index');
      seen.add(defined);
      const type = functions[defined], signature = types[type];
      if (!signature || signature.args.some(arg => ![0x7f, 0x7d, 0x7c].includes(arg)) || signature.returns.some(ret => ret !== 0x7f) || signature.returns.length > 1) throw new Error('Unsupported hook signature');
      const original = bodies[defined], slot = minimum + index, alias = '__uwt_original_' + hook.name;
      originals.push({ body: original, type }); addExport(alias, imported + functions.length + index);
      const instructions = [Uint8Array.of(0)];
      for (let arg = 0; arg < signature.args.length; arg++) instructions.push(Uint8Array.of(0x20), unsigned(arg));
      instructions.push(Uint8Array.of(0x41), signed(slot), Uint8Array.of(0x11), unsigned(type), Uint8Array.of(0, 0x0b));
      bodies[defined] = concat(instructions);
      hooks.push({ ...hook, alias, slot, signature });
    }
    for (const [alias, index] of Object.entries(spec.exports || {})) {
      if (!Number.isInteger(index) || index < imported || index >= imported + functions.length) throw new Error('Invalid WASM helper index');
      addExport(alias, index);
    }
    byId.get(3).body = vector([...functions.map(unsigned), ...originals.map(item => unsigned(item.type))]);
    byId.get(4).body = concat([Uint8Array.of(1, 0x70), unsigned(flags), unsigned(minimum + hooks.length), ...(maximum === null ? [] : [unsigned(maximum + hooks.length)])]);
    byId.get(7).body = vector(exports);
    byId.get(10).body = vector([...bodies, ...originals.map(item => item.body)].map(body => concat([unsigned(body.length), body])));
    return { bytes: concat([bytes.subarray(0, 8), ...sections.map(entry => section(entry.id, entry.body))]), hooks };
  }
  function trampoline(signature) {
    const type = concat([Uint8Array.of(0x60), unsigned(signature.args.length), Uint8Array.from(signature.args), unsigned(signature.returns.length), Uint8Array.from(signature.returns)]);
    return concat([Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0), section(1, vector([type])),
      section(2, vector([concat([name('bridge'), name('call'), Uint8Array.of(0, 0)])])),
      section(7, vector([concat([name('call'), Uint8Array.of(0, 0)])]))]);
  }
  function install(options) {
    const nativeInstantiate = WebAssembly.instantiate, nativeStreaming = WebAssembly.instantiateStreaming;
    let disposed = false;
    async function instantiate(input, imports) {
      if (disposed || input instanceof WebAssembly.Module) return nativeInstantiate.call(WebAssembly, input, imports);
      const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      if (bytes.length < 1024 || bytes.length > maxBytes) return nativeInstantiate.call(WebAssembly, input, imports);
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
      const spec = options.builds.find(build => build.sha256 === hash);
      if (!spec || !options.enabled()) return nativeInstantiate.call(WebAssembly, input, imports);
      try {
        const patched = rewrite(bytes, spec), result = await nativeInstantiate.call(WebAssembly, patched.bytes, imports);
        const handlers = options.createHandlers(result.instance.exports, spec);
        const table = result.instance.exports.__indirect_function_table;
        if (!(table instanceof WebAssembly.Table)) throw new Error('Native function table unavailable');
        for (const hook of patched.hooks) {
          const original = result.instance.exports[hook.alias], handle = handlers[hook.name];
          if (typeof original !== 'function' || typeof handle !== 'function') throw new Error('Native hook unavailable');
          const thunk = await nativeInstantiate.call(WebAssembly, trampoline(hook.signature), { bridge: { call: (...args) => handle(original, ...args) } });
          table.set(hook.slot, thunk.instance.exports.call);
        }
        options.onStatus?.('ready'); return result;
      } catch (error) {
        options.onStatus?.('failed');
        return nativeInstantiate.call(WebAssembly, input, imports);
      }
    }
    async function streaming(source, imports) {
      const response = await source;
      if (disposed || !/application\/wasm/i.test(response.headers.get('Content-Type') || '') || Number(response.headers.get('Content-Length') || 0) > maxBytes) return nativeStreaming.call(WebAssembly, response, imports);
      return instantiate(await response.arrayBuffer(), imports);
    }
    WebAssembly.instantiate = instantiate;
    if (typeof nativeStreaming === 'function') WebAssembly.instantiateStreaming = streaming;
    return () => { disposed = true; if (WebAssembly.instantiate === instantiate) WebAssembly.instantiate = nativeInstantiate; if (WebAssembly.instantiateStreaming === streaming) WebAssembly.instantiateStreaming = nativeStreaming; };
  }
  root.__UnityWasmTools = Object.freeze({ rewrite, trampoline, install, maxBytes });
})(globalThis);
