#!/usr/bin/env python3
"""Bikin rsrc_windows_amd64.syso (ikon, manifest, info versi) buat dilink Go ke Senandung.exe.

Pakai: make_rsrc.py <logo.png> <keluaran.syso> <versi, mis. 1.0.0>
"""
import io
import struct
import sys

from PIL import Image, ImageDraw

RT_ICON, RT_GROUP_ICON, RT_VERSION, RT_MANIFEST = 3, 14, 16, 24
LANG = 0x0409
SIZES = (16, 24, 32, 48, 64, 128, 256)

MANIFEST = b'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity type="win32" name="Senandung" version="1.0.0.0" processorArchitecture="amd64"/>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3"><security><requestedPrivileges>
    <requestedExecutionLevel level="asInvoker" uiAccess="false"/>
  </requestedPrivileges></security></trustInfo>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1"><application>
    <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/>
  </application></compatibility>
  <application xmlns="urn:schemas-microsoft-com:asm.v3"><windowsSettings>
    <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true/pm</dpiAware>
    <dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">PerMonitorV2</dpiAwareness>
  </windowsSettings></application>
</assembly>
'''


def icons(path):
    """Kotak gelap bersudut bulat dengan logo di tengah, sama kayak ikon Mac."""
    logo = Image.open(path).convert('RGBA')
    canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    ImageDraw.Draw(canvas).rounded_rectangle((32, 32, 991, 991), radius=200, fill=(26, 25, 34, 255))
    logo.thumbnail((700, 700), Image.LANCZOS)
    canvas.alpha_composite(logo, ((1024 - logo.width) // 2, (1024 - logo.height) // 2))
    out = []
    for s in SIZES:
        b = io.BytesIO()
        canvas.resize((s, s), Image.LANCZOS).save(b, 'PNG', optimize=True)
        out.append((s, b.getvalue()))
    return out


def group_icon(images):
    data = struct.pack('<HHH', 0, 1, len(images))
    for i, (s, png) in enumerate(images, 1):
        dim = 0 if s >= 256 else s
        data += struct.pack('<BBBBHHIH', dim, dim, 0, 0, 1, 32, len(png), i)
    return data


def pad4(b):
    return b + b'\0' * (-len(b) % 4)


def wstr(s):
    return s.encode('utf-16-le') + b'\0\0'


def block(key, value=b'', children=(), text=False, value_len=None):
    """Satu blok VERSIONINFO: panjang, panjang nilai, tipe, kunci, nilai, anak."""
    head = wstr(key)
    body = pad4(struct.pack('<HHH', 0, 0, 0) + head)
    if value:
        body += value
    body = pad4(body)
    for c in children:
        body += pad4(c)
    n = value_len if value_len is not None else len(value)
    return struct.pack('<HHH', len(body), n, 1 if text else 0) + body[6:]


def version_info(version):
    nums = [int(x) for x in version.split('.')] + [0, 0, 0, 0]
    ms, ls = nums[0] << 16 | nums[1], nums[2] << 16 | nums[3]
    fixed = struct.pack('<13I', 0xFEEF04BD, 0x00010000, ms, ls, ms, ls, 0x3F, 0, 0x40004, 1, 0, 0, 0)
    fields = {
        'CompanyName': 'Faquloh', 'FileDescription': 'Senandung', 'FileVersion': version,
        'InternalName': 'Senandung', 'OriginalFilename': 'Senandung.exe',
        'ProductName': 'Senandung', 'ProductVersion': version,
    }
    strings = [block(k, wstr(v), text=True, value_len=len(v) + 1) for k, v in fields.items()]
    table = block('040904B0', children=strings, text=True)
    sfi = block('StringFileInfo', children=[table], text=True)
    var = block('Translation', struct.pack('<HH', LANG, 1200))
    vfi = block('VarFileInfo', children=[var], text=True)
    return block('VS_VERSION_INFO', fixed, [sfi, vfi])


def resource_section(resources):
    """Direktori tiga tingkat (tipe, id, bahasa), entri data, lalu isinya.

    resources: {tipe: {id: bytes}}. Balik: isi section + posisi field RVA yang perlu relokasi.
    """
    types = sorted(resources)
    dir_size = lambda n: 16 + 8 * n
    pos = dir_size(len(types))
    type_at, leaf_at = {}, {}
    for t in types:
        type_at[t] = pos
        pos += dir_size(len(resources[t]))
    for t in types:
        for i in sorted(resources[t]):
            leaf_at[t, i] = pos
            pos += dir_size(1)
    entry_at = {}
    for t in types:
        for i in sorted(resources[t]):
            entry_at[t, i] = pos
            pos += 16

    def directory(entries):
        return struct.pack('<IIHHHH', 0, 0, 0, 0, 0, len(entries)) + b''.join(struct.pack('<II', k, v) for k, v in entries)

    out = directory([(t, 0x80000000 | type_at[t]) for t in types])
    for t in types:
        out += directory([(i, 0x80000000 | leaf_at[t, i]) for i in sorted(resources[t])])
    for t in types:
        for i in sorted(resources[t]):
            out += directory([(LANG, entry_at[t, i])])

    data_at, blob = {}, b''
    for t in types:
        for i in sorted(resources[t]):
            data_at[t, i] = pos + len(blob)
            blob = pad4(blob + resources[t][i])
    relocs = []
    for t in types:
        for i in sorted(resources[t]):
            relocs.append(len(out))
            out += struct.pack('<IIII', data_at[t, i], len(resources[t][i]), 0, 0)
    return out + blob, relocs


def coff(section, relocs):
    """Object COFF AMD64 dengan satu section .rsrc; relokasi ADDR32NB ke simbol section-nya."""
    header, sect_header = 20, 40
    raw = header + sect_header
    reloc_at = raw + len(section)
    sym_at = reloc_at + 10 * len(relocs)
    out = struct.pack('<HHIIIHH', 0x8664, 1, 0, sym_at, 1, 0, 0)
    out += struct.pack('<8sIIIIIIHHI', b'.rsrc', 0, 0, len(section), raw, reloc_at, 0, len(relocs), 0, 0x40000040)
    out += section
    for r in relocs:
        out += struct.pack('<IIH', r, 0, 3)  # IMAGE_REL_AMD64_ADDR32NB
    out += struct.pack('<8sIhHBB', b'.rsrc', 0, 1, 0, 3, 0)  # IMAGE_SYM_CLASS_STATIC
    return out + struct.pack('<I', 4)  # string table kosong


def main():
    logo, target, version = sys.argv[1:4]
    images = icons(logo)
    resources = {
        RT_ICON: {i: png for i, (_, png) in enumerate(images, 1)},
        RT_GROUP_ICON: {1: group_icon(images)},
        RT_VERSION: {1: version_info(version)},
        RT_MANIFEST: {1: MANIFEST},
    }
    section, relocs = resource_section(resources)
    with open(target, 'wb') as f:
        f.write(coff(section, relocs))


if __name__ == '__main__':
    main()
