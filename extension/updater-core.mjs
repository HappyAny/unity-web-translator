// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
const updateDecoder = new TextDecoder('utf-8', { fatal: true });
const MAX_PACKAGE_BYTES = 10 * 1024 * 1024;
const MAX_ENTRY_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const publicPath = /^(?:[a-z][a-z0-9-]*\.(?:mjs|js|html|css)|manifest\.json|README\.md|_locales\/(?:en|zh_CN)\/messages\.json|icons\/(?:16|32|48|128)\.png)$/;
export function compareVersions(left, right) {
  const parse = value => {
    if (typeof value !== 'string' || !/^\d+(?:\.\d+){0,3}$/.test(value)) throw new Error('更新包版本不合法');
    const parts = value.split('.').map(Number);
    if (parts.some(part => part > 65535)) throw new Error('更新包版本不合法');
    return Array.from({ length: 4 }, (_, index) => parts[index] || 0);
  };
  const a = parse(left), b = parse(right);
  for (let index = 0; index < 4; index++) if (a[index] !== b[index]) return Math.sign(a[index] - b[index]);
  return 0;
}
function updateCrc(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
async function inflateEntry(bytes, size) {
  let decompressor;
  try { decompressor = new DecompressionStream('deflate-raw'); } catch { throw new Error('请更新 Edge / Chrome 后再使用拖放更新'); }
  const reader = new Blob([bytes]).stream().pipeThrough(decompressor).getReader(), chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > size || total > MAX_ENTRY_BYTES) throw new Error('更新包解压大小不合法');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  if (total !== size) throw new Error('更新包解压大小不合法');
  const result = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}
