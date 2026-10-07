(function () {
  'use strict';
  if (window.__UnityTranslatorBridge) return;
  window.__UnityTranslatorBridge = true;
  const channel = 'unity-web-translator-v1';
  let active = 0;
  window.addEventListener('message', event => {
    const message = event.data;
    if (event.source !== window || event.origin !== location.origin || message?.channel !== channel || message.direction !== 'request' ||
        typeof message.id !== 'string' || message.id.length > 100 || !['getPreferences', 'translate', 'reportRuntime', 'openOptions'].includes(message.action)) return;
    const send = result => window.postMessage({ channel, direction: 'response', id: message.id, ...result }, location.origin);
    if (active >= 8) { send({ ok: false, error: '扩展翻译忙，请稍后重试' }); return; }
    active++;
    chrome.runtime.sendMessage({ action: message.action, payload: message.payload }).then(send,
      () => send({ ok: false, error: '扩展连接已失效，请刷新网页' })).finally(() => active--);
  });
})();
