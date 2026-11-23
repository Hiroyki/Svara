#!/usr/bin/env python3
"""Bikin Svara buat Linux (x86_64 + arm64): dist-linux/svara-<versi>-linux-<arch>.tar.gz dan svara_<versi>_<arch>.deb.

Python, yt-dlp, deno, dan ffmpeg ikut dibundel, jadi pengguna nggak perlu masang apa-apa.
Bisa dijalanin dari Linux, Mac, atau Windows (semua dirakit langsung ke arsip, nggak diekstrak ke disk,
jadi symlink & izin eksekusi tetap benar).

  python3 build-linux.py            dua arsitektur
  python3 build-linux.py x86_64     satu aja

Naikin versi di bawah kalau YouTube berubah.
"""
import gzip
import hashlib
import io
import os
import shutil
import subprocess
import sys
import tarfile
import time
import urllib.request
import zipfile
from pathlib import Path

VERSION = '2.0.0'
PYTHON = '3.13.18'
PBS = '20261110'  # rilis python-build-standalone
DENO = '2.9.8'

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / 'linux' / '.cache'
DIST = ROOT / 'dist-linux'
PYMM = '.'.join(PYTHON.split('.')[:2])
ARCHS = {
    'x86_64': {'triple': 'x86_64-unknown-linux-gnu', 'ff': 'linux64', 'pip': 'x86_64', 'deb': 'amd64'},
    'arm64': {'triple': 'aarch64-unknown-linux-gnu', 'ff': 'linuxarm64', 'pip': 'aarch64', 'deb': 'arm64'},
}
APP_FILES = ['index.html', 'style.css', 'app.js', 'db.js', 'sw.js', 'manifest.webmanifest', 'server.py', 'ytworker.py',
             'favicon.png', 'icon-192.png', 'icon-512.png', 'icon.svg']
# Bagian Python yang nggak kepakai (test suite, GUI Tk, IDLE, header C): jauh lebih kecil
PRUNE = [f'python/lib/python{PYMM}/{d}/' for d in ('test', 'idlelib', 'tkinter', 'turtledemo', 'ensurepip', 'lib2to3')] + \
        ['python/include/', 'python/share/', f'python/lib/python{PYMM}/config-', 'python/lib/itcl', 'python/lib/tcl',
         'python/lib/tk', 'python/lib/thread', 'python/lib/libtcl', 'python/lib/libtk', f'python/lib/python{PYMM}/lib-dynload/_tkinter']
MTIME = int(time.time())


def fetch(url, name):
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / name
    if not dest.exists():
        print('  unduh', url)
        tmp = dest.with_suffix('.tmp')
        if shutil.which('curl'):
            # curl pakai sertifikat sistem; Python di sebagian mesin (mis. Windows) nggak
            subprocess.run(['curl', '-fsSL', '--retry', '3', '-o', str(tmp), url], check=True)
        else:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'svara-build'})) as r, open(tmp, 'wb') as f:
                shutil.copyfileobj(r, f, 1 << 20)
        tmp.replace(dest)
    return dest


def wheels(arch):
    """Wheel yt-dlp[default] buat Linux arch ini (cuma diunduh, nggak dipasang di mesin build)."""
    d = CACHE / f'wheels-{arch}'
    if not d.exists() or not any(d.glob('yt_dlp-*.whl')):
        d.mkdir(parents=True, exist_ok=True)
        p = ARCHS[arch]['pip']
        cp = 'cp' + PYMM.replace('.', '')
        subprocess.run([sys.executable, '-m', 'pip', 'download', '--quiet', '--disable-pip-version-check', '--only-binary=:all:',
                        '--platform', f'manylinux_2_28_{p}', '--platform', f'manylinux_2_17_{p}', '--platform', f'manylinux2014_{p}',
                        '--python-version', PYMM, '--implementation', 'cp', '--abi', cp, '--abi', 'abi3', '--abi', 'none',
                        '-d', str(d), 'yt-dlp[default]'], check=True)
    return sorted(d.glob('*.whl'))


