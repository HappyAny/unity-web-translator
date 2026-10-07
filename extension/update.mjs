// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
import { t, setLanguage, getLanguage, applyLanguage, localizeError } from './i18n.mjs';
import { readRelease, applyRelease, inspectDirectory, updaterDirectoryStore } from './updater-core.mjs';
const $ = id => document.getElementById(id);
const updateRuntime = globalThis.chrome?.runtime?.id ? chrome.runtime : null;
const installedVersion = updateRuntime?.getManifest().version;
let release, directory, busy = false, directoryStore, lastStatus;
function status(key, values = {}, error = false) { lastStatus = { key, values, error }; renderStatus(); }
function renderStatus() { if (lastStatus) { $('updateStatus').textContent = t(lastStatus.key, lastStatus.values); $('updateStatus').className = lastStatus.error ? 'error' : ''; } }
function showError(error) { lastStatus = null; $('updateStatus').textContent = localizeError(error.message) + (error.backupName ? '\n' + t('backupLocation', { path: error.backupName }) : ''); $('updateStatus').className = 'error'; }
function refresh() {
  document.body.classList.toggle('busy', busy);
  $('runningVersionRow').hidden = !installedVersion;
  $('runningVersion').textContent = installedVersion ? 'v' + installedVersion : '—';
  $('applyUpdate').disabled = busy || !release || !directory;
  $('chooseDirectory').disabled = busy; $('packageFile').disabled = busy;
  $('directoryName').textContent = directory ? t('directorySelected', { name: directory.name }) : t('directoryNotSelected');
}
async function loadPackage(file) {
  if (!file || busy) return;
  busy = true; release = null; $('packageVersion').textContent = '—'; $('reloadUpdated').hidden = true; refresh(); status('checkingUpdate');
  try {
    if (!file.name.toLowerCase().endsWith('.zip') || file.size > 10 * 1024 * 1024) throw new Error('请选择不超过 10 MB 的插件 Release ZIP');
    release = await readRelease(await file.arrayBuffer());
    $('packageVersion').textContent = 'v' + release.version;
    status('updateReady', { version: release.version, count: release.entries.length });
  } catch (error) { showError(error); }
  finally { busy = false; refresh(); }
}
$('dropZone').addEventListener('click', () => { if (!busy) $('packageFile').click(); });
$('dropZone').addEventListener('keydown', event => { if (!busy && ['Enter', ' '].includes(event.key)) { event.preventDefault(); $('packageFile').click(); } });
$('packageFile').addEventListener('change', event => { loadPackage(event.target.files[0]); event.target.value = ''; });
for (const name of ['dragenter', 'dragover']) $('dropZone').addEventListener(name, event => { event.preventDefault(); if (!busy) $('dropZone').classList.add('dragging'); });
$('dropZone').addEventListener('dragleave', () => $('dropZone').classList.remove('dragging'));
$('dropZone').addEventListener('drop', event => {
  event.preventDefault(); $('dropZone').classList.remove('dragging');
  if (event.dataTransfer.files.length !== 1) { showError(new Error('一次只拖入一个插件 ZIP')); return; }
  loadPackage(event.dataTransfer.files[0]);
});
document.addEventListener('dragover', event => event.preventDefault()); document.addEventListener('drop', event => event.preventDefault());
$('chooseDirectory').addEventListener('click', async () => {
  try {
    if (!globalThis.showDirectoryPicker) throw new Error('请更新 Edge / Chrome 后再使用拖放更新');
    const selected = await showDirectoryPicker({ id: 'unity-extension-update', mode: 'readwrite', ...(directory ? { startIn: directory } : {}) });
    await inspectDirectory(selected, installedVersion); directory = selected;
    const store = await directoryStoreReady;
    try { if (!store) throw new Error('No persistent handle store'); await store.set(directory); status('directoryReady'); }
    catch { status('directoryTemporary'); }
    refresh();
  } catch (error) { if (error.name !== 'AbortError') showError(error); }
});
$('applyUpdate').addEventListener('click', async () => {
  if (busy || !release || !directory) return;
  busy = true; refresh(); $('progress').hidden = false; $('progress').value = 0;
  try {
    // Request permission directly in the click gesture, before any asynchronous work.
    if (await directory.requestPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('需要允许写入原扩展目录');
    status('writingUpdate');
    const result = await applyRelease(directory, release, { installedVersion, onProgress: (done, total) => { $('progress').max = total; $('progress').value = done; } });
    status(updateRuntime ? 'updateWritten' : 'updateWrittenStandalone', { version: result.version, backup: result.backupName });
    $('reloadUpdated').hidden = !updateRuntime; release = null;
  } catch (error) { showError(error); }
  finally { busy = false; refresh(); }
});
$('reloadUpdated').addEventListener('click', () => updateRuntime?.reload());
$('language').addEventListener('change', event => { setLanguage(event.target.value); refresh(); renderStatus(); });
applyLanguage(); refresh();
if (updateRuntime) {
  updateRuntime.sendMessage({ action: 'getPreferences' }).then(reply => {
    if (reply?.ok) { setLanguage(reply.data.interfaceLanguage); $('language').value = getLanguage(); refresh(); }
  }).catch(() => {});
}
const directoryStoreReady = updaterDirectoryStore().then(async store => { directoryStore = store; const remembered = await store.get(); if (!directory) directory = remembered; refresh(); return store; }).catch(() => null);
