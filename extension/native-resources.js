// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
// Shared, bounded JSON adapter. Runs in MAIN world and as a side-effect module.
(function (root) {
  'use strict';
  if (root.__UnityTextResources) return;
  const limits = Object.freeze({ bytes: 1024 * 1024, texts: 32, nodes: 10000, depth: 64, rules: 20 });
  const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
  const fail = message => { throw new Error(message); };
  function pathTokens(path) {
    if (typeof path !== 'string' || !path || path.length > 200) fail('Invalid text field path');
    const parts = path.match(/[A-Za-z_][A-Za-z0-9_-]*|\[(?:\*|\d+)\]/g) || [];
    let rebuilt = '';
    for (const part of parts) {
      if (part.startsWith('[')) rebuilt += part;
      else { if (forbidden.has(part)) fail('Forbidden text field path'); rebuilt += (rebuilt ? '.' : '') + part; }
    }
    if (rebuilt !== path || parts.length > 12 || parts.some(part => /^\[\d+\]$/.test(part) && Number(part.slice(1, -1)) > 10000)) fail('Invalid text field path');
    return parts.map(part => part === '[*]' ? '*' : part.startsWith('[') ? Number(part.slice(1, -1)) : part);
  }
  function validateRules(value) {
    if (!Array.isArray(value) || value.length > limits.rules || JSON.stringify(value).length > 16000) fail('Resource rules must be a JSON array (up to 20 rules)');
    return value.map(rule => {
      if (!rule || typeof rule !== 'object' || Array.isArray(rule) || Object.keys(rule).some(key => !['url', 'fields'].includes(key))) fail('Invalid resource rule');
      if (typeof rule.url !== 'string' || rule.url.length > 400 || /[\s\\?#]/.test(rule.url)) fail('Resource URL must exclude credentials, queries and fragments');
      let path = rule.url;
      if (!path.startsWith('/') || path.startsWith('//')) {
        let url; try { url = new URL(path); } catch { fail('Resource URL must be a path or an absolute HTTP(S) URL'); }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hostname.includes('*')) fail('Invalid resource URL');
        path = url.pathname;
      }
      if (!path.startsWith('/') || path.replace(/\*/g, '').length < 4 || /(?:^|\/)\.\.(?:\/|$)/.test(rule.url)) fail('Use a specific text resource path');
      if (!Array.isArray(rule.fields) || !rule.fields.length || rule.fields.length > 10) fail('Resource rules need 1 to 10 text fields');
      const seen = new Set();
      const fields = rule.fields.map(field => {
        if (!field || typeof field !== 'object' || Array.isArray(field) || Object.keys(field).some(key => !['path', 'kind', 'speaker'].includes(key))) fail('Invalid resource text field');
        pathTokens(field.path);
        if (seen.has(field.path)) fail('Duplicate text field path'); seen.add(field.path);
        const kind = field.kind || 'story';
        if (!['story', 'name', 'ui'].includes(kind)) fail('Text field kind must be story, name or ui');
        if (field.speaker !== undefined && (typeof field.speaker !== 'string' || !/^[A-Za-z_][A-Za-z0-9_-]{0,79}$/.test(field.speaker) || forbidden.has(field.speaker))) fail('Speaker must be a sibling string field');
        return { path: field.path, kind, ...(field.speaker ? { speaker: field.speaker } : {}) };
      });
      return { url: rule.url, fields };
    });
  }
  function matches(pattern, value, base) {
    try {
      const url = new URL(value, base), rule = new URL(pattern, base);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== rule.origin) return false;
      const escaped = rule.pathname.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
      return new RegExp('^' + escaped + '$').test(url.pathname);
    } catch { return false; }
  }
  // Keep every non-text byte, including large numeric IDs and duplicate keys.
  // Only the selected string token spans are replaced; JSON is never reserialized.
  function parseSpans(raw) {
    if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > limits.bytes) fail('Text resource exceeds 1 MiB');
    const offset = raw.charCodeAt(0) === 0xfeff ? 1 : 0;
    JSON.parse(raw.slice(offset));
    let index = offset, nodes = 0;
    const space = () => { while (/[\x20\t\r\n]/.test(raw[index] || '\0')) index++; };
    function string() {
      const start = index++;
      while (index < raw.length) { const char = raw[index++]; if (char === '\\') index++; else if (char === '"') break; }
      return { type: 'string', start, end: index, text: JSON.parse(raw.slice(start, index)) };
    }
    function node(depth) {
      if (++nodes > limits.nodes || depth > limits.depth) fail('Text resource structure exceeds adapter limits');
      space(); const start = index, char = raw[index];
      if (char === '"') return string();
      if (char === '{') {
        index++; const children = new Map(); space();
        if (raw[index] !== '}') do { space(); const key = string().text; space(); index++; children.set(key, node(depth + 1)); space(); if (raw[index] !== ',') break; index++; } while (true);
        index++; return { type: 'object', start, end: index, children };
      }
      if (char === '[') {
        index++; const children = []; space();
        if (raw[index] !== ']') do { children.push(node(depth + 1)); space(); if (raw[index] !== ',') break; index++; } while (true);
        index++; return { type: 'array', start, end: index, children };
      }
      while (index < raw.length && !/[\s,}\]]/.test(raw[index])) index++;
      return { type: 'scalar', start, end: index };
    }
    return node(0);
  }
  function selectStrings(tree, fields) {
    const found = new Map(); let visits = 0;
    function visit(node, tokens, position, parent, field) {
      if (++visits > limits.nodes * 12) fail('Text field traversal exceeds adapter limits');
      if (position === tokens.length) {
        if (node.type !== 'string' || !node.text.trim() || node.text.length > 2000) return;
        const speakerNode = field.speaker && parent?.type === 'object' ? parent.children.get(field.speaker) : null;
        if (!found.has(node.start)) found.set(node.start, { node, text: node.text, kind: field.kind, speaker: speakerNode?.type === 'string' ? speakerNode.text.slice(0, 150) : '' });
        if (found.size > limits.texts) fail('Text resource exceeds 32 selected strings; narrow the rule');
        return;
      }
      const token = tokens[position];
      if (token === '*' && node.type === 'array') for (const child of node.children) visit(child, tokens, position + 1, node, field);
      else {
        const child = typeof token === 'number' && node.type === 'array' ? node.children[token] : typeof token === 'string' && node.type === 'object' ? node.children.get(token) : null;
        if (child) visit(child, tokens, position + 1, node, field);
      }
    }
    for (const field of fields) visit(tree, pathTokens(field.path), 0, null, field);
    return [...found.values()].sort((a, b) => a.node.start - b.node.start);
  }
  async function translateJson(raw, fields, translate) {
    const selected = selectStrings(parseSpans(raw), fields);
    if (!selected.length) return { text: raw, selected: 0, changed: 0 };
    const batches = [];
    for (let index = 0; index < selected.length; index += 8) batches.push(selected.slice(index, index + 8));
    const results = (await Promise.all(batches.map(batch => translate(batch.map(({ node, text, kind, speaker }) => ({ id: String(node.start), text, kind, speaker, native: true })))))).flatMap(result => result?.items || []);
    const byId = new Map(results.map(item => [item.id, item])); let text = raw, changed = 0;
    for (const { node, text: original } of selected.reverse()) {
      const item = byId.get(String(node.start));
      if (!item || item.error || typeof item.text !== 'string' || !item.text.trim() || item.text === original || item.text.length > original.length * 5 + 200) continue;
      text = text.slice(0, node.start) + JSON.stringify(item.text) + text.slice(node.end); changed++;
    }
    return { text, selected: selected.length, changed };
  }
  root.__UnityTextResources = Object.freeze({ limits, pathTokens, validateRules, matches, parseSpans, selectStrings, translateJson });
})(globalThis);
