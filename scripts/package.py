from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
files = ['index.html', 'styles.css', 'engine.js', 'view.js', 'app.js', 'assets/atelier.svg', 'assets/mark.svg', 'package.json', 'package-lock.json', 'playwright.config.cjs', '.gitignore', 'README.md', 'CHANGELOG.md']
for folder in ['scripts', 'tests', 'docs']:
    for item in sorted((root / folder).rglob('*')):
        if item.is_symlink():
            raise RuntimeError('Symlink denied')
        if item.is_file():
            if item.suffix not in ['.md', '.js', '.cjs', '.py']:
                raise RuntimeError('Unexpected source file: ' + str(item))
            files.append(str(item.relative_to(root)))
artifacts = root / 'artifacts'
if artifacts.is_symlink():
    raise RuntimeError('Unsafe artifacts directory')
artifacts.mkdir(exist_ok=True)
output = artifacts / 'Potion-Atelier-source.zip'
if output.is_symlink():
    raise RuntimeError('Unsafe output')
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for name in files:
        p = root / name
        if p.is_symlink() or not p.resolve().is_relative_to(root):
            raise RuntimeError('Unsafe source')
        archive.write(p, name)
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert set(archive.namelist()) == set(files)
print('Packaged and verified', len(files), 'source files:', output)
