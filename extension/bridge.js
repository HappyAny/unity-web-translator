(function () {
  'use strict';
  if (window.__UnityTranslatorBridge) return;
  window.__UnityTranslatorBridge = true;
  const channel = 'unity-web-translator-v1', requestEvent = channel + '-request', responseEvent = channel + '-response';
  let active = 0;
  window.addEventListener(requestEvent, event => {
    if (event.target !== window || typeof event.detail !== 'string' || event.detail.length > 200000) return;
    let message; try { message = JSON.parse(event.detail); } catch { return; }
    if (message?.channel !== channel || message.direction !== 'request' ||
        typeof message.id !== 'string' || message.id.length > 100 || !['getPreferences', 'translate', 'reportRuntime', 'openOptions', 'getNativeFont'].includes(message.action)) return;
    const send = result => window.dispatchEvent(new CustomEvent(responseEvent, { detail: JSON.stringify({ channel, direction: 'response', id: message.id, ...result }) }));
    if (active >= 8) { send({ ok: false, error: '扩展翻译忙，请稍后重试' }); return; }
    active++;
    chrome.runtime.sendMessage({ action: message.action, payload: message.payload }).then(send,
      () => send({ ok: false, error: '扩展连接已失效，请刷新网页' })).finally(() => active--);
  });
})();
