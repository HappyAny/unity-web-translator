# Architecture

The extension registers isolated and MAIN-world scripts at `document_start` only for user-enabled origins. A top-page origin/path binding chooses the running profile for all authorized frames. Creating or editing a profile alone does not bind a page.

`native-resources.js` validates explicit URL/field rules and edits selected JSON string spans. `native-xhr.js` delays only matching asynchronous XHR completion events. `runtime.js` wraps fetch, owns the cooperative native text API, restores live bridge bindings on pause, and rejects stale results. Matched resource work is bounded and falls back to original text.

`bridge.js` provides a same-window transport to the service worker. Page operations are restricted to public preferences, translation and sanitized status reports. Pages cannot select profiles, write settings, read credentials, export caches or invoke updates. All service requests originate in the extension, with configured API origin permission checks and omitted cookies. Storage access is restricted to trusted extension contexts.

`ProfileManager` separates shared providers/languages/switches from profile-specific rules and prompts. Each profile has a separate IndexedDB cache; keys include provider/body/prompt, target language and dialogue context. A bounded LRU avoids repeated IndexedDB access and SHA-256 work. Personal translations are kept separately and take priority.

The text bridge records only current displayed dialogue; JSON preload never populates history. Rule changes, profile changes, pause and cache edits advance preference revisions so old page work cannot replace new text. Already-consumed JSON cannot be restored without application integration or refresh.

The updater checks product identity, ZIP paths, CRC and per-file SHA-256, backs up the original public code and rolls back failed writes. Browser configuration is retained by updating the existing installation directory. Hash checks establish package integrity, not an independent signing authority; use the project's releases.
