import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { extensionFiles } from './files.mjs';
import { zip, unzip } from './zip.mjs';
const root = new URL('../', import.meta.url), dist = new URL('dist/', root);
const manifest = JSON.parse(await fs.readFile(new URL('extension/manifest.json', root))), version = manifest.version;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await fs.mkdir(dist, { recursive: true });
const files = [], entries = [];
for (const name of extensionFiles) {
  const bytes = await fs.readFile(new URL('extension/' + name, root));
  files.push({ name: 'extension/' + name, bytes }); entries.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
}
const update = Buffer.from(JSON.stringify({ product: 'unity-web-translator', version, files: entries }, null, 2) + '\n');
files.push({ name: 'update-files.json', bytes: update });
for (const name of ['update.cmd', 'update.ps1', 'LICENSE']) files.push({ name, bytes: await fs.readFile(new URL(name, root)) });
const updaterSources = await Promise.all(['i18n.mjs', 'updater-core.mjs', 'update.mjs'].map(name => fs.readFile(new URL('extension/' + name, root), 'utf8')));
const updaterCode = updaterSources.map(source => source.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '')).join('\n').replace(/<\/script/gi, '<\\/script');
const updaterCss = await fs.readFile(new URL('extension/update.css', root), 'utf8');
const updaterHtml = (await fs.readFile(new URL('extension/update.html', root), 'utf8'))
  .replace('<link rel="stylesheet" href="update.css">', () => '<style>' + updaterCss + '</style>')
  .replace('<script type="module" src="update.mjs"></script>', () => '<script type="module">\n' + updaterCode + '\n</script>');
const updaterName = 'unity-web-translator-updater.html', updaterBytes = Buffer.from(updaterHtml);
files.push({ name: 'update.html', bytes: updaterBytes });
await fs.writeFile(new URL(updaterName, dist), updaterBytes);
const packageName = 'unity-web-translator-v' + version + '.zip', packed = zip(files), unpacked = unzip(packed);
for (const { name, bytes } of files) if (!unpacked.get(name)?.equals(bytes)) throw new Error('Package validation failed: ' + name);
await fs.writeFile(new URL(packageName, dist), packed);
await fs.writeFile(new URL('SHA256SUMS.txt', dist), hash(packed) + '  ' + packageName + '\n' + hash(updaterBytes) + '  ' + updaterName + '\n');
await fs.writeFile(new URL('release-manifest.json', dist), JSON.stringify({ version, package: packageName, bytes: packed.length, sha256: hash(packed), updater: { file: updaterName, bytes: updaterBytes.length, sha256: hash(updaterBytes) }, files: entries, verified: true }, null, 2) + '\n');
console.log(JSON.stringify({ version, files: files.length, bytes: packed.length, package: fileURLToPath(new URL(packageName, dist)), verified: true }));
