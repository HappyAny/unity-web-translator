# Unity Web Translator

A Chrome / Edge extension that translates native text through an accessible Unity Web text interface. **It does not automatically translate every Unity build.**

Three adapters are included:

- Configured GET JSON string fields, intercepted before `fetch` or asynchronous `XMLHttpRequest` supplies the resource to the application.
- A cooperative Unity text bridge. The supplied `.jslib` and C# sample routes dialogue back into the application's own text components.
- A native component adapter for verified IL2CPP WebAssembly builds. It checks the complete module fingerprint, captures text parsing and TextMeshPro assignments, and writes translations through the original component setter. Unknown builds retain their original behavior.

The native component adapter leaves downloaded asset bundles and their checksums unchanged. It does not cover every engine build, text component or image. Engine detection is diagnostic only. OCR is not included.

Supported native adapters bind complete typewriter sentences and include an OFL-licensed Chinese fallback font, rendered by Unity itself. Its BMP subset contains 30,445 characters; rare characters and non-BMP glyphs are not guaranteed. Pausing restores original text and fonts. Other integration paths retain the project's own font configuration. Font loading is local to the extension and engine memory.

Verified component paths include per-character dialogue windows and Naninovel RevealableText / TextMeshPro. The revealable adapter captures complete dialogue and author names, preserves reveal progress during asynchronous updates, and does not replay script commands, voice playback or backlog insertion. Support remains limited to the verified build fingerprints.

Download the extension ZIP from [Releases](https://github.com/HappyAny/unity-web-translator/releases/latest), extract it into a permanent directory, and load its `extension` folder with Developer mode enabled. Configure the shared provider and run the translation test. Create a profile; supported native builds need no JSON resource rules. Otherwise configure real [resource rules](native-adapters.md) or integrate the [Unity SDK](../examples/unity/). Select the profile in the page popup, grant access and refresh the page.

Providers, API keys, body parameters, reasoning presets, target language and switches are shared. Profiles isolate resource rules, additional prompts, automatic caches and personal translations. Seven target languages and English / Chinese settings are included. Export editable cache JSON and import personal corrections; API keys are excluded.

The popup reports actual selected and replaced text. Pausing restores active bridge and supported native component bindings. Text already loaded into an application from JSON requires a page refresh to restore completely. Other integration paths rely on the Unity project's font configuration.

To update, drop a new Release ZIP into the extension's update page and select the original `extension` folder, or run `update.cmd`. Retain the original installation and folder to keep settings and cache. Reload the extension, then refresh your pages.

The 0.1.0 update page does not recognize the new font files. For that upgrade, use `update.cmd` or the new standalone `unity-web-translator-updater.html` supplied with the release, selecting the original `extension` directory.

Build with Node.js 22+: `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run build`. Windows and Linux CI cover native adapters, cache isolation, background authorization and updater checks. The Unity C# example has not been compiled by this repository's CI; validate it in your own Unity project before use. Synthetic protocol tests do not certify compatibility with a third-party game.

Copyright © 2026 HappyAny. [GNU GPL v3 only](../LICENSE). This is an independent project, not an official Unity product.
