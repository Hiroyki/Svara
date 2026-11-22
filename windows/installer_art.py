#!/usr/bin/env python3
"""Gambar buat installer NSIS: svara.ico, wizard.bmp (164×314), header.bmp (150×57).

Pakai: installer_art.py <logo.png> <folder keluaran>
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

logo_path, out = sys.argv[1], Path(sys.argv[2])
logo = Image.open(logo_path).convert('RGBA')
BG = (18, 17, 24)

# Ikon: kotak gelap bersudut bulat + logo, sama kayak ikon app
icon = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
ImageDraw.Draw(icon).rounded_rectangle((8, 8, 247, 247), radius=50, fill=(26, 25, 34, 255))
l = logo.copy(); l.thumbnail((176, 176), Image.LANCZOS)
icon.alpha_composite(l, ((256 - l.width) // 2, (256 - l.height) // 2))
icon.save(out / 'svara.ico', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

# Panel kiri halaman Welcome/Finish: gelap, cahaya hangat, logo di tengah atas
W, H = 164, 314
wiz = Image.new('RGB', (W, H), BG)
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
for r, a in ((150, 18), (110, 26), (70, 34)):
    gd.ellipse((W / 2 - r, 120 - r, W / 2 + r, 120 + r), fill=(255, 190, 80, a))
wiz.paste(glow, (0, 0), glow)
l = logo.copy(); l.thumbnail((96, 96), Image.LANCZOS)
wiz.paste(l, ((W - l.width) // 2, 120 - l.height // 2), l)
wiz.save(out / 'wizard.bmp')

# Header kanan atas halaman lain: putih, logo kecil di kanan
hdr = Image.new('RGB', (150, 57), (255, 255, 255))
bx = Image.new('RGBA', (46, 46), (0, 0, 0, 0))
ImageDraw.Draw(bx).rounded_rectangle((0, 0, 45, 45), radius=10, fill=(26, 25, 34, 255))
l = logo.copy(); l.thumbnail((32, 32), Image.LANCZOS)
bx.alpha_composite(l, ((46 - l.width) // 2, (46 - l.height) // 2))
hdr.paste(bx, (150 - 46 - 8, 5), bx)
hdr.save(out / 'header.bmp')
