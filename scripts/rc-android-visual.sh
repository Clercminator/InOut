#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts/rc-visual/light
trap 'adb logcat -d > artifacts/rc-visual/logcat.txt; adb exec-out screencap -p > artifacts/rc-visual/final.png' EXIT
apk=$(find artifacts/app -name app-release.apk -print -quit)
adb install -r "$apk"
adb shell cmd uimode night no
if [ "$VIEWPORT" = small-large-text ]; then
  adb shell wm size 720x1280
  adb shell wm density 360
  adb shell settings put system font_scale 1.6
else
  adb shell wm size 1080x1920
  adb shell wm density 400
fi
adb shell wm size > artifacts/rc-visual/device.txt
adb shell wm density >> artifacts/rc-visual/device.txt
adb shell settings get system font_scale >> artifacts/rc-visual/device.txt
"$MAESTRO_BIN" test --test-output-dir artifacts/rc-visual/light --debug-output artifacts/rc-visual/light --format junit --output artifacts/rc-visual/light/results.xml .maestro/rc-visual.yaml
adb shell cmd uimode night yes
adb shell am start -a android.intent.action.VIEW -d inout://profile com.imrtech.inout
sleep 3
adb exec-out screencap -p > artifacts/rc-visual/dark-profile.png
package_path=$(adb shell pm path com.imrtech.inout | head -1 | tr -d '\r' | sed 's/^package://;s@/base.apk$@@')
adb shell du -sk "$package_path" > artifacts/rc-visual/installed-code-kib.txt
