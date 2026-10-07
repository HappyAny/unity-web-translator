# Changelog

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
