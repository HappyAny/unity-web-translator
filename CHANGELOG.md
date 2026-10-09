# Changelog

## 0.2.20

- Construct the matched custom renderer's bundled CJK fallback with an explicit native font size before loading its owned font data and recomputing face metrics.
- Replace the path-only constructor that could leave unusable native metrics and prevent the fallback from being applied.
- Retain current-command reveal mapping and cached future translations; font initialization does not advance native clicks or commands.
- Add zero-size constructor rejection and explicit-size fallback regressions. Failed metric diagnostics include only font size and line height.

## 0.2.19

- Preserve negative native novel view lengths, which mean show-all; translating them into zero had hidden dialogue in instant-display mode.
- Keep show-all limited to the current translated click segment and completed prefixes; later pretranslated commands remain in the cache.
- Recompute cached baseline and line height before applying the bundled CJK face to the matched custom renderer; reject invalid metrics and retain the original font.
- Include text-free native and translated visibility counts in novel diagnostics.

## 0.2.18

- Bind matched novel windows to the current native text command instead of translating an entire page of upcoming click segments.
- Map translated character visibility to the engine's reveal progress using its own text parser; retain completed segments, clicks, voice and command timing.
- Prefetch the configured number of complete future commands within a verified page without displaying them early or adding them to reference history.
- Prefer the bundled CJK font in the matched custom text renderer and invalidate its glyph layout after writeback; restore the source font when paused.
- Keep unverified page boundaries in their original masked form, reject stale segment results, and release translated page roots on replacement and disposal.
- Add segment, lookahead, font, Profile revision and cleanup regressions. Validate the added entry and helper exports against the original WASM; actual font layout remains subject to client verification.

## 0.2.13

- Keep a displayed dialogue translation when advance/reveal callbacks repeat the current source or a shorter prefix through native text setters.
- Repair protected direct text assignments before TMP processing, without replaying dialogue, voice, command or reveal callbacks.
- Reuse one rooted managed output string per binding; release it on replacement, source restoration, clear and disposal.
- Preserve native new-line, pause and story-switch behavior, and reject stale results after a clear or line change.
- Add regression coverage for pre-setter substitution, native return values, reveal progress and root lifetime.

## 0.2.6

- Add fingerprint-checked legacy Unity UI.Text bindings for tutorials, menus and status labels.
- Load the bundled Chinese font through the native Font file-path constructor for legacy UI; keep font size, style and color, and restore the original font on pause or disposal.
- Capture the shared TextMeshPro text-processing path, including direct SetText, formatted values, StringBuilder and character-array input.
- Include world-space TextMeshPro component lifecycle hooks and reject stale UI translations after label changes.
- Retain the verified dialogue renderer and isolate legacy/TMP font helpers.

## 0.2.5

- Add a second fingerprint-checked Unity native component adapter for Naninovel revealable text and TextMeshPro UI.
- Translate complete dialogue and author names while retaining the original script, voice playback and backlog entries.
- Preserve native reveal progress when an asynchronous translation refreshes the renderer; ignore stale responses after line changes or component disposal.
- Select managed font layouts per verified build and reuse the bundled OFL-licensed Chinese fallback font.
- Warm a bounded cache of plain script lines without changing commands or expressions.
- Retain existing adapter behavior, shared services, per-profile settings and same-directory updates.

## 0.2.4

- Add a fingerprint-checked IL2CPP WebAssembly component adapter for verified builds.
- Write translations through original TextMeshPro setters without altering downloaded asset bundles or CRC checks.
- Capture dialogue and role names, warm a bounded script cache, and release managed roots when components are disabled or destroyed.
- Bind complete typewriter balloons instead of translating per-frame prefixes.
- Bundle an OFL-licensed Chinese font with native dynamic glyph atlases and preserve the original text color and font when paused.
- Add native font fallbacks for per-character text renderers, preserve existing fallback order and materials, and prevent individual letters from generating translation requests.
- Refresh active per-character dialogue after translation, restore the original sentence on pause, and retain a single native history entry for each sentence.
- Use independent string CustomEvents for extension communication without triggering host postMessage handlers.
- Add component-adapter diagnostics and tests for typed WASM calls, lifecycle cleanup, original fallback and stale responses.
- Keep shared services, independent profiles, pause controls and same-directory updates.

## 0.1.0

- Initial independent Unity Web extension with explicit native text adapters.
- Bounded GET JSON string-span replacement for fetch and asynchronous XHR, preserving unrelated data.
- Cooperative JavaScript text API and Unity C# / `.jslib` integration samples.
- Shared translation providers, custom body parameters, target languages and switches.
- Independent profile rules, prompts, caches and editable personal translations.
- Popup profile selection, page authorization, pause and native text diagnostics.
- Bilingual interface, history by displayed-line count, and same-directory updates.
- Packaged browser extension, integrity manifest, Windows/Linux CI and GPL-3.0-only licensing.
