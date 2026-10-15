from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
asset_folder = 'dist' if (root / 'dist' / 'index.html').exists() else 'prototype'
destination = root / asset_folder / 'HDB_Game_v1_Source.zip'
paths = [root / 'README.md', root / 'package.json']
if (root / 'vercel.json').exists():
    paths.append(root / 'vercel.json')
for folder in [asset_folder, 'docs', 'scripts', 'tests']:
    paths.extend(p for p in (root / folder).rglob('*') if p.is_file() and p.suffix not in ['.zip', '.pyc'] and '__pycache__' not in p.parts)
with ZipFile(destination, 'w', compression=ZIP_DEFLATED, compresslevel=9) as archive:
    for path in sorted(set(paths)):
        archive.write(path, Path('HDB_Game_v1') / path.relative_to(root))
print(f'Created offline/source package: {destination.name} ({destination.stat().st_size} bytes)')
