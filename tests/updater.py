import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'extension/manifest.json').read_text(encoding='utf-8'))['version']
metadata = json.loads((root / 'dist/release-manifest.json').read_text(encoding='utf-8'))
with tempfile.TemporaryDirectory(prefix='update-check-', dir=root / '.test-output') as folder:
    stage = Path(folder).resolve()
    assert stage.is_relative_to(root.resolve())
    package = stage / 'release'
    with zipfile.ZipFile(root / 'dist' / metadata['package']) as archive:
        assert archive.testzip() is None
        for item in archive.infolist():
            target = (package / item.filename).resolve()
            assert target.is_relative_to(package.resolve())
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.read(item))
    installed = stage / 'existing extension'
    shutil.copytree(package / 'extension', installed)
    manifest = json.loads((installed / 'manifest.json').read_text(encoding='utf-8'))
    manifest['version'] = '0.0.1'
    manifest['key'] = 'TEST_PUBLIC_KEY_PRESERVE'
    (installed / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
    (installed / 'personal-sentinel.json').write_text('PRESERVE_USER_FILE', encoding='utf-8')
    def update(path):
        return subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', str(package / 'update.ps1'), '-TargetDirectory', str(path)], capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=40)
    applied = update(installed)
    assert applied.returncode == 0, applied.stderr
    current = json.loads((installed / 'manifest.json').read_text(encoding='utf-8'))
    assert current['version'] == version and current['key'] == 'TEST_PUBLIC_KEY_PRESERVE'
    assert (installed / 'personal-sentinel.json').read_text(encoding='utf-8') == 'PRESERVE_USER_FILE'
    backups = list((installed / '.unity-update-backups').glob('*/manifest.json'))
    assert len(backups) == 1 and json.loads(backups[0].read_text(encoding='utf-8'))['version'] == '0.0.1'
    files = json.loads((package / 'update-files.json').read_text(encoding='utf-8'))['files']
    for entry in files:
        if entry['path'] != 'manifest.json':
            assert hashlib.sha256((installed / entry['path']).read_bytes()).hexdigest() == entry['sha256']
    unrelated = stage / 'unrelated'
    unrelated.mkdir()
    (unrelated / 'manifest.json').write_text('{"background":{"service_worker":"other.js"}}', encoding='utf-8')
    assert update(unrelated).returncode != 0 and not (unrelated / '.unity-update-backups').exists()
    before = hashlib.sha256((installed / 'engine.mjs').read_bytes()).hexdigest()
    (package / 'extension/engine.mjs').write_text('TAMPERED_SOURCE', encoding='utf-8')
    assert update(installed).returncode != 0 and hashlib.sha256((installed / 'engine.mjs').read_bytes()).hexdigest() == before
    assert stage.is_relative_to(root.resolve())
print('Windows updater: same-directory update, identity preservation, backup, unrelated-folder rejection, and source tamper checks passed.')
