"""Exercise the packaged native app offline through Android's accessibility tree."""
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

APP = 'com.imrtech.inout'
OUT = Path('artifacts/android-smoke')
OUT.mkdir(parents=True, exist_ok=True)

def adb(*args):
    return subprocess.check_output(['adb', *args], timeout=30).decode(errors='replace')

def tree():
    adb('shell', 'rm', '-f', '/sdcard/window.xml')
    adb('shell', 'uiautomator', 'dump', '/sdcard/window.xml')
    xml = adb('shell', 'cat', '/sdcard/window.xml')
    (OUT / 'last-screen.xml').write_text(xml)
    return ET.fromstring(xml)

def find(text, timeout=15):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        try:
            root = tree()
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ET.ParseError):
            time.sleep(.3)
            continue
        for node in root.iter('node'):
            if text in (node.get('text', '') + ' ' + node.get('content-desc', '')):
                print(f'Found {text}', flush=True)
                return node
        time.sleep(.3)
    raise AssertionError(f'Native screen did not show {text!r}')

def tap(text):
    node = find(text)
    x1, y1, x2, y2 = map(int, re.findall(r'\d+', node.attrib['bounds']))
    adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))

def scroll_to(text):
    for _ in range(7):
        try:
            find(text, 2)
            return
        except AssertionError:
            adb('shell', 'input', 'swipe', '500', '1700', '500', '500', '300')
    find(text)

def shot(name):
    (OUT / f'{name}.png').write_bytes(subprocess.check_output(['adb', 'exec-out', 'screencap', '-p']))

def launch():
    adb('shell', 'am', 'start', '-n', f'{APP}/.MainActivity')

try:
    # Capture real app screens at Google Play's recommended portrait dimensions.
    adb('shell', 'wm', 'size', '1080x1920')
    adb('shell', 'wm', 'density', '400')
    adb('install', '-r', sys.argv[1])
    adb('shell', 'svc', 'wifi', 'disable')
    adb('shell', 'svc', 'data', 'disable')
    launch()
    tap('Skip introduction')
    find("Breathe for what's next.")
    shot('01-today-offline')
    scroll_to('Physiological Sigh,')
    tap('Physiological Sigh,')
    scroll_to('Start reset')
    tap('Start reset')
    find('How tense are you right now?')
    shot('02-pre')
    tap('7 of 10')
    scroll_to('START RESET')
    tap('START RESET')
    # Avoid waiting for accessibility-tree idleness during the animated timer.
    time.sleep(2)
    shot('03-active')
    adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
    time.sleep(3)
    adb('shell', 'am', 'force-stop', APP)
    launch()
    find('PAUSED')
    shot('04-recovered')
    scroll_to('Resume')
    tap('Resume')
    time.sleep(50)
    find('How tense are you now?')
    shot('05-post')
    # The second rating remains pending across a cold launch.
    adb('shell', 'am', 'force-stop', APP)
    launch()
    find('How tense are you now?')
    tap('3 of 10')
    scroll_to('SEE MY STATE SHIFT')
    tap('SEE MY STATE SHIFT')
    find('Tension down 4 points')
    shot('06-result')
    scroll_to('VIEW HISTORY')
    tap('VIEW HISTORY')
    find('HISTORY')
    scroll_to('Tension down 4 points')
    shot('07-history')
    # Relaunch with network still disabled and check the committed result.
    adb('shell', 'am', 'force-stop', APP)
    launch()
    tap('Progress')
    scroll_to('View session history')
    tap('View session history')
    scroll_to('Tension down 4 points')
    shot('08-history-after-relaunch')
    adb('shell', 'am', 'force-stop', APP)
    launch()
    tap('Custom')
    tap('Create Pattern')
    scroll_to('Save routine')
    tap('Save routine')
    find('Saved on this phone.')
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
    tap('Saved Presets')
    find('My Pattern')
    shot('09-saved-pattern')
    adb('shell', 'am', 'force-stop', APP)
    launch()
    tap('Custom')
    tap('Saved Presets')
    find('My Pattern')
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
    tap('Create Mix')
    scroll_to('Add Physiological Sigh')
    tap('Add Physiological Sigh')
    scroll_to('Save routine')
    tap('Save routine')
    find('Saved on this phone.')
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
    tap('Saved Mixes')
    find('My Mix')
    shot('10-saved-mix')
    (OUT / 'result.txt').write_text('PASS: native offline slice, background pause, process recovery, post recovery, durable history, saved patterns and mixes.\n')
finally:
    shot('last-screen')
    (OUT / 'logcat.txt').write_text(adb('logcat', '-d'))
