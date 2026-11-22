#!/bin/sh
# Bikin Svara.app (universal, Apple Silicon + Intel) + DMG-nya, terus pasang ke ~/Applications.
# Python, yt-dlp, deno, dan ffmpeg ikut dibundel, jadi pengguna nggak perlu Homebrew.
# Naikin versi di bawah kalau YouTube berubah.
set -e
cd "$(dirname "$0")"
# Dirakit di disk sementara (SSD internal): codesign ribuan file di volume terenkripsi bisa makan setengah jam
WORK=$(mktemp -d "${TMPDIR:-/tmp}/svara-build.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
APP="$WORK/Svara.app"
rm -rf dist && mkdir -p dist "$APP/Contents/MacOS" "$APP/Contents/Resources/web" "$WORK/AppIcon.iconset"

VERSION=2.0.0
PYTHON=3.13.18
PBS=20261110   # rilis python-build-standalone
DENO=2.9.8
# Universal: Apple Silicon + Intel
for arch in arm64 x86_64; do
  swiftc -O -target $arch-apple-macos13 mac/main.swift -o "$WORK/Svara-$arch" -framework Cocoa -framework WebKit
done
lipo -create "$WORK/Svara-arm64" "$WORK/Svara-x86_64" -output "$APP/Contents/MacOS/Svara"

cp index.html style.css app.js db.js sw.js manifest.webmanifest server.py ytworker.py favicon.png icon-192.png icon-512.png "$APP/Contents/Resources/web/"
cp -R assets "$APP/Contents/Resources/web/"

# ---------- runtime bawaan: Resources/runtime/<arch>/{python,bin} ----------
CACHE=mac/.cache
mkdir -p "$CACHE"
fetch() { [ -f "$CACHE/$2" ] || { curl -fsSL --retry 3 -o "$CACHE/$2.tmp" "$1" && mv "$CACHE/$2.tmp" "$CACHE/$2"; }; }
for arch in arm64 x86_64; do
  case $arch in
    arm64)  triple=aarch64-apple-darwin; ff=arm64 ;;
    x86_64) triple=x86_64-apple-darwin;  ff=amd64 ;;
  esac
  fetch "https://github.com/astral-sh/python-build-standalone/releases/download/$PBS/cpython-$PYTHON+$PBS-$triple-install_only_stripped.tar.gz" "python-$PYTHON-$arch.tar.gz"
  fetch "https://github.com/denoland/deno/releases/download/v$DENO/deno-$triple.zip" "deno-$DENO-$arch.zip"
  fetch "https://ffmpeg.martin-riedl.de/redirect/latest/macos/$ff/release/ffmpeg.zip" "ffmpeg-$arch.zip"

  RT="$APP/Contents/Resources/runtime/$arch"
  mkdir -p "$RT/bin"
  tar -xzf "$CACHE/python-$PYTHON-$arch.tar.gz" -C "$RT"
  SP="$RT/python/lib/python$(echo "$PYTHON" | cut -d. -f1,2)/site-packages"
  uv pip install --quiet --no-config --target "$SP" --python-platform "$triple" \
    --python-version "$(echo "$PYTHON" | cut -d. -f1,2)" --only-binary :all: --no-compile 'yt-dlp[default]'
  rm -rf "$SP/bin"
  # Buang bagian Python yang nggak kepakai (test suite, GUI Tk, IDLE, header C): ribuan file lebih sedikit
  PL="$RT/python/lib/python$(echo "$PYTHON" | cut -d. -f1,2)"
  rm -rf "$PL/test" "$PL/idlelib" "$PL/tkinter" "$PL/turtledemo" "$PL/ensurepip" "$PL/lib2to3" \
    "$PL"/config-* "$RT/python/include" "$RT/python/share" "$RT/python/lib/itcl"* "$RT/python/lib/tcl"* \
    "$RT/python/lib/tk"* "$RT/python/lib/thread"* "$PL/lib-dynload/_tkinter"* \
    "$RT/python/lib/libtcl"* "$RT/python/lib/libtk"*
  unzip -q -o -j "$CACHE/deno-$DENO-$arch.zip" deno -d "$RT/bin"
  unzip -q -o -j "$CACHE/ffmpeg-$arch.zip" ffmpeg -d "$RT/bin"
  chmod +x "$RT/bin/deno" "$RT/bin/ffmpeg"
