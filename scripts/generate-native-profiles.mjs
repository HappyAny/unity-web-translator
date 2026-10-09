// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import '../extension/native-labels.js';
import { generateProfile } from './native-profile.mjs';
const args = process.argv.slice(2);
if (args.length < 3 || args[0] !== '--output') {
  console.error('Usage: node scripts/generate-native-profiles.mjs --output <profile.js> <verified.wasm> [...]');
  process.exit(1);
}
const profiles = [];
for (const path of args.slice(2)) {
  const bytes = new Uint8Array(await fs.readFile(path));
  const hash = createHash('sha256').update(bytes).digest('hex');
  const spec = globalThis.__UnityNativeLabels.builds.find(build => build.sha256 === hash);
  if (!spec) throw new Error('A verified hook/layout plan is required to generate a structural profile');
  const profile = await generateProfile(bytes, spec); profiles.push(profile);
  console.log(JSON.stringify({ template: hash, nodes: profile.nodes.length, hooks: profile.hooks.length, helpers: Object.keys(profile.exports).length }));
}
await fs.writeFile(args[1], '// Copyright (C) 2026 HappyAny. SPDX-License-Identifier: GPL-3.0-only\n(function (root) {\n  \'use strict\';\n  if (!root.__UnityNativeProfiles) root.__UnityNativeProfiles = Object.freeze(' + JSON.stringify(profiles, null, 2) + ');\n})(globalThis);\n');
