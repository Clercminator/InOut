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

def bounds(node):
    return tuple(map(int, re.findall(r'\d+', node.attrib['bounds'])))

def visible_target(root, text, class_name=None):
    parents = {child: parent for parent in root.iter() for child in parent}
    for node in root.iter('node'):
        if class_name and node.get('class') != class_name:
            continue
        if text not in (node.get('text', '') + ' ' + node.get('content-desc', '')):
            continue
        left, top, right, bottom = bounds(node)
        if right <= left or bottom <= top:
            continue
        ancestor = parents.get(node)
        while ancestor is not None:
            if ancestor.get('class') == 'android.widget.ScrollView':
                _, clip_top, _, clip_bottom = bounds(ancestor)
                # A sliver in the accessibility tree is not a usable tap target.
                if top < clip_top + 12 or bottom > clip_bottom - 12:
                    break
            ancestor = parents.get(ancestor)
        else:
            return node
    return None

def find(text, timeout=15, class_name=None):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        try:
            root = tree()
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ET.ParseError):
            time.sleep(.3)
            continue
        node = visible_target(root, text, class_name)
        if node is not None:
            print(f'Found {text}', flush=True)
            return node
        time.sleep(.3)
    raise AssertionError(f'Native screen did not show {text!r}')

def tap(text, class_name=None):
    node = find(text, class_name=class_name)
    # Wait for scroll momentum/layout to settle before using screen coordinates.
    for _ in range(5):
        time.sleep(.4)
        settled = find(text, class_name=class_name)
        if bounds(settled) == bounds(node):
            break
        node = settled
    else:
        raise AssertionError(f'Tap target kept moving: {text!r}')
    x1, y1, x2, y2 = bounds(settled)
    print(f'Tap {text}: {bounds(settled)}', flush=True)
    adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))

def scroll_to(text, class_name=None):
    for _ in range(20):
        try:
            find(text, 2, class_name)
            return
        except AssertionError:
            root = tree()
            area = next(node for node in root.iter('node') if node.get('class') == 'android.widget.ScrollView' and node.get('scrollable') == 'true')
            left, top, right, bottom = map(int, re.findall(r'\d+', area.attrib['bounds']))
            x = str((left + right) // 2)
            adb('shell', 'input', 'swipe', x, str(top + (bottom-top)*4//5), x, str(top + (bottom-top)//5), '300')
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
    find('HISTORY')
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
    # Exercise the progress refinements on a compact phone with large text.
    adb('shell', 'wm', 'size', '720x1280')
    adb('shell', 'wm', 'density', '360')
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.6')
    adb('shell', 'am', 'force-stop', APP)
    launch()
    tap('Progress')
    find('CURRENT STREAK')
    shot('11-progress-small-large-text')
    scroll_to('See all stats')
    tap('See all stats')
    find('MY STATS')
    shot('12-stats-small-large-text')
    tap('Weeks')
    scroll_to('TIME PER WEEK')
    shot('13-chart-small-large-text')
    scroll_to('Previous period')
    tap('Previous period')
    shot('14-chart-selected-period')
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
    scroll_to('Add session')
    tap('Add session')
    scroll_to('Minutes', 'android.widget.EditText')
    tap('Minutes', 'android.widget.EditText')
    shot('15-manual-keyboard')
    scroll_to('Done editing')
    tap('Done editing')
    scroll_to('Choose date')
    tap('Choose date')
    shot('16-native-date-picker')
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
    tap('Choose time')
    shot('17-native-time-picker')
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK')
    scroll_to('Save session')
    tap('Save session')
    find('Session saved')
    shot('18-manual-saved')
    scroll_to('View session history')
    tap('View session history')
    scroll_to('Manually logged')
    shot('19-manual-history')
    # Repeat the chart at normal font size without horizontal scrolling.
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
    adb('shell', 'am', 'force-stop', APP)
    launch()
    tap('Progress')
    scroll_to('See all stats')
    tap('See all stats')
    scroll_to('TIME PER DAY')
    shot('20-chart-compact')
    (OUT / 'result.txt').write_text('PASS: native offline slice, background pause, process recovery, post recovery, durable history, saved patterns and mixes, progress detail navigation, compact phone, large text, charts, native picker cancellation, keyboard, manual session save and logs.\n')
finally:
    shot('last-screen')
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
    adb('shell', 'wm', 'size', 'reset')
    adb('shell', 'wm', 'density', 'reset')
    (OUT / 'logcat.txt').write_text(adb('logcat', '-d'))