done

# .pyc dibikin sekarang (isinya sama buat dua arsitektur), biar app nggak nulis ke bundle pas jalan
HOSTPY="$APP/Contents/Resources/runtime/$(uname -m | sed 's/aarch64/arm64/')/python/bin/python3"
for arch in arm64 x86_64; do
  "$HOSTPY" -I -m compileall -q -j0 "$APP/Contents/Resources/runtime/$arch/python/lib" >/dev/null || true
done

# Semua Mach-O di runtime ditandatangani ad-hoc (wajib buat jalan di Apple Silicon)
find "$APP/Contents/Resources/runtime" -type f \( -perm -u+x -o -name '*.so' -o -name '*.dylib' \) | while read -r f; do
  if file -b "$f" | grep -q Mach-O; then codesign --force -s - "$f" 2>/dev/null; fi
done

# Ikon: kotak gelap bersudut bulat sesuai grid ikon macOS, logo di tengah
python3 - "$WORK" <<'PY'
import sys
from PIL import Image, ImageDraw
work = sys.argv[1]
logo = Image.open('assets/logo.png').convert('RGBA')
c = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
bg = Image.new('RGBA', (824, 824), (0, 0, 0, 0))
ImageDraw.Draw(bg).rounded_rectangle((0, 0, 823, 823), radius=185, fill=(26, 25, 34, 255))
c.alpha_composite(bg, (100, 100))
l = logo.copy(); l.thumbnail((600, 600), Image.LANCZOS)
c.alpha_composite(l, ((1024 - l.width) // 2, (1024 - l.height) // 2))
for s in (16, 32, 128, 256, 512):
    c.resize((s, s), Image.LANCZOS).save(f'{work}/AppIcon.iconset/icon_{s}x{s}.png')
    c.resize((s * 2, s * 2), Image.LANCZOS).save(f'{work}/AppIcon.iconset/icon_{s}x{s}@2x.png')
PY
iconutil -c icns "$WORK/AppIcon.iconset" -o "$APP/Contents/Resources/AppIcon.icns"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Svara</string>
  <key>CFBundleDisplayName</key><string>Svara</string>
  <key>CFBundleIdentifier</key><string>site.faquloh.senandung</string>
  <key>CFBundleExecutable</key><string>Svara</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.music</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict></plist>
PLIST

codesign --force --deep -s - "$APP"

# DMG buat dibagiin: seret Svara ke Applications
mkdir -p "$WORK/dmg"
cp -R "$APP" "$WORK/dmg/"
ln -s /Applications "$WORK/dmg/Applications"
cat > "$WORK/dmg/Read me.txt" <<'TXT'
SVARA for macOS
===============

1) Drag Svara into Applications.
2) Open Svara. If macOS says it can't verify the developer:
   System Settings -> Privacy & Security -> scroll down -> Open Anyway.

That's it. Everything Svara needs is already inside the app.

https://github.com/Hiroyki/Svara
TXT
hdiutil create -quiet -volname "Svara $VERSION" -srcfolder "$WORK/dmg" -ov -format ULMO "$WORK/Svara-$VERSION.dmg"  # LZMA: ~20% lebih kecil dari UDZO
cp "$WORK/Svara-$VERSION.dmg" dist/
echo "DMG: dist/Svara-$VERSION.dmg ($(du -h "dist/Svara-$VERSION.dmg" | cut -f1))"

# App nama lama dibuang biar nggak dobel; bundle ID sama, jadi data tetap kebawa
rm -rf "$HOME/Applications/Senandung.app" "$HOME/Applications/Svara.app"
mkdir -p "$HOME/Applications"
ditto "$APP" "$HOME/Applications/Svara.app"
ditto "$APP" dist/Svara.app
echo "Terpasang: $HOME/Applications/Svara.app"
