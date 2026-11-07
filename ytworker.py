"""Worker yt-dlp yang nyala terus (dijalanin pakai Python bawaan yt-dlp).

Baca satu baris JSON {"vid": "..."} dari stdin, balas satu baris JSON berisi URL audio.
Karena prosesnya nggak mati, resolve lagu berikutnya cuma ~1 detik, bukan 4.
"""
import json
import os
import sys

import yt_dlp

opts = {
    'quiet': True,
    'no_warnings': True,
    'noprogress': True,
    'noplaylist': True,
    'format': 'bestaudio[ext=m4a]/bestaudio',
    # Client bawaan yt-dlp baru (tv_samsung) ngasih URL yang 403 beberapa detik pertama
    'extractor_args': {'youtube': {'player_client': ['visionos', 'web']}},
}
if os.environ.get('PUTAR_COOKIES'):
    opts['cookiesfrombrowser'] = (os.environ['PUTAR_COOKIES'],)

ydl = yt_dlp.YoutubeDL(opts)


def videos(info):
    """Stream video-only H.264 per resolusi (diputar barengan audio yang udah ada)."""
    best = {}
    for f in info.get('formats') or []:
        h = f.get('height')
        if h not in (360, 480, 720, 1080) or f.get('acodec') not in ('none', None):
            continue
        if not str(f.get('vcodec', '')).startswith('avc1') or not str(f.get('protocol', '')).startswith('http'):
            continue
        if h not in best or (f.get('tbr') or 0) > (best[h].get('tbr') or 0):
            best[h] = f
    return {str(h): {'url': f['url'], 'headers': f.get('http_headers') or {}, 'size': f.get('filesize') or 0, 'tbr': f.get('tbr') or 0}
            for h, f in best.items()}

for line in sys.stdin:
    try:
        vid = json.loads(line)['vid']
        info = ydl.extract_info(f'https://music.youtube.com/watch?v={vid}', download=False)
        out = {
            'ok': True,
            'url': info['url'],
            'headers': info.get('http_headers') or {},
            'ext': info.get('ext') or 'm4a',
            'size': info.get('filesize') or info.get('filesize_approx') or 0,
            'duration': info.get('duration') or 0,
            'videos': videos(info),
        }
    except Exception as e:
        msg = str(e).strip().splitlines()[-1] if str(e).strip() else 'yt-dlp gagal'
        out = {'ok': False, 'error': msg}
    sys.stdout.write(json.dumps(out) + '\n')
    sys.stdout.flush()