export async function readRelease(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength < 22 || bytes.byteLength > MAX_PACKAGE_BYTES) throw new Error('请选择不超过 10 MB 的插件 Release ZIP');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), files = new Map(), entries = [];
  const bound = (start, length) => { if (start < 0 || length < 0 || start + length > bytes.byteLength) throw new Error('更新包 ZIP 不完整'); };
  const u16 = index => { bound(index, 2); return view.getUint16(index, true); };
  const u32 = index => { bound(index, 4); return view.getUint32(index, true); };
  let position = 0, total = 0;
  while (u32(position) === 0x04034b50) {
    bound(position, 30);
    const flags = u16(position + 6), method = u16(position + 8), crc = u32(position + 14), compressedSize = u32(position + 18), size = u32(position + 22);
    const length = u16(position + 26), extra = u16(position + 28), start = position + 30 + length + extra;
    bound(position + 30, length); bound(start, compressedSize);
    const name = updateDecoder.decode(bytes.subarray(position + 30, position + 30 + length));
    if (files.has(name) || !/^[A-Za-z0-9_./-]+$/.test(name) || name.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('更新包包含重复或越界路径');
    if (entries.length >= 128 || (flags & ~0x800) || ![0, 8].includes(method) || size > MAX_ENTRY_BYTES || (total += size) > MAX_TOTAL_BYTES) throw new Error('更新包 ZIP 格式不受支持');
    const data = method === 8 ? await inflateEntry(bytes.subarray(start, start + compressedSize), size) : bytes.slice(start, start + compressedSize);
    if (data.byteLength !== size || updateCrc(data) !== crc) throw new Error('更新包文件校验失败');
    files.set(name, data); entries.push({ name, flags, method, crc, compressedSize, size, offset: position }); position = start + compressedSize;
  }
  const directoryOffset = position;
  for (const entry of entries) {
    bound(position, 46);
    if (u32(position) !== 0x02014b50 || u16(position + 8) !== entry.flags || u16(position + 10) !== entry.method || u32(position + 16) !== entry.crc || u32(position + 20) !== entry.compressedSize || u32(position + 24) !== entry.size || u32(position + 42) !== entry.offset) throw new Error('更新包目录校验失败');
    const length = u16(position + 28), extra = u16(position + 30), comment = u16(position + 32);
    bound(position + 46, length + extra + comment);
    if (updateDecoder.decode(bytes.subarray(position + 46, position + 46 + length)) !== entry.name) throw new Error('更新包目录校验失败');
    position += 46 + length + extra + comment;
  }
  if (!entries.length || u32(position) !== 0x06054b50 || u16(position + 4) || u16(position + 6) || u16(position + 8) !== entries.length || u16(position + 10) !== entries.length || u32(position + 12) !== position - directoryOffset || u32(position + 16) !== directoryOffset || position + 22 + u16(position + 20) !== bytes.byteLength) throw new Error('更新包目录校验失败');
  const json = name => { try { return JSON.parse(updateDecoder.decode(files.get(name))); } catch { throw new Error('更新包缺少有效的文件清单或 manifest'); } };
  const metadata = json('update-files.json'), manifest = json('extension/manifest.json');
  if (metadata?.product !== 'unity-web-translator' || !Array.isArray(metadata.files) || metadata.files.length < 17 || metadata.files.length > 64 || metadata.version !== manifest.version || manifest.manifest_version !== 3 || manifest.background?.service_worker !== 'background.mjs' || manifest.options_ui?.page !== 'options.html') throw new Error('请选择 Unity Web翻译机的完整 Release ZIP');
  compareVersions(metadata.version, '0');
  const listed = new Set();
  for (const row of metadata.files) {
    if (!row || typeof row.path !== 'string' || !publicPath.test(row.path) || listed.has(row.path) || !/^[0-9a-f]{64}$/.test(row.sha256)) throw new Error('更新包文件清单不合法');
    const data = files.get('extension/' + row.path);
    if (!data || row.bytes !== data.byteLength) throw new Error('更新包文件校验失败');
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data)), byte => byte.toString(16).padStart(2, '0')).join('');
    if (hash !== row.sha256) throw new Error('更新包文件校验失败');
    listed.add(row.path);
  }
  if (!['manifest.json', 'background.mjs', 'engine.mjs', 'core.mjs', 'options.html'].every(path => listed.has(path))) throw new Error('更新包缺少必要的扩展文件');
  if ([...files.keys()].some(path => path.startsWith('extension/') && !listed.has(path.slice(10)))) throw new Error('更新包包含未声明的扩展文件');
  return { version: metadata.version, manifest, entries: metadata.files.map(row => ({ path: row.path, bytes: files.get('extension/' + row.path) })) };
}
async function fileAt(directory, path, create = false) {
  const parts = path.split('/'); let handle = directory;
  for (const part of parts.slice(0, -1)) handle = await handle.getDirectoryHandle(part, { create });
  return handle.getFileHandle(parts.at(-1), { create });
}
async function readFileAt(directory, path) { return new Uint8Array(await (await (await fileAt(directory, path)).getFile()).arrayBuffer()); }
async function optionalFileAt(directory, path) { try { return await readFileAt(directory, path); } catch (error) { if (error.name === 'NotFoundError') return null; throw error; } }
async function writeFileAt(directory, path, bytes) {
  const stream = await (await fileAt(directory, path, true)).createWritable();
  try { await stream.write(bytes); await stream.close(); } catch (error) { await stream.abort().catch(() => {}); throw error; }
}
export async function inspectDirectory(directory, installedVersion) {
  let manifest;
  try { manifest = JSON.parse(updateDecoder.decode(await readFileAt(directory, 'manifest.json'))); } catch { throw new Error('请选择原来已经加载的 extension 目录'); }
  if (manifest.background?.service_worker !== 'background.mjs' || manifest.options_ui?.page !== 'options.html' || !await optionalFileAt(directory, 'engine.mjs') || !await optionalFileAt(directory, 'core.mjs')) throw new Error('所选目录不是 Unity Web翻译机');
  compareVersions(manifest.version, '0');
  if (installedVersion && compareVersions(manifest.version, installedVersion) !== 0) throw new Error('目录版本与当前扩展不一致，请选择原安装目录或先重新加载扩展');
  return manifest;
}
export async function applyRelease(directory, release, { installedVersion, onProgress = () => {}, now = Date.now } = {}) {
  if (!release?.entries?.length || release.entries.some(entry => !publicPath.test(entry.path) || !(entry.bytes instanceof Uint8Array)) || new Set(release.entries.map(entry => entry.path)).size !== release.entries.length) throw new Error('更新包文件清单不合法');
  const previousManifest = await inspectDirectory(directory, installedVersion);
  if (compareVersions(release.version, previousManifest.version) <= 0) throw new Error('请选择比当前安装版本更新的 ZIP');
  const snapshots = new Map();
  for (const entry of release.entries) snapshots.set(entry.path, await optionalFileAt(directory, entry.path));
  const stamp = now() + '-' + crypto.randomUUID(), backupName = '.unity-update-backups/' + stamp, backup = await directory.getDirectoryHandle('.unity-update-backups', { create: true });
  const versionBackup = await backup.getDirectoryHandle(stamp, { create: true });
  for (const [path, bytes] of snapshots) if (bytes) await writeFileAt(versionBackup, path, bytes);
  const manifest = { ...release.manifest };
  // Preserve the existing extension identity, including older path-based installs.
  if (previousManifest.key) manifest.key = previousManifest.key; else delete manifest.key;
  const nextManifest = new TextEncoder().encode(JSON.stringify(manifest, null, 2) + '\n');
  const entries = [...release.entries.filter(entry => entry.path !== 'manifest.json'), { path: 'manifest.json', bytes: nextManifest }], written = [];
  try {
    for (const entry of entries) { written.push(entry.path); await writeFileAt(directory, entry.path, entry.bytes); onProgress(written.length, entries.length); }
  } catch (error) {
    let rollbackFailed = false;
    for (const path of written.reverse()) {
      try {
        const original = snapshots.get(path);
        if (original) await writeFileAt(directory, path, original);
        else { const parts = path.split('/'); let parent = directory; for (const part of parts.slice(0, -1)) parent = await parent.getDirectoryHandle(part); await parent.removeEntry(parts.at(-1)); }
      } catch { rollbackFailed = true; }
    }
    const result = new Error(rollbackFailed ? '更新失败且部分文件未能还原，请从备份目录恢复后重新加载' : '更新失败，原文件已还原');
    result.backupName = backupName; result.cause = error; throw result;
  }
  return { version: release.version, backupName };
}
export async function updaterDirectoryStore(factory = globalThis.indexedDB) {
  const database = await new Promise((resolve, reject) => {
    const request = factory.open('unity-updater', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('handles');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  async function run(mode, action) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('handles', mode), request = action(transaction.objectStore('handles'));
      transaction.oncomplete = () => resolve(request.result); transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });
  }
  return { get: () => run('readonly', store => store.get('directory')), set: value => run('readwrite', store => store.put(value, 'directory')), close: () => database.close() };
}