class Tree:
    """Isi paket di memori: path -> (jenis, mode, data/linkname)."""

    def __init__(self):
        self.items = {}

    def file(self, path, data, mode=0o644):
        self.items[path] = ('f', mode, data)

    def link(self, path, target):
        self.items[path] = ('l', 0o777, target)

    def hardlink(self, path, target):
        self.items[path] = ('h', 0o644, target)

    def size(self):
        return sum(len(v[2]) for v in self.items.values() if v[0] == 'f')

    def write(self, tar, prefix, extra_dirs=()):
        dirs = set(extra_dirs)
        for p in self.items:
            parts = p.split('/')[:-1]
            for i in range(1, len(parts) + 1):
                dirs.add('/'.join(parts[:i]))
        for d in sorted(dirs):
            ti = tarfile.TarInfo(prefix + d)
            ti.type, ti.mode, ti.mtime = tarfile.DIRTYPE, 0o755, MTIME
            tar.addfile(ti)
        for p in sorted(self.items):
            kind, mode, data = self.items[p]
            ti = tarfile.TarInfo(prefix + p)
            ti.mode, ti.mtime = mode, MTIME
            if kind == 'f':
                ti.size = len(data)
                tar.addfile(ti, io.BytesIO(data))
            elif kind == 'l':
                ti.type, ti.linkname = tarfile.SYMTYPE, data
                tar.addfile(ti)
            else:
                ti.type, ti.linkname = tarfile.LNKTYPE, prefix + data
                tar.addfile(ti)


