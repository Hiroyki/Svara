#!/bin/sh
# Bikin Svara.exe (Windows x64) + installer-nya dari Mac. Hasil: dist-windows/Svara.exe & Svara-Setup-<versi>.exe
# Python, yt-dlp, deno, dan ffmpeg ikut dibundel. Naikin versi di bawah kalau YouTube berubah.
set -e
cd "$(dirname "$0")"

VERSION=2.0.0
PYTHON=3.13.9
DENO=2.9.8
FFMPEG=9.1

CACHE=windows/.cache
STAGE=windows/.stage
mkdir -p "$CACHE"
rm -rf "$STAGE" && mkdir -p "$STAGE/app" "$STAGE/python" "$STAGE/bin"

fetch() { [ -f "$CACHE/$2" ] || { curl -fL --retry 3 -o "$CACHE/$2.tmp" "$1" && mv "$CACHE/$2.tmp" "$CACHE/$2"; }; }
fetch "https://www.python.org/ftp/python/$PYTHON/python-$PYTHON-embed-amd64.zip" "python-$PYTHON.zip"
fetch "https://github.com/denoland/deno/releases/download/v$DENO/deno-x86_64-pc-windows-msvc.zip" "deno-$DENO.zip"
# Build ffmpeg gyan.dev lewat mirror GitHub-nya (server gyan.dev sering lemot banget)
fetch "https://github.com/GyanD/codexffmpeg/releases/download/$FFMPEG/ffmpeg-$FFMPEG-essentials_build.zip" "ffmpeg-$FFMPEG.zip"

# Isi app
cp index.html style.css app.js db.js sw.js manifest.webmanifest server.py ytworker.py favicon.png icon-192.png icon-512.png icon.svg "$STAGE/app/"
cp -R assets "$STAGE/app/"

# Python portabel + yt-dlp (wheel Windows, cuma dibongkar, nggak dijalanin di Mac)
unzip -q "$CACHE/python-$PYTHON.zip" -d "$STAGE/python"
PYTAG=$(echo "$PYTHON" | cut -d. -f1,2 | tr -d .)
printf 'python%s.zip\r\n.\r\nLib\\site-packages\r\n' "$PYTAG" > "$STAGE/python/python$PYTAG._pth"
uv pip install --quiet --no-config --target "$STAGE/python/Lib/site-packages" \
  --python-platform x86_64-pc-windows-msvc --python-version "$(echo "$PYTHON" | cut -d. -f1,2)" \
  --only-binary :all: --no-compile 'yt-dlp[default]'
rm -rf "$STAGE/python/Lib/site-packages/bin" "$STAGE/python/Lib/site-packages/Scripts"

# Deno (dipakai yt-dlp buat tantangan JS YouTube) + ffmpeg (nyimpen lagu offline)
unzip -q -j "$CACHE/deno-$DENO.zip" deno.exe -d "$STAGE/bin"
unzip -q -j "$CACHE/ffmpeg-$FFMPEG.zip" '*/bin/ffmpeg.exe' -d "$STAGE/bin"

# Payload yang ditanam ke exe; id-nya berubah kalau isinya berubah, jadi app tahu harus bongkar ulang
(cd "$STAGE" && rm -f ../payload.zip && zip -q -9 -r -X ../payload.zip app python bin)
shasum -a 256 windows/payload.zip | cut -c1-16 > windows/payload.id

python3 windows/make_rsrc.py assets/logo.png windows/rsrc_windows_amd64.syso "$VERSION"

mkdir -p dist-windows
(cd windows && CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags '-H=windowsgui -s -w' -o ../dist-windows/Svara.exe .)
rm -rf "$STAGE"

# Installer wizard (Next → Next → Install → Finish)
python3 windows/installer_art.py assets/logo.png windows
makensis -V2 -DVERSION="$VERSION" windows/installer.nsi
ls -lh dist-windows/Svara.exe "dist-windows/Svara-Setup-$VERSION.exe"
