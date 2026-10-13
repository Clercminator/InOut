"""Capture unaltered Android screenshots and an isolated animation-lab recording."""
import json
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path('artifacts/pulse-native')
OUT.mkdir(parents=True, exist_ok=True)
APP = 'com.imrtech.inout'

def adb(*args):
    return subprocess.check_output(['adb', *args], timeout=40).decode(errors='replace')

def tree():
    adb('shell', 'uiautomator', 'dump', '/sdcard/pulse-window.xml')
    text = adb('shell', 'cat', '/sdcard/pulse-window.xml')
    (OUT / 'last-screen.xml').write_text(text)
    return ET.fromstring(text)

def find(label, scroll=False):
    for _ in range(24):
        root = tree()
        for node in root.iter('node'):
            if label not in node.get('text', '') + ' ' + node.get('content-desc', ''):
                continue
            b = list(map(int, re.findall(r'\d+', node.get('bounds', ''))))
            if len(b) == 4 and b[2] > b[0] and 70 <= b[1] < b[3] <= 1810:
                return b
        if scroll:
            adb('shell', 'input', 'swipe', '540', '1450', '540', '650', '350')
        time.sleep(1)
    raise AssertionError('Missing: ' + label)

def tap(label, scroll=False):
    find(label, scroll)
    time.sleep(.5)
    b = find(label, scroll)
    adb('shell', 'input', 'tap', str((b[0]+b[2])//2), str((b[1]+b[3])//2))
    print('Tapped', label, flush=True)
    return b

def shot(name):
    (OUT / (name + '.png')).write_bytes(subprocess.check_output(['adb', 'exec-out', 'screencap', '-p']))

def route(path):
    adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', 'inout://' + path, APP)
    time.sleep(2)

try:
    adb('shell', 'wm', 'size', '1080x1920')
    adb('shell', 'wm', 'density', '400')
    adb('shell', 'settings', 'put', 'system', 'font_scale', '1.0')
    adb('shell', 'cmd', 'uimode', 'night', 'yes')
    adb('shell', 'am', 'force-stop', 'com.android.launcher3')
    adb('install', '-r', sys.argv[1])
    adb('shell', 'am', 'start', '-n', APP + '/.MainActivity')
    tap('Personalize InOut')
    tap('Reduce stress & anxiety')
    tap('Continue', True)
    tap("Let's get started", True)
    tap('I understand', True)
    tap('Close subscription offer')
    find('Quick reset')
    shot('01-today-dark')
    route('protocols')
    find('Find your rhythm.')
    shot('02-protocols-dark')
    route('protocol?id=coherent')
    find('CADENCE')
    shot('03-coherent-dark')
    route('pre?id=box')
    tap('Skip rating & start', True)
    time.sleep(1)
    shot('04-box-session-dark')
    adb('shell', 'dumpsys', 'gfxinfo', APP, 'reset')
    time.sleep(10)
    (OUT / 'gfxinfo-box-unrecorded.txt').write_text(adb('shell', 'dumpsys', 'gfxinfo', APP))
    # Leaving a production session must pause it, including when opening the lab.
    route('testing')
    find('Start testing')
    shot('lab-ready')
    adb('shell', 'dumpsys', 'gfxinfo', APP, 'reset')
    b = tap('Start testing')
    adb('shell', 'dumpsys', 'gfxinfo', APP, 'reset')
    time.sleep(10)
    (OUT / 'gfxinfo-pulse-unrecorded.txt').write_text(adb('shell', 'dumpsys', 'gfxinfo', APP))
    adb('shell', 'dumpsys', 'gfxinfo', APP, 'reset')
    recording = subprocess.Popen(['adb', 'shell', 'screenrecord', '--time-limit', '12', '/sdcard/pulse.mp4'])
    time.sleep(2)
    shot('lab-inhale')
    time.sleep(5)
    shot('lab-exhale')
    recording.wait(timeout=20)
    adb('pull', '/sdcard/pulse.mp4', str(OUT / 'lab-motion.mp4'))
    (OUT / 'gfxinfo.txt').write_text(adb('shell', 'dumpsys', 'gfxinfo', APP))
    adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
    time.sleep(2)
    adb('shell', 'am', 'start', '-n', APP + '/.MainActivity')
    find('Resume')
    shot('lab-paused-after-background')
    tap('Restart')
    find('Start testing')
    tap('Still sphere', True)
    shot('lab-still')
    # Check isolation before resizing, which recreates the Android activity.
    route('session')
    find('PAUSED')
    shot('box-paused-after-lab')
    adb('shell', 'wm', 'size', '720x1280')
    adb('shell', 'wm', 'density', '360')
    # Startup recovery can first restore the paused production session.
    time.sleep(5)
    route('testing')
    time.sleep(3)
    route('testing')
    find('Start testing')
    shot('lab-compact')
    adb('shell', 'wm', 'size', '1080x1920')
    adb('shell', 'wm', 'density', '400')
    (OUT / 'result.json').write_text(json.dumps({'passed': True, 'runtime': 'Android API 35 emulator; native release build with development signing', 'screenshots': '1080x1920 PNG; unaltered screencap', 'physicalDeviceSmoothness': 'not verified'}, indent=2))
finally:
    shot('last-screen')
    (OUT / 'logcat.txt').write_text(adb('logcat', '-d'))