def icon_png():
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return (ROOT / 'icon-512.png').read_bytes()
    logo = Image.open(ROOT / 'assets' / 'logo.png').convert('RGBA')
    c = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    ImageDraw.Draw(c).rounded_rectangle((24, 24, 487, 487), radius=104, fill=(26, 25, 34, 255))
    logo.thumbnail((330, 330), Image.LANCZOS)
    c.alpha_composite(logo, ((512 - logo.width) // 2, (512 - logo.height) // 2))
    b = io.BytesIO()
    c.save(b, 'PNG')
    return b.getvalue()


def assemble(arch):
    a = ARCHS[arch]
    t = Tree()
    print(f'[{arch}] runtime')
    pbs = fetch(f'https://github.com/astral-sh/python-build-standalone/releases/download/{PBS}/'
                f'cpython-{PYTHON}+{PBS}-{a["triple"]}-install_only_stripped.tar.gz', f'python-{PYTHON}-{arch}.tar.gz')
    deno = fetch(f'https://github.com/denoland/deno/releases/download/v{DENO}/deno-{a["triple"]}.zip', f'deno-{DENO}-{arch}.zip')
    ffm = fetch(f'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-{a["ff"]}-gpl.tar.xz',
                f'ffmpeg-{arch}.tar.xz')

    with tarfile.open(pbs) as tar:
        for m in tar:
            name = m.name.lstrip('./')
            if not name or m.isdir() or any(name.startswith(p) for p in PRUNE):
                continue
            path = 'runtime/' + name
            if m.issym():
                t.link(path, m.linkname)
            elif m.islnk():
                t.hardlink(path, 'runtime/' + m.linkname.lstrip('./'))
            elif m.isfile():
                t.file(path, tar.extractfile(m).read(), m.mode & 0o777 | 0o644)

    sp = f'runtime/python/lib/python{PYMM}/site-packages/'
    for whl in wheels(arch):
        with zipfile.ZipFile(whl) as z:
            for n in z.namelist():
                top = n.split('/')[0]
                if n.endswith('/') or top.endswith('.data'):
                    continue
                t.file(sp + n, z.read(n))

    with zipfile.ZipFile(deno) as z:
        t.file('runtime/bin/deno', z.read('deno'), 0o755)
    with tarfile.open(ffm) as tar:
        m = next(m for m in tar if m.isfile() and m.name.endswith('/bin/ffmpeg'))
        t.file('runtime/bin/ffmpeg', tar.extractfile(m).read(), 0o755)

    for f in APP_FILES:
        t.file('app/' + f, (ROOT / f).read_bytes())
    for f in sorted((ROOT / 'assets').rglob('*')):
        if f.is_file() and f.name != '.DS_Store':
            t.file('app/' + f.relative_to(ROOT).as_posix(), f.read_bytes())

    lx = ROOT / 'linux'
    t.file('svara', (lx / 'svara').read_bytes().replace(b'\r\n', b'\n'), 0o755)
    t.file('install.sh', (lx / 'install.sh').read_bytes().replace(b'\r\n', b'\n'), 0o755)
    t.file('svara-window.py', (lx / 'svara-window.py').read_bytes())
    t.file('svara.desktop', (lx / 'svara.desktop').read_bytes())
    t.file('svara.png', icon_png())
    t.file('README.txt', f'''SVARA {VERSION} for Linux ({arch})
=================================

Install (no sudo):   ./install.sh        then open Svara from your app menu, or run: svara
Run without install: ./svara
Uninstall:           ./install.sh --uninstall

Svara opens in its own window when WebKitGTK is available
(Debian/Ubuntu: sudo apt install python3-gi gir1.2-webkit2-4.1),
otherwise in Chrome/Chromium/Brave/Edge app mode, otherwise in your default browser.

Everything else (Python, yt-dlp, Deno, ffmpeg) is already inside this folder.
Your library lives in ~/.local/share/svara, offline songs go to ~/Music/Svara.

https://github.com/Hiroyki/Svara
'''.encode())
    return t


def write_targz(t, arch):
    name = f'svara-{VERSION}-linux-{arch}'
    out = DIST / f'{name}.tar.gz'
    with open(out, 'wb') as raw, gzip.GzipFile(fileobj=raw, mode='wb', compresslevel=9, mtime=MTIME) as gz, \
            tarfile.open(fileobj=gz, mode='w', format=tarfile.GNU_FORMAT) as tar:
        t.write(tar, name + '/', extra_dirs=[''])
    return out


def ar_member(name, data):
    hdr = f'{name:<16}{MTIME:<12}{0:<6}{0:<6}{"100644":<8}{len(data):<10}`\n'.encode()
    return hdr + data + (b'\n' if len(data) % 2 else b'')


def targz_bytes(fill):
    b = io.BytesIO()
    with gzip.GzipFile(fileobj=b, mode='wb', compresslevel=9, mtime=MTIME) as gz, \
            tarfile.open(fileobj=gz, mode='w', format=tarfile.GNU_FORMAT) as tar:
        fill(tar)
    return b.getvalue()


def write_deb(t, arch):
    a = ARCHS[arch]
    d = Tree()
    for p, v in t.items.items():
        d.items['opt/svara/' + p] = v if v[0] != 'h' else ('h', v[1], 'opt/svara/' + v[2])
    d.link('usr/bin/svara', '/opt/svara/svara')
    d.file('usr/share/applications/svara.desktop', t.items['svara.desktop'][2])
    d.file('usr/share/icons/hicolor/512x512/apps/svara.png', t.items['svara.png'][2])
    data = targz_bytes(lambda tar: d.write(tar, './', extra_dirs=['']))

    control = f'''Package: svara
Version: {VERSION}
Architecture: {a["deb"]}
Maintainer: Svara <https://github.com/Hiroyki/Svara>
Installed-Size: {d.size() // 1024}
Depends: libc6 (>= 2.28)
Recommends: python3-gi, gir1.2-webkit2-4.1 | gir1.2-webkit-6.0, xdg-utils
Section: sound
Priority: optional
Homepage: https://github.com/Hiroyki/Svara
Description: Ad-free music player for the YouTube Music catalogue
 Synced lyrics, crossfade, 5-band EQ, offline songs, podcasts and a listening
 Recap. Python, yt-dlp, Deno and ffmpeg are bundled; no account needed and
 everything stays on your computer.
'''
    postinst = f'''#!/bin/sh
set -e
# .pyc dibikin sekali di sini; /opt nggak bisa ditulis pas app jalan
/opt/svara/runtime/python/bin/python3 -I -m compileall -q -j0 /opt/svara/runtime/python/lib/python{PYMM}/site-packages >/dev/null 2>&1 || true
command -v update-desktop-database >/dev/null && update-desktop-database -q /usr/share/applications || true
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q /usr/share/icons/hicolor || true
exit 0
'''
    prerm = f'''#!/bin/sh
set -e
find /opt/svara -name __pycache__ -type d -prune -exec rm -rf {{}} + 2>/dev/null || true
exit 0
'''
    ctl = Tree()
    ctl.file('control', control.encode())
    ctl.file('postinst', postinst.encode(), 0o755)
    ctl.file('prerm', prerm.encode(), 0o755)
    ctl.file('md5sums', ''.join(f'{hashlib.md5(v[2]).hexdigest()}  {p}\n' for p, v in sorted(d.items.items()) if v[0] == 'f').encode())
    control_tgz = targz_bytes(lambda tar: ctl.write(tar, './', extra_dirs=['']))

    out = DIST / f'svara_{VERSION}_{a["deb"]}.deb'
    with open(out, 'wb') as f:
        f.write(b'!<arch>\n')
        f.write(ar_member('debian-binary', b'2.0\n'))
        f.write(ar_member('control.tar.gz', control_tgz))
        f.write(ar_member('data.tar.gz', data))
    return out


def main():
    archs = sys.argv[1:] or list(ARCHS)
    DIST.mkdir(exist_ok=True)
    for arch in archs:
        if arch not in ARCHS:
            sys.exit(f'arsitektur nggak dikenal: {arch} (pilih: {", ".join(ARCHS)})')
        t = assemble(arch)
        for out in (write_targz(t, arch), write_deb(t, arch)):
            print(f'  {out.relative_to(ROOT)}  ({out.stat().st_size / 1e6:.0f} MB)')


if __name__ == '__main__':
    main()
