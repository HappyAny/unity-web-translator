import { initializePersonalEditor } from './personal-editor.mjs';
import { DEFAULTS, TARGET_LANGUAGES, validateSettings, buildModelBody, apiPermissionPattern } from './core.mjs';
import { t, setLanguage, getLanguage, applyLanguage, localizeError } from './i18n.mjs';
const $ = id => document.getElementById(id);
const extension = true;
let currentSettings, lastMessage, testTranslation, editingId, profileList = [];
const editingScope = () => ({ profileId: editingId, targetLanguage: currentSettings?.targetLanguage });
function assertScope(scope) { if (scope.profileId !== editingId || (scope.targetLanguage && scope.targetLanguage !== currentSettings?.targetLanguage)) throw new Error('Profile 或目标语言已变化，请重新操作'); }
function message(key, values = {}, error = false) { lastMessage = { key, values, error }; renderMessage(); }
function renderMessage() { if (lastMessage) { $('status').textContent = t(lastMessage.key, lastMessage.values); $('status').className = 'status' + (lastMessage.error ? ' error' : ''); } }
function messageError(error) { $('status').textContent = localizeError(error.message); $('status').className = 'status error'; lastMessage = undefined; }
async function request(action, body, scope = editingScope()) {
  if (extension && currentSettings && ['exportTranslations', 'importTranslations', 'getPersonalTranslation', 'setPersonalTranslation', 'removePersonalTranslation'].includes(action) && $('targetLanguage').value !== currentSettings.targetLanguage) throw new Error('请先保存目标语言设置，再操作个人译文');
  if (['exportTranslations', 'importTranslations', 'getPersonalTranslation', 'setPersonalTranslation', 'removePersonalTranslation'].includes(action)) assertScope(scope);
  if (extension) {
    const response = await chrome.runtime.sendMessage({ action, payload: body, profileId: scope.profileId, targetLanguage: scope.targetLanguage });
    if (!response?.ok) throw new Error(response?.error || '扩展后台没有响应');
    return response.data;
  }
  throw new Error('扩展后台没有响应');
}
function parseBody() { try { return JSON.parse($('extraBody').value.trim() || '{}'); } catch { throw new Error('附加 Body JSON 格式错误，请检查逗号、引号和括号'); } }
function parseRules() { try { return JSON.parse($('resourceRules').value.trim() || '[]'); } catch { throw new Error(t('rulesJsonError')); } }
function values() {
  const settings = validateSettings({ provider: $('provider').value, apiBase: $('apiBase').value.trim(), model: $('model').value.trim(),
    maxFreeCharacters: Number($('maxFreeCharacters').value), storyEnabled: $('storyEnabled').checked,
    uiEnabled: $('uiEnabled').checked, extraBody: parseBody(),
    disableThinking: $('disableThinking').checked, thinkingPreset: $('thinkingPreset').value,
    requestTimeoutSeconds: Number($('requestTimeoutSeconds').value), lookahead: Number($('lookahead').value),
    targetLanguage: $('targetLanguage').value, interfaceLanguage: $('interfaceLanguage').value,
    historyEnabled: $('historyEnabled').checked, historyMaxEntries: Number($('historyMaxEntries').value) });
  delete settings.paused;
  delete settings.customPrompt;
  delete settings.resourceRules;
  return settings;
}
function preview() { try { $('bodyPreview').textContent = JSON.stringify(buildModelBody({ ...values(), customPrompt: $('customPrompt').value }, '「お父さん、大丈夫ですか？」'), null, 2); } catch (error) { $('bodyPreview').textContent = localizeError(error.message); } }
function fields() {
  const model = $('provider').value === 'openai';
  $('modelFields').hidden = !model; $('budgetField').hidden = model; $('model').required = model;
  $('thinkingFields').hidden = !$('disableThinking').checked; $('probe').hidden = !model;
  $('historyFields').hidden = !$('historyEnabled').checked;
  $('providerHint').textContent = t(model ? 'modelHint' : 'freeHint'); preview();
}
function targetOptions() {
  const selected = $('targetLanguage').value || DEFAULTS.targetLanguage;
  $('targetLanguage').replaceChildren(...Object.entries(TARGET_LANGUAGES).map(([code, language]) => {
    const option = document.createElement('option'); option.value = code; option.textContent = getLanguage() === 'en' ? language.english : language.native; return option;
  })); $('targetLanguage').value = selected;
}
function renderSummary() {
  if (currentSettings) {
    const data = currentSettings, storage = t(extension ? (data.rememberApiKey ? 'persistentKey' : 'sessionKey') : 'localKey');
    $('keyHint').textContent = data.hasApiKey ? t('keySet', { storage }) : t('keyNone');
    $('budgetText').textContent = t('usage', { used: data.usedFreeCharacters, limit: data.maxFreeCharacters, remaining: Math.max(0, data.maxFreeCharacters - data.usedFreeCharacters) });
    $('budgetBar').style.width = Math.min(100, data.usedFreeCharacters / Math.max(1, data.maxFreeCharacters) * 100) + '%';
    $('connection').textContent = t(extension ? 'connectedExtension' : 'connectedLocal');
  }
  if (extension) {
    const version = chrome.runtime.getManifest().version;
    $('settingsVersion').textContent = 'UNITY WEB TRANSLATOR · v' + version;
    $('versionInfo').textContent = t('updateVersion', { version });
  }
  if (testTranslation) $('testResult').textContent = t('testText', testTranslation);
  renderMessage();
}
function fill(data, profileOnly = false) {
  const priorTarget = currentSettings?.targetLanguage, priorProfile = currentSettings?.profileId; currentSettings = { ...DEFAULTS, ...currentSettings, ...data };
  if (!profileOnly) {
    for (const key of ['provider', 'apiBase', 'model', 'maxFreeCharacters', 'thinkingPreset', 'requestTimeoutSeconds', 'lookahead', 'targetLanguage', 'interfaceLanguage', 'historyMaxEntries']) $(key).value = currentSettings[key];
    for (const key of ['storyEnabled', 'uiEnabled', 'disableThinking', 'historyEnabled']) $(key).checked = !!currentSettings[key];
    $('extraBody').value = JSON.stringify(currentSettings.extraBody || {}, null, 2);
    $('apiKey').value = ''; $('clearApiKey').checked = false; $('rememberApiKey').checked = !!currentSettings.rememberApiKey;
    setLanguage(currentSettings.interfaceLanguage); targetOptions();
    $('migratedService').textContent = data.migratedFromProfile ? t('sharedMigrated', { name: data.migratedFromProfile }) : '';
  }
  if (data.profileId) { $('customPrompt').value = data.customPrompt || ''; $('resourceRules').value = JSON.stringify(data.resourceRules || [], null, 2); $('profileSelect').value = data.profileId; $('profileName').value = data.profileName; }
  renderSummary(); fields();
  if (priorProfile !== currentSettings.profileId || (priorTarget && priorTarget !== currentSettings.targetLanguage)) { $('personalOriginal').value = ''; $('personalTranslation').value = ''; $('personalStatus').textContent = ''; testTranslation = undefined; $('testResult').textContent = ''; }
}
async function save() {
  const payload = { ...values(), apiKey: $('apiKey').value, clearApiKey: $('clearApiKey').checked, rememberApiKey: $('rememberApiKey').checked };
  if (extension && payload.provider === 'openai') {
    const granted = await chrome.permissions.request({ origins: [apiPermissionPattern(payload.apiBase)] });
    if (!granted) throw new Error('需要允许扩展访问所填写的 API 地址，才能保存并翻译');
  }
  const data = await request('setSharedSettings', payload, {}); fill(data); await refreshCacheInfo(); return data;
}
async function savePrompt(scope = { profileId: editingId }) {
  assertScope(scope);
  const { customPrompt, resourceRules } = validateSettings({ ...DEFAULTS, ...currentSettings, customPrompt: $('customPrompt').value, resourceRules: parseRules() });
  const data = await request('setProfileSettings', { customPrompt, resourceRules }, scope); assertScope(scope); fill(data, true); await refreshCacheInfo(); return data;
}
$('formatRules').addEventListener('click', () => { try { const settings = validateSettings({ ...DEFAULTS, ...currentSettings, resourceRules: parseRules() }); $('resourceRules').value = JSON.stringify(settings.resourceRules, null, 2); $('profileStatus').textContent = t('jsonFormatted'); } catch (error) { $('profileStatus').textContent = localizeError(error.message); } });
$('exampleRules').addEventListener('click', () => {
  $('resourceRules').value = JSON.stringify([{ url: '/StreamingAssets/story/*.json', fields: [{ path: 'lines[*].text', kind: 'story', speaker: 'speaker' }, { path: 'lines[*].speaker', kind: 'name' }] }], null, 2);
  $('profileStatus').textContent = t('exampleRulesHint');
});
for (const key of ['provider', 'disableThinking', 'thinkingPreset', 'historyEnabled', 'targetLanguage']) $(key).addEventListener('change', fields);
for (const key of ['extraBody', 'model', 'apiBase', 'customPrompt']) $(key).addEventListener('input', preview);
$('interfaceLanguage').addEventListener('change', () => { setLanguage($('interfaceLanguage').value); targetOptions(); renderSummary(); fields(); });
$('formatBody').addEventListener('click', () => { try { $('extraBody').value = JSON.stringify(parseBody(), null, 2); preview(); message('jsonFormatted'); } catch (error) { messageError(error); } });
$('settingsForm').addEventListener('submit', async event => { event.preventDefault(); $('save').disabled = true;
  try { await save(); message('sharedSaved'); } catch (error) { messageError(error); } finally { $('save').disabled = false; }
});
$('profileForm').addEventListener('submit', async event => { event.preventDefault(); $('saveProfile').disabled = true;
  try { await savePrompt(); $('profileStatus').textContent = t('profileSaved'); } catch (error) { $('profileStatus').textContent = localizeError(error.message); } finally { $('saveProfile').disabled = false; }
});
async function runTest(saveProfilePrompt = false) {
  $('test').disabled = true; $('testProfile').disabled = true; $('testResult').textContent = ''; testTranslation = undefined;
  const scope = { profileId: editingId };
  try {
    await save(); assertScope(scope); if (saveProfilePrompt) await savePrompt(scope);
    message('testing'); const result = await request('test', {}, scope), item = result.items[0]; assertScope(scope);
    if (item.error) { message('testFailure', { code: item.error, message: localizeError(item.errorMessage || '服务请求失败'), elapsed: result.elapsedMs }, true); return; }
    testTranslation = { original: '「お父さん、大丈夫ですか？」', translation: item.text };
    const updated = await request(saveProfilePrompt ? 'getSettings' : 'getSharedSettings', undefined, scope); assertScope(scope); fill(updated, saveProfilePrompt); await refreshCacheInfo(); message('testSuccess', { elapsed: result.elapsedMs });
  } catch (error) { messageError(error); } finally { $('test').disabled = false; $('testProfile').disabled = false; }
}
$('test').addEventListener('click', () => runTest());
$('testProfile').addEventListener('click', () => runTest(true));
$('probe').addEventListener('click', async () => { $('probe').disabled = true;
  const scope = { profileId: editingId };
  try { await save(); assertScope(scope); message('probing'); const result = await request('probe', {}, scope); assertScope(scope); message('probeResult', { message: (result.error ? '[' + result.error + '] ' : '') + localizeError(result.message), elapsed: result.elapsedMs }, !result.reachable); }
  catch (error) { messageError(error); } finally { $('probe').disabled = false; }
});
$('clearCache').addEventListener('click', async () => { $('clearCache').disabled = true;
  const scope = { profileId: editingId };
  try { await request('clearCache', {}, scope); assertScope(scope); message('cacheCleared'); await refreshCacheInfo(); } catch (error) { messageError(error); } finally { $('clearCache').disabled = false; }
});
$('reloadExtension').addEventListener('click', () => chrome.runtime.reload());
const refreshCacheInfo = initializePersonalEditor(request, extension, editingScope);
function renderProfiles() {
  const selected = editingId;
  $('profileSelect').replaceChildren(...profileList.map(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = item.isDefault && item.name === 'Default' ? t('defaultProfile') : item.name; return option; }));
  $('profileSelect').value = selected || ''; $('profileSelect').disabled = !profileList.length;
}
async function loadProfiles() { const data = await request('getProfiles'); profileList = data.profiles; renderProfiles(); return data; }
async function loadProfile(id) {
  editingId = id; $('profileSelect').disabled = true; $('profileStatus').textContent = ''; lastMessage = undefined; $('status').textContent = '';
  $('cacheInfo').textContent = t('cacheLoading');
  const data = await request('selectEditorProfile', { id });
  if (editingId !== id) return;
  fill(data, true); renderProfiles(); await refreshCacheInfo();
}
$('profileSelect').addEventListener('change', async () => { const id = $('profileSelect').value;
  try { await loadProfile(id); } catch (error) { $('profileStatus').textContent = localizeError(error.message); renderProfiles(); }
});
$('createProfile').addEventListener('click', async () => { $('createProfile').disabled = true;
  try {
    const data = await request('createProfile', { name: $('profileName').value, ...($('copyProfile').checked ? { copyFrom: editingId } : {}) });
    editingId = data.profileId; fill(data, true); await loadProfiles(); await refreshCacheInfo(); $('profileStatus').textContent = t('profileCreated');
  } catch (error) { $('profileStatus').textContent = localizeError(error.message); } finally { $('createProfile').disabled = false; }
});
$('renameProfile').addEventListener('click', async () => { $('renameProfile').disabled = true; const scope = { profileId: editingId };
  try { const data = await request('renameProfile', { name: $('profileName').value }, scope); assertScope(scope); fill(data, true); await loadProfiles(); $('profileStatus').textContent = t('profileRenamed'); }
  catch (error) { $('profileStatus').textContent = localizeError(error.message); } finally { $('renameProfile').disabled = false; }
});
for (const key of ['rememberKeyRow', 'cacheRow', 'personalCard', 'updateCard', 'extendedSettings', 'historySettings']) $(key).hidden = !extension;
applyLanguage(); targetOptions();
(async () => { fill(await request('getSharedSettings', undefined, {})); const data = await loadProfiles(), params = new URL(location.href).searchParams;
  const id = params.get('profile') || data.editorId; await loadProfile(id);
  if (params.has('new')) { $('profileName').value = ''; $('profileName').focus(); }
})().catch(error => {
  message('connectionFailure', { message: localizeError(error.message) }, true); $('connection').textContent = t('disconnected');
});
