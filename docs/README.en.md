# Unity Web Translator

A Chrome / Edge extension that translates native text through an accessible Unity Web text interface. **It does not automatically translate every Unity build.**

Two adapters are included:

- Configured GET JSON string fields, intercepted before `fetch` or asynchronous `XMLHttpRequest` supplies the resource to the application.
- A cooperative Unity text bridge. The supplied `.jslib` and C# sample routes dialogue back into the application's own text components.

Text bundled in WASM, `.data`, AssetBundles or encrypted resources needs another adapter. Engine detection is diagnostic only. OCR is not included.

Download the extension ZIP from [Releases](https://github.com/HappyAny/unity-web-translator/releases/latest), extract it into a permanent directory, and load its `extension` folder with Developer mode enabled. Configure the shared provider and run the translation test. Create a profile with real [resource rules](native-adapters.md) or integrate the [Unity SDK](../examples/unity/). Select that profile in the page popup, grant access and refresh the page.

Providers, API keys, body parameters, reasoning presets, target language and switches are shared. Profiles isolate resource rules, additional prompts, automatic caches and personal translations. Seven target languages and English / Chinese settings are included. Export editable cache JSON and import personal corrections; API keys are excluded.

The popup reports actual selected and replaced text. Pausing restores active bridge bindings. Text already loaded into an application from JSON requires a page refresh to restore completely. Fonts and missing glyphs remain the Unity project's responsibility.

To update, drop a new Release ZIP into the extension's update page and select the original `extension` folder, or run `update.cmd`. Retain the original installation and folder to keep settings and cache. Reload the extension, then refresh your pages.

Build with Node.js 22+: `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run build`. Windows and Linux CI cover native adapters, cache isolation, background authorization and updater checks. The Unity C# example has not been compiled by this repository's CI; validate it in your own Unity project before use. Synthetic protocol tests do not certify compatibility with a third-party game.

Copyright © 2026 HappyAny. [GNU GPL v3 only](../LICENSE). This is an independent project, not an official Unity product.
