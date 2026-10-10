"""Check the packaged Android identity, permissions, target SDK and native alignment."""
import os
import json
from pathlib import Path
import re
import struct
import subprocess
import sys
import zipfile


def check_elf(data, name):
    if data[:6] != b'\x7fELF\x02\x01':
        raise ValueError(f'{name}: expected a little-endian 64-bit ELF')
    offset = struct.unpack_from('<Q', data, 32)[0]
    size, count = struct.unpack_from('<HH', data, 54)
    loads = 0
    for index in range(count):
        kind, _, file_offset, virtual, _, _, memory_size, alignment = struct.unpack_from(
            '<IIQQQQQQ', data, offset + size * index)
        if kind == 1:
            loads += 1
            if alignment < 16384 or (virtual - file_offset) % 16384:
                raise ValueError(f'{name}: LOAD segment is not 16 KB aligned')
        if kind == 0x6474e552 and (virtual + memory_size) % 16384:
            raise ValueError(f'{name}: GNU_RELRO end is not 16 KB aligned')
    if not loads:
        raise ValueError(f'{name}: no LOAD segments')


def main():
    apk = Path(sys.argv[1]).resolve()
    sdk = os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT')
    if not sdk:
        raise ValueError('ANDROID_HOME or ANDROID_SDK_ROOT is required')
    suffix = '.exe' if os.name == 'nt' else ''
    build_tools = Path(sdk) / 'build-tools' / '36.0.0'
    badging = subprocess.check_output([str(build_tools / f'aapt{suffix}'), 'dump', 'badging', str(apk)], text=True)
    app = json.loads((Path(__file__).resolve().parents[1] / 'apps/mobile/app.json').read_text())['expo']
    identity = rf"^package: name='{re.escape(app['android']['package'])}' .*versionName='{re.escape(app['version'])}'"
    if not re.search(identity, badging, re.M):
        raise ValueError('Unexpected package identity/version')
    target = re.search(r"^targetSdkVersion:'(\d+)'", badging, re.M)
    if not target or int(target[1]) < 36:
        raise ValueError('Google Play requires target SDK 36 or higher')
    if 'application-debuggable' in badging:
        raise ValueError('Release artifact must not be debuggable')
    permissions = set(re.findall(r"uses-permission[^:]*: name='([^']+)'", badging))
    forbidden = {'RECORD_AUDIO', 'CAMERA', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE',
                 'READ_MEDIA_AUDIO', 'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'SYSTEM_ALERT_WINDOW'}
    unexpected = permissions & {f'android.permission.{name}' for name in forbidden}
    if unexpected:
        raise ValueError(f'Unexpected sensitive permissions: {sorted(unexpected)}')
    libraries = []
    with zipfile.ZipFile(apk) as archive:
        for name in archive.namelist():
            if re.fullmatch(r'lib/(arm64-v8a|x86_64)/[^/]+\.so', name):
                check_elf(archive.read(name), name)
                libraries.append(name)
    if not any('/arm64-v8a/' in name for name in libraries):
        raise ValueError('Missing arm64 native libraries')
    subprocess.run([str(build_tools / f'zipalign{suffix}'), '-c', '-P', '16', '4', str(apk)], check=True)
    print(f'Android package verified: API {target[1]}, non-debuggable, permissions checked, '
          f'{len(libraries)} native libraries aligned for 16 KB pages.')
    print('This check does not verify store signing, billing, consent, or physical-device acceptance.')


if __name__ == '__main__':
    main()
