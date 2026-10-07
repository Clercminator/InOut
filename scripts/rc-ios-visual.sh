#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts/rc-visual/light
curl -fL https://github.com/mobile-dev-inc/maestro/releases/download/cli-2.10.0/maestro.zip -o "$RUNNER_TEMP/maestro.zip"
unzip -q "$RUNNER_TEMP/maestro.zip" -d "$RUNNER_TEMP/maestro"
cli=$(find "$RUNNER_TEMP/maestro" -type f -path '*/bin/maestro' -print -quit)
chmod +x "$cli"
xcrun simctl list devices available -j > artifacts/rc-visual/devices.json
if [ "$VIEWPORT" = compact ]; then
  runtime=$(python3 -c 'import json; print(next(k for k,v in json.load(open("artifacts/rc-visual/devices.json"))["devices"].items() if any("iPhone" in d["name"] for d in v)))')
  device=$(xcrun simctl create InOut-Compact com.apple.CoreSimulator.SimDeviceType.iPhone-SE-3rd-generation "$runtime")
else
  device=$(python3 -c 'import json; print(next(d["udid"] for group in json.load(open("artifacts/rc-visual/devices.json"))["devices"].values() for d in group if "iPhone" in d["name"]))')
fi
echo "$device" > artifacts/rc-visual/device.txt
xcrun simctl boot "$device"
xcrun simctl bootstatus "$device" -b
trap 'xcrun simctl io "$device" screenshot artifacts/rc-visual/final.png' EXIT
unzip -q artifacts/app/inout-simulator.zip -d artifacts/app/unpacked
app=$(find artifacts/app/unpacked -maxdepth 1 -name '*.app' -print -quit)
du -sk "$app" > artifacts/rc-visual/app-size-kib.txt
xcrun simctl install "$device" "$app"
xcrun simctl ui "$device" appearance light
export MAESTRO_DRIVER_STARTUP_TIMEOUT=600000
xcrun simctl launch "$device" com.imrtech.inout
sleep 15
"$cli" --device "$device" test --test-output-dir artifacts/rc-visual/light --debug-output artifacts/rc-visual/light --format junit --output artifacts/rc-visual/light/results.xml .maestro/rc-visual.yaml
xcrun simctl ui "$device" appearance dark
xcrun simctl openurl "$device" inout://profile
sleep 3
xcrun simctl io "$device" screenshot artifacts/rc-visual/dark-profile.png
