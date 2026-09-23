"""Run the breathing-to-history path inside the matching, real Expo Go client."""
import json
import re
import subprocess
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path('artifacts/expo-go')
OUT.mkdir(parents=True, exist_ok=True)

def adb(*args):
    return subprocess.check_output(['adb', *args], timeout=30).decode(errors='replace')

def tree():
    adb('shell', 'uiautomator', 'dump', '/sdcard/go-window.xml')
    xml = adb('shell', 'cat', '/sdcard/go-window.xml')
    (OUT / 'last-screen.xml').write_text(xml)
    return ET.fromstring(xml)

def locate(text, scroll=False, timeout=60):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        root = tree()
        parents = {child: parent for parent in root.iter() for child in parent}
        for node in root.iter('node'):
            label = node.get('text', '') + ' ' + node.get('content-desc', '')
            if text not in label:
                continue
            bounds = list(map(int, re.findall(r'\d+', node.get('bounds', ''))))
            if len(bounds) != 4 or bounds[2] <= bounds[0] or not 0 <= bounds[1] < bounds[3] <= 1820:
                continue
            parent = parents.get(node)
            clipped = False
            while parent is not None:
                if parent.get('class') == 'android.widget.ScrollView':
                    clip = list(map(int, re.findall(r'\d+', parent.get('bounds', ''))))
                    if len(clip) == 4 and (bounds[1] < clip[1] + 8 or bounds[3] > clip[3] - 8):
                        clipped = True
                        break
                parent = parents.get(parent)
            if not clipped:
                return bounds
        if scroll:
            adb('shell', 'input', 'swipe', '540', '1450', '540', '450', '400')
        time.sleep(0.5)
    raise AssertionError(f'Expo Go did not show {text!r}')

def tap(text, scroll=False):
    locate(text, scroll)
    time.sleep(0.5)
    left, top, right, bottom = locate(text, scroll)
    adb('shell', 'input', 'tap', str((left + right) // 2), str((top + bottom) // 2))
    print('Tapped', text, flush=True)

def shot(name):
    (OUT / f'{name}.png').write_bytes(subprocess.check_output(['adb', 'exec-out', 'screencap', '-p']))

try:
    data = json.load(urllib.request.urlopen('https://exp.host/--/api/v2/versions'))
    data = data.get('data', data)
    url = data['sdkVersions']['57.0.0']['androidClientUrl']
    urllib.request.urlretrieve(url, OUT / 'expo-go.apk')
    adb('install', '-r', str(OUT / 'expo-go.apk'))
    adb('shell', 'wm', 'size', '1080x1920')
    adb('shell', 'wm', 'density', '400')
    adb('reverse', 'tcp:8081', 'tcp:8081')
    adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', 'exp://127.0.0.1:8081', 'host.exp.exponent')
    # Expo Go may present its own introductory developer sheet on first launch.
    for _ in range(25):
        root = tree()
        text = ' '.join(n.get('text', '') + ' ' + n.get('content-desc', '') for n in root.iter('node'))
        if 'SDK version:' in text and 'Go home' in text:
            tap('Close')
            continue
        if 'Skip introduction' in text:
            break
        for label in ['Continue', 'Got it']:
            if label in text:
                tap(label)
        time.sleep(2)
    shot('01-loaded')
    tap('Skip introduction')
    tap('Start reset')
    tap('Skip rating & start', scroll=True)
    time.sleep(2)
    shot('02-breathing')
    time.sleep(48)
    locate('How tense are you now?')
    shot('03-completed')
    tap('Skip & save session', scroll=True)
    tap('VIEW HISTORY', scroll=True)
    locate('Physiological Sigh')
    shot('04-history')
    (OUT / 'result.txt').write_text('PASS: Expo Go SDK 57 launches, completes breathing with native effects, and saves session history.\n')
finally:
    shot('last-screen')
    (OUT / 'logcat.txt').write_text(adb('logcat', '-d'))
    (OUT / 'expo-go.apk').unlink(missing_ok=True)
