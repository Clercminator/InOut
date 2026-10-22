#!/usr/bin/env bash
set -euo pipefail
evidence="$PWD/artifacts/app-store/ios/evidence/$CAPTURE_LANGUAGE"
mkdir -p "$evidence"
xcrun simctl list devices available -j > "$evidence/devices.json"
xcrun simctl list runtimes -j > "$evidence/runtimes.json"
runtime=$(python3 - "$evidence/runtimes.json" <<'PY'
import json,sys
runtimes = [r for r in json.load(open(sys.argv[1]))['runtimes'] if r['isAvailable'] and 'iOS' in r['name']]
print(sorted(runtimes, key=lambda r: tuple(map(int,r['version'].split('.'))))[-1]['identifier'])
PY
)
device=$(xcrun simctl create InOut-AppStore com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro "$runtime")
echo "$device" > "$evidence/device.txt"
# Configure a fresh Simulator's real system locale before first boot.
prefs="$HOME/Library/Developer/CoreSimulator/Devices/$device/data/Library/Preferences/.GlobalPreferences.plist"
mkdir -p "$(dirname "$prefs")"
if [ "$CAPTURE_LANGUAGE" = es ]; then locale=es_CL; language=es; else locale=en_US; language=en; fi
defaults write "$prefs" AppleLanguages -array "$language"
defaults write "$prefs" AppleLocale -string "$locale"
xcrun simctl boot "$device"
xcrun simctl bootstatus "$device" -b
xcrun simctl ui "$device" appearance dark
xcrun simctl status_bar "$device" override --time '9:41' --dataNetwork wifi --wifiMode active --wifiBars 3 --batteryState charged --batteryLevel 100
unzip -q artifacts/simulator/inout-simulator.zip -d artifacts/simulator/unpacked
app=$(find artifacts/simulator/unpacked -maxdepth 1 -name '*.app' -print -quit)
python3 - "$app/Info.plist" "$evidence/build.json" <<'PY'
import json,plistlib,sys,os
p=plistlib.load(open(sys.argv[1],'rb'))
assert p['CFBundleShortVersionString']=='1.2.2', p['CFBundleShortVersionString']
assert p['UIDeviceFamily']==[1], p['UIDeviceFamily']
json.dump({'version':p['CFBundleShortVersionString'],'deviceFamily':p['UIDeviceFamily'], 'sourceCommit':os.environ['GITHUB_SHA'], 'runId':os.environ['GITHUB_RUN_ID'], 'device':'iPhone 16 Pro','language':os.environ['CAPTURE_LANGUAGE']},open(sys.argv[2],'w'),indent=2)
PY
xcrun simctl install "$device" "$app"
xcrun simctl launch "$device" com.imrtech.inout
curl -fL https://github.com/mobile-dev-inc/maestro/releases/download/cli-2.10.0/maestro.zip -o "$RUNNER_TEMP/maestro.zip"
unzip -q "$RUNNER_TEMP/maestro.zip" -d "$RUNNER_TEMP/maestro"
cli=$(find "$RUNNER_TEMP/maestro" -type f -path '*/bin/maestro' -print -quit)
chmod +x "$cli"
python3 scripts/app-store-ios-flow.py "$CAPTURE_LANGUAGE" "$evidence/flow.yaml"
trap 'xcrun simctl io "$device" screenshot "$evidence/final-diagnostic.png" || true' EXIT
"$cli" --device "$device" test --test-output-dir "$evidence/maestro" --debug-output "$evidence/maestro" --format junit --output "$evidence/results.xml" "$evidence/flow.yaml"
python3 scripts/validate-app-store-ios.py "$evidence/maestro" "artifacts/app-store/ios/screenshots/$CAPTURE_LANGUAGE" "$CAPTURE_LANGUAGE"
