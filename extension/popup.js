import { t, setLanguage, getLanguage, localizeError, applyLanguage } from './i18n.mjs';
import { TARGET_LANGUAGES } from './core.mjs';
import { sitePattern } from './site-access.mjs';
const $ = id => document.getElementById(id);
$('popupVersion').textContent = 'v' + chrome.runtime.getManifest().version;
let page, preferences, profileList = [], busy = false;
async function request(action, payload) { const reply = await chrome.runtime.sendMessage({ action, payload }); if (!reply?.ok) throw new Error(reply?.error || '扩展后台无响应'); return reply.data; }
function fill(data) {
  preferences = data;
  setLanguage(data.interfaceLanguage);
  $('pauseToggle').disabled = busy;
  $('pauseToggle').textContent = t(data.paused ? 'resumeTranslation' : 'pauseTranslation');
  $('pauseToggle').setAttribute('aria-pressed', String(!!data.paused));
  for (const key of ['storyEnabled', 'uiEnabled']) { $(key).checked = data[key]; $(key).disabled = busy || !data.profileId; }
  $('provider').textContent = !data.profileId ? t('noProfileProvider') : (data.provider === 'mymemory' ? 'MyMemory' : 'OpenAI API') + ' → ' + (TARGET_LANGUAGES[data.targetLanguage]?.[getLanguage() === 'en' ? 'english' : 'native'] || 'Simplified Chinese');
  renderProfiles();
}
function profileLabel(item) { return item.isDefault && item.name === 'Default' ? t('defaultProfile') : item.name; }
function renderProfiles() {
  const choose = document.createElement('option'); choose.value = ''; choose.textContent = t('chooseProfile');
  $('profileSelect').replaceChildren(choose, ...profileList.map(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = profileLabel(item); return option; }));
  $('profileSelect').value = preferences?.profileId || ''; $('profileSelect').disabled = busy || !page?.scope;
  $('profileHint').textContent = t(preferences?.profileId ? 'profileBindingHint' : 'profileRequired');
}
$('pauseToggle').addEventListener('click', async () => {
  $('pauseToggle').disabled = true;
  try {
    fill(await request('setPreferences', { paused: !preferences.paused }));
    $('status').textContent = t(preferences.paused ? 'translationPaused' : 'translationResumed');
  } catch (error) { $('status').textContent = localizeError(error.message); $('pauseToggle').disabled = false; }
});
function selected() { return [...$('origins').querySelectorAll('input:checked')].map(input => input.value); }
function selectionEnabled() { const values = selected(); return values.length > 0 && values.every(origin => page.origins.find(row => row.origin === origin)?.enabled); }
function renderToggle() { $('siteToggle').disabled = busy || !selected().length; $('siteToggle').textContent = t(selectionEnabled() ? 'disablePage' : 'enablePage'); }
function setBusy(value) {
  busy = value;
  $('profileSelect').disabled = busy || !page?.scope;
  $('pauseToggle').disabled = busy || !preferences;
  for (const key of ['storyEnabled', 'uiEnabled']) $(key).disabled = busy || !preferences?.profileId;
  for (const input of $('origins').querySelectorAll('input')) input.disabled = busy;
  renderToggle();
}
async function readPage() {
  const previousScope = page?.scope, choices = new Map([...$('origins').querySelectorAll('input')].map(input => [input.value, input.checked]));
  page = await request('getPageContext'); $('pageScope').textContent = page.scope || ''; profileList = (await request('getProfiles')).profiles; renderProfiles(); $('origins').replaceChildren();
  for (const row of page.origins) {
    const label = document.createElement('label'), input = document.createElement('input'), text = document.createElement('span');
    input.type = 'checkbox'; input.value = row.origin; input.checked = page.scope === previousScope ? choices.get(row.origin) ?? true : true; input.disabled = busy; text.textContent = row.origin;
    input.addEventListener('change', renderToggle); label.className = 'origin'; label.append(input, text); $('origins').append(label);
  }
  renderToggle(); if (!page.origins.length) $('status').textContent = t('noWebPage');
  else if (!page.profileId) $('status').textContent = t('profileRequired');
}
$('profileSelect').addEventListener('change', async () => {
  if (busy) return;
  const id = $('profileSelect').value, origins = selected(), tabId = page.tabId, scope = page.scope, needsEnable = !!id && !selectionEnabled();
  setBusy(true);
  try {
    if (id && !origins.length) throw new Error('请选择要启用的网页域名');
    // Request permissions before any asynchronous work to retain the selection's user gesture.
    if (needsEnable && !await chrome.permissions.request({ origins: origins.map(sitePattern) })) throw new Error('需要允许扩展访问所选网页');
    fill(await request('bindPageProfile', { id, tabId, scope }));
    const enabled = needsEnable ? await request('enableSites', { origins, tabId }) : null;
    await readPage();
    if (page.scope !== scope || page.profileId !== (id || null)) throw new Error('网页已变化，请重新打开扩展');
    $('status').textContent = id ? t('profileBound', { name: profileLabel(profileList.find(item => item.id === id)) }) + ' ' + t(enabled?.needsRefresh ? 'pageRefresh' : 'pageEnabled') + (preferences.paused ? ' ' + t('translationPaused') : '') : t('profileUnbound');
  } catch (error) {
    try { await readPage(); fill(await request('getPreferences')); } catch { /* Keep the last known selection if the page cannot be read. */ }
    $('status').textContent = localizeError(error.message);
  } finally { setBusy(false); }
});
for (const key of ['storyEnabled', 'uiEnabled']) $(key).addEventListener('change', async () => { try { fill(await request('setPreferences', { [key]: $(key).checked })); $('status').textContent = t('saved'); } catch (error) { $('status').textContent = localizeError(error.message); } });
$('siteToggle').addEventListener('click', async () => {
  if (busy) return;
  setBusy(true);
  try {
    const origins = selected();
    if (selectionEnabled()) { await request('disableSites', { origins, tabId: page.tabId }); $('status').textContent = t('pageDisabled'); }
    else {
      if (!await chrome.permissions.request({ origins: origins.map(sitePattern) })) throw new Error('需要允许扩展访问所选网页');
      const result = await request('enableSites', { origins, tabId: page.tabId }); $('status').textContent = t(result.needsRefresh ? 'pageRefresh' : 'pageEnabled');
    }
    await readPage();
  } catch (error) { $('status').textContent = localizeError(error.message); }
  finally { setBusy(false); }
});
function openSettings(create = false) {
  const url = new URL(chrome.runtime.getURL('options.html'));
  if (preferences?.profileId) url.searchParams.set('profile', preferences.profileId);
  if (create) url.searchParams.set('new', '1');
  return chrome.tabs.create({ url: url.href });
}
async function readRuntime() {
  try {
    const { reports = [] } = await request('getRuntimeStatus');
    if (!reports.length) { $('runtimeStatus').textContent = t('nativeWaiting'); $('runtimePaths').textContent = ''; return; }
    const totals = reports.reduce((sum, row) => ({ changed: sum.changed + row.translatedStrings, matched: sum.matched + row.matchedResources,
      selected: sum.selected + row.selectedStrings, bridge: sum.bridge + row.bridgeCalls, opaque: sum.opaque + row.opaqueRequests }), { changed: 0, matched: 0, selected: 0, bridge: 0, opaque: 0 });
    $('runtimeStatus').textContent = totals.changed ? t('nativeTranslated', totals) : totals.bridge || totals.selected ? t('nativeConnected', totals) : t('nativeNoInterface', totals);
    if (preferences?.paused) $('runtimeStatus').textContent += ' ' + t('translationPaused');
    $('runtimePaths').textContent = reports.flatMap(row => [row.origin + ' · v' + row.version, ...row.paths]).join('\n');
  } catch { $('runtimeStatus').textContent = t('nativeWaiting'); }
}
$('runtimeRefresh').addEventListener('click', readRuntime);
$('settings').addEventListener('click', () => openSettings());
$('createProfile').addEventListener('click', () => openSettings(true));
$('update').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('update.html') }));
applyLanguage();
request('getPreferences').then(async data => { fill(data); await readPage(); await readRuntime(); }).catch(error => { $('status').textContent = localizeError(error.message); });
