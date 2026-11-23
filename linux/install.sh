#!/bin/sh
# Pasang Svara buat user ini aja (nggak perlu sudo): ~/.local/share/svara + menu aplikasi + perintah `svara`.
#   ./install.sh             pasang / update
#   ./install.sh --uninstall copot (library & lagu offline nggak ikut kehapus)
set -e
SRC=$(dirname "$(readlink -f "$0")")
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/svara-app"
BIN="$HOME/.local/bin"
APPS="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICONS="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor/512x512/apps"

if [ "$1" = "--uninstall" ]; then
  "$DEST/svara" --quit 2>/dev/null || true
  rm -rf "$DEST" "$BIN/svara" "$APPS/svara.desktop" "$ICONS/svara.png"
  echo "Svara udah dicopot. Library kamu masih ada di ~/.local/share/svara (hapus manual kalau mau)."
  exit 0
fi

[ -x "$DEST/svara" ] && "$DEST/svara" --quit 2>/dev/null || true
rm -rf "$DEST.new"
mkdir -p "$DEST.new"
cp -a "$SRC/." "$DEST.new/"
rm -rf "$DEST"
mv "$DEST.new" "$DEST"
mkdir -p "$BIN" "$APPS" "$ICONS"
ln -sf "$DEST/svara" "$BIN/svara"
cp "$DEST/svara.png" "$ICONS/svara.png"
sed "s|^Exec=svara|Exec=$DEST/svara|" "$DEST/svara.desktop" > "$APPS/svara.desktop"
command -v update-desktop-database >/dev/null && update-desktop-database "$APPS" 2>/dev/null || true
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q "${ICONS%/512x512/apps}" 2>/dev/null || true
echo "Svara terpasang. Buka dari menu aplikasi, atau jalanin: svara"
case ":$PATH:" in *":$BIN:"*) ;; *) echo "(Tambahin $BIN ke PATH kalau perintah svara belum kebaca)";; esac
