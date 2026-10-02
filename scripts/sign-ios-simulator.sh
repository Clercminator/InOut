#!/usr/bin/env bash
set -euo pipefail
app="$1"
entitlements=$(mktemp)
trap 'rm -f "$entitlements"' EXIT
# Simulator-only ad-hoc signing enables Keychain without inventing an Apple Team
# or using distribution credentials. Store signing remains EAS-managed.
python3 - "$app/Info.plist" "$entitlements" <<'PY'
import plistlib, sys
with open(sys.argv[1], 'rb') as source:
    info = plistlib.load(source)
if info.get('CFBundleSupportedPlatforms') != ['iPhoneSimulator']:
    raise SystemExit('Refusing simulator signing for a device build')
identifier = info['CFBundleIdentifier']
with open(sys.argv[2], 'wb') as output:
    plistlib.dump({'application-identifier': identifier,
                  'keychain-access-groups': [identifier]}, output)
PY
codesign --force --sign - --entitlements "$entitlements" "$app"
codesign --verify "$app"
