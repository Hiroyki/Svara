#!/bin/sh
# Bikin APK Svara buat Android. Hasil: dist-android/Svara-<versi>.apk
# Butuh: JDK 17+, Android SDK (ANDROID_HOME atau android/local.properties), dan Python 3.12 di mesin build
# (Chaquopy butuh versi yang sama dengan Python di dalam app). Kunci rilis opsional: SVARA_KEYSTORE dkk., lihat android/app/build.gradle.kts.
set -e
cd "$(dirname "$0")"
VERSION=2.0.0
if [ -z "$SVARA_BUILD_PYTHON" ]; then
  for py in python3.12 python3 python; do
    if command -v $py >/dev/null && $py -c 'import sys; sys.exit(sys.version_info[:2] != (3, 12))' 2>/dev/null; then
      SVARA_BUILD_PYTHON=$(command -v $py); break
    fi
  done
fi
[ -n "$SVARA_BUILD_PYTHON" ] || { echo "Butuh Python 3.12 (set SVARA_BUILD_PYTHON)"; exit 1; }
export SVARA_BUILD_PYTHON
(cd android && ./gradlew --console=plain assembleRelease)
mkdir -p dist-android
cp android/app/build/outputs/apk/release/app-release.apk "dist-android/Svara-$VERSION.apk"
ls -lh "dist-android/Svara-$VERSION.apk"
