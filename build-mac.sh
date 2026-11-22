#!/bin/sh
# Bikin Svara.app (native Mac) terus pasang ke ~/Applications
set -e
cd "$(dirname "$0")"
APP=dist/Svara.app
rm -rf dist && mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/web" dist/AppIcon.iconset

VERSION=2.0.0
# Universal: Apple Silicon + Intel
for arch in arm64 x86_64; do
  swiftc -O -target $arch-apple-macos13 mac/main.swift -o "dist/Svara-$arch" -framework Cocoa -framework WebKit
done
lipo -create dist/Svara-arm64 dist/Svara-x86_64 -output "$APP/Contents/MacOS/Svara"
rm dist/Svara-arm64 dist/Svara-x86_64

cp index.html style.css app.js db.js sw.js manifest.webmanifest server.py ytworker.py favicon.png icon-192.png icon-512.png "$APP/Contents/Resources/web/"
cp -R assets "$APP/Contents/Resources/web/"

# Ikon: kotak gelap bersudut bulat sesuai grid ikon macOS, logo di tengah
python3 - <<'PY'
from PIL import Image, ImageDraw
logo = Image.open('assets/logo.png').convert('RGBA')
c = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
bg = Image.new('RGBA', (824, 824), (0, 0, 0, 0))
ImageDraw.Draw(bg).rounded_rectangle((0, 0, 823, 823), radius=185, fill=(26, 25, 34, 255))
c.alpha_composite(bg, (100, 100))
l = logo.copy(); l.thumbnail((600, 600), Image.LANCZOS)
c.alpha_composite(l, ((1024 - l.width) // 2, (1024 - l.height) // 2))
for s in (16, 32, 128, 256, 512):
    c.resize((s, s), Image.LANCZOS).save(f'dist/AppIcon.iconset/icon_{s}x{s}.png')
    c.resize((s * 2, s * 2), Image.LANCZOS).save(f'dist/AppIcon.iconset/icon_{s}x{s}@2x.png')
PY
iconutil -c icns dist/AppIcon.iconset -o "$APP/Contents/Resources/AppIcon.icns"

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
rm -rf dist/dmg && mkdir -p dist/dmg
cp -R "$APP" dist/dmg/
ln -s /Applications dist/dmg/Applications
cat > "dist/dmg/Baca dulu - Read me.txt" <<'TXT'
SVARA untuk macOS
=================

1) Seret Svara ke folder Applications.
2) Pasang pembantunya sekali (butuh Homebrew, https://brew.sh):
     brew install yt-dlp ffmpeg deno
3) Pertama kali buka: klik kanan Svara -> Open -> Open.
   Masih diblokir? System Settings -> Privacy & Security -> Open Anyway.

-----------------------------------------------------------------

1) Drag Svara into Applications.
2) Install the helpers once (needs Homebrew, https://brew.sh):
     brew install yt-dlp ffmpeg deno
3) First launch: right-click Svara -> Open -> Open.
   Still blocked? System Settings -> Privacy & Security -> Open Anyway.

https://github.com/Hiroyki/Svara
TXT
hdiutil create -quiet -volname "Svara $VERSION" -srcfolder dist/dmg -ov -format UDZO "dist/Svara-$VERSION.dmg"
rm -rf dist/dmg
echo "DMG: dist/Svara-$VERSION.dmg"
# App nama lama dibuang biar nggak dobel; bundle ID sama, jadi data tetap kebawa
rm -rf "$HOME/Applications/Senandung.app" "$HOME/Applications/Svara.app"
mkdir -p "$HOME/Applications"
cp -R "$APP" "$HOME/Applications/"
echo "Terpasang: $HOME/Applications/Svara.app"
