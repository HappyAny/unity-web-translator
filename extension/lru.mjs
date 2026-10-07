// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
export const CACHE_MISS = Symbol('cache-miss');
export class LruCache {
  constructor({ maxEntries = 2000, maxBytes = 4 * 1024 * 1024 } = {}) { this.maxEntries = maxEntries; this.maxBytes = maxBytes; this.entries = new Map(); this.bytes = 0; }
  get(key) {
    const entry = this.entries.get(key); if (!entry) return CACHE_MISS;
    this.entries.delete(key); this.entries.set(key, entry); return entry.value;
  }
  set(key, value) {
    this.delete(key);
    const size = 64 + key.length * 2 + (typeof value === 'string' ? value.length * 2 : value == null ? 0 : JSON.stringify(value).length * 2);
    if (size > this.maxBytes) return;
    this.entries.set(key, { value, size }); this.bytes += size;
    while (this.entries.size > this.maxEntries || this.bytes > this.maxBytes) this.delete(this.entries.keys().next().value);
  }
  delete(key) { const entry = this.entries.get(key); if (entry) { this.bytes -= entry.size; this.entries.delete(key); } }
  clearPrefix(prefix) { for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.delete(key); }
}
