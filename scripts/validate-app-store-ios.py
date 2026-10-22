"""Validate native screenshots, removing only a fully opaque alpha channel."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

source, destination, language = sys.argv[1:]
source, destination = Path(source), Path(destination)
destination.mkdir(parents=True, exist_ok=True)
names = ['01-home', '02-breathing-session', '03-protocol-library', '04-challenges', '05-results']
results = []
for name in names:
    matches = list(source.rglob(name + '.png'))
    if len(matches) != 1:
        raise ValueError(f'Expected one authentic capture for {name}, found {len(matches)}')
    raw = matches[0]
    with Image.open(raw) as image:
        image.load()
        if image.format != 'PNG' or image.size not in [(1206, 2622), (1179, 2556)]:
            raise ValueError(f'Invalid native PNG dimensions: {raw}: {image.size}')
        if 'A' in image.getbands() and image.getchannel('A').getextrema() != (255, 255):
            raise ValueError(f'Capture contains transparent pixels: {raw}')
        rgb = image.convert('RGB')
        path = destination / (name + '.png')
        rgb.save(path, format='PNG')
        with Image.open(path) as check:
            assert check.mode == 'RGB' and check.size == image.size
            assert check.tobytes() == rgb.tobytes(), 'Export changed interface pixels'
        results.append({'file': f'{language}/{path.name}', 'width': image.width, 'height': image.height,
                        'format': 'PNG', 'mode': 'RGB', 'alpha': False,
                        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                        'raw_sha256': hashlib.sha256(raw.read_bytes()).hexdigest(),
                        'rgb_pixels_preserved': True})
(destination / 'validation.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, indent=2))
