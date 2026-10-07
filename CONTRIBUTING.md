# Contributing

Use Node.js 22 or newer. Install development dependencies with `npm ci`.

Before proposing changes, run `npm run check`, `npm test`, and `npm run build`. Windows updater tests require Python 3 and PowerShell. Tests use synthetic interfaces; do not add external client scripts, personal cache files, or credentials.

Extension code lives in `extension/`. Keep page integration independent from provider configuration. New adapters must preserve original arguments and control flow, ignore stale asynchronous results, and restore text on disable or uninstall. Add behavior checks for visible text and playback rather than copying an implementation into a test.

User-facing messages belong in `i18n.mjs` with both Chinese and English text. Keep source examples generic. Documentation should explain Unity Web behavior and observable compatibility boundaries.

Public release files are explicitly listed in `scripts/files.mjs`. If a runtime dependency is added, list it there and extend structural checks. Private or generated data must never enter the release package.

Tagged releases trigger the release workflow. The workflow attaches the installable browser extension ZIP, SHA-256 checksum, and public file manifest to GitHub Releases. Keep the versions in `package.json`, `extension/manifest.json`, and the runtime consistent.

Contributions are distributed under the project's [GNU GPL version 3 only](LICENSE) (`GPL-3.0-only`) license. Preserve copyright and license notices when changing or redistributing files.
