// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
mergeInto(LibraryManager.library, {
  UWT_BindText: function (targetPtr, idPtr, textPtr, optionsPtr) {
    var target = UTF8ToString(targetPtr), id = UTF8ToString(idPtr), text = UTF8ToString(textPtr);
    var options; try { options = JSON.parse(UTF8ToString(optionsPtr)); } catch (_) { options = {}; }
    // Copy strings before yielding; no WASM heap pointers survive the async call.
    var api = window.UnityWebTranslator;
    if (!api || typeof api.bind !== 'function') return;
    var slots = window.__UnityWebTextSlots || (window.__UnityWebTextSlots = new Map());
    var previous = slots.get(target); if (previous) previous();
    try {
      var release = api.bind('unity:' + target, text, function (translated) {
        Module.SendMessage(target, 'OnTranslation', JSON.stringify({ id: id, text: translated }));
      }, options);
      slots.set(target, release);
    } catch (_) { /* C# already displayed the original text. */ }
  },
  UWT_ReleaseText: function (targetPtr) {
    var target = UTF8ToString(targetPtr), slots = window.__UnityWebTextSlots;
    if (!slots) return;
    var release = slots.get(target); if (release) release(); slots.delete(target);
  }
});
