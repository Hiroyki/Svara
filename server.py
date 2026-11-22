#!/usr/bin/env python3
"""Server lokal Svara: nyajiin file web + jembatan YouTube Music (yt-dlp) + podcast (RSS).

Jalanin: python3 server.py  (atau ./senandung)  lalu buka http://localhost:5560
Cuma dengerin 127.0.0.1, jadi nggak kebuka ke jaringan.
"""
import email.utils
import hashlib
import html
import json
import os
import queue
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = int(os.environ.get('PUTAR_PORT', 5560))
ROOT = Path(__file__).resolve().parent
if os.environ.get('PUTAR_CACHE_DIR'):
    CACHE = Path(os.environ['PUTAR_CACHE_DIR'])
elif sys.platform == 'win32':
    CACHE = Path(os.environ.get('LOCALAPPDATA') or Path.home() / 'AppData' / 'Local') / 'Senandung' / 'cache'
else:
    CACHE = Path.home() / 'Library' / 'Caches' / 'putar'
AUDIO_CACHE = CACHE / 'audio'
IMG_CACHE = CACHE / 'img'
SAVE_DIR = Path(os.environ.get('PUTAR_SAVE_DIR', Path.home() / 'Music' / 'Senandung'))
SAVED_INDEX = SAVE_DIR / '.putar-saved.json'
CACHE_LIMIT = 1024 * 1024 * 1024  # 1 GB
VID_RE = re.compile(r'^[A-Za-z0-9_-]{11}$')
IMG_HOSTS = ('.googleusercontent.com', '.ytimg.com', '.ggpht.com', '.mzstatic.com')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
TYPES = {'.m4a': 'audio/mp4', '.webm': 'audio/webm', '.opus': 'audio/ogg', '.mp3': 'audio/mpeg'}

# App Windows bawa Python + yt_dlp sendiri, nggak ada perintah yt-dlp di PATH
BUNDLED_PY = os.environ.get('PUTAR_PYTHON', '').strip()
YTDLP = BUNDLED_PY or shutil.which('yt-dlp')
FFMPEG = shutil.which('ffmpeg')
# Opsional: pakai login YouTube dari browser (mis. PUTAR_COOKIES=chrome) buat lagu yang minta login
COOKIES = os.environ.get('PUTAR_COOKIES', '').strip()

for d in (AUDIO_CACHE, IMG_CACHE):
    d.mkdir(parents=True, exist_ok=True)


def ytdlp_python():
    """Python milik instalasi yt-dlp (brew pakai venv sendiri), biar bisa `import yt_dlp`."""
    if BUNDLED_PY:
        return BUNDLED_PY
    if not YTDLP:
        return None
    try:
        first = Path(YTDLP).resolve().read_text(errors='ignore').splitlines()[0]
        if first.startswith('#!') and 'python' in first:
            py = first[2:].strip().split()[0]
            if subprocess.run([py, '-c', 'import yt_dlp'], capture_output=True).returncode == 0:
                return py
    except Exception:
        pass
    return None


# ---------- pool worker yt-dlp (nyala terus = resolve ~1 detik) ----------

class Worker:
    def __init__(self, py):
        env = dict(os.environ)
        if COOKIES:
            env['PUTAR_COOKIES'] = COOKIES
        self.p = subprocess.Popen([py, '-X', 'utf8', '-I', str(ROOT / 'ytworker.py')], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                  stderr=subprocess.DEVNULL, text=True, bufsize=1, env=env)

    def ask(self, vid):
        self.p.stdin.write(json.dumps({'vid': vid}) + '\n')
        self.p.stdin.flush()
        line = self.p.stdout.readline()
        if not line:
            raise RuntimeError('worker yt-dlp mati')
        return json.loads(line)


class Resolver:
    """Ngubah video id jadi URL audio langsung. Ada cache, dedupe, dan jalur prioritas buat klik."""

    def __init__(self):
        self.py = ytdlp_python()
        self.idle = queue.Queue()
        self.size = 5 if self.py else 0
        for _ in range(self.size):
            self.idle.put(None)  # worker dibikin pas pertama dipakai
        self.bg_slots = threading.Semaphore(3)  # prefetch maksimal 3, sisanya buat klik
        self.cache = {}
        self.inflight = {}
        self.lock = threading.Lock()

    def _run(self, vid):
        if not self.py:
            cmd = [YTDLP, '--no-playlist', '--quiet', '--no-warnings', '-J', '-f', 'bestaudio[ext=m4a]/bestaudio',
                   f'https://music.youtube.com/watch?v={vid}']
            if COOKIES:
                cmd[1:1] = ['--cookies-from-browser', COOKIES]
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if r.returncode != 0:
                return {'ok': False, 'error': (r.stderr or 'yt-dlp gagal').strip().splitlines()[-1]}
            i = json.loads(r.stdout)
            return {'ok': True, 'url': i['url'], 'headers': i.get('http_headers') or {}, 'ext': i.get('ext') or 'm4a',
                    'size': i.get('filesize') or 0, 'duration': i.get('duration') or 0}
        w = self.idle.get()
        try:
            if w is None or w.p.poll() is not None:
                w = Worker(self.py)
            return w.ask(vid)
        except Exception as e:
            w = None
            return {'ok': False, 'error': str(e)}
        finally:
            self.idle.put(w)

    def warm(self, vid='jNQXAC9IVRw'):
        """Nyalain semua worker sekaligus + sekali resolve, biar klik pertama nggak nunggu loading."""
        def one():
            w = self.idle.get()
            try:
                if w is None:
                    w = Worker(self.py)
                w.ask(vid)
            except Exception:
                w = None
            finally:
                self.idle.put(w)
        for _ in range(self.size):
            threading.Thread(target=one, daemon=True).start()

    def get(self, vid, urgent=True):
        with self.lock:
            hit = self.cache.get(vid)
            if hit and hit['exp'] > time.time():
                return hit
            ev = self.inflight.get(vid)
            mine = ev is None
            if mine:
                ev = self.inflight[vid] = threading.Event()
        if not mine:
            ev.wait(120)
            hit = self.cache.get(vid)
            if hit:
                return hit
            raise RuntimeError('gagal ambil lagu')
        slot = None if urgent else self.bg_slots
        try:
            if slot:
                slot.acquire()
            res = self._run(vid)
        finally:
            if slot:
                slot.release()
            with self.lock:
                self.inflight.pop(vid, None)
            ev.set()
        if not res.get('ok'):
            msg = res.get('error', 'yt-dlp gagal')
            if 'Sign in' in msg and not COOKIES:
                msg = 'YouTube minta login buat lagu ini. Jalanin ulang pakai: PUTAR_COOKIES=chrome ./senandung'
            raise RuntimeError(msg)
        res['exp'] = time.time() + 4 * 3600
        with self.lock:
            self.cache[vid] = res
        return res

    def forget(self, vid):
        """Buang URL yang udah basi/ditolak YouTube, biar resolve ulang dapet URL baru."""
        with self.lock:
            self.cache.pop(vid, None)


resolver = Resolver()


def fetch_media(vid, rng=None, tries=4, urgent=True):
    """Buka koneksi ke URL media YouTube, retry + resolve ulang kalau ditolak (403/429/5xx).

    Balikin (info, response). Caller wajib nutup response-nya.
    """
    last = None
    for attempt in range(tries):
        info = resolver.get(vid, urgent=urgent)
        headers = dict(info['headers'])
        headers['Range'] = rng or 'bytes=0-'
        req = urllib.request.Request(info['url'], headers=headers)
        try:
            return info, urllib.request.urlopen(req, timeout=30)
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (403, 409, 429, 500, 502, 503, 504):
                resolver.forget(vid)  # URL-nya ditolak, buang & resolve ulang
                time.sleep(0.4 * (attempt + 1))
                continue
            raise
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last = e
            resolver.forget(vid)
            time.sleep(0.4 * (attempt + 1))
            continue
    raise last if last else RuntimeError('gagal ambil media')


def fix_moov(buf):
    """File m4a DASH dari YouTube nyimpen durasi penuh di moov PADAHAL isinya fragmen (moof),
    jadi AVFoundation/WebKit di Mac ngejumlahin dua-duanya: lagu 4 menit kebaca 8 menit.
    Durasi di mvhd/tkhd/mdhd dinolin (ukuran byte tetap), biar durasi dihitung dari fragmen aja.
    `buf` bytearray yang dimulai dari byte 0 file; diubah langsung."""
    def walk(o, e):
        while o + 8 <= e:
            sz = int.from_bytes(buf[o:o + 4], 'big')
            t = bytes(buf[o + 4:o + 8])
            if sz < 8 or o + sz > e:
                return
            if t in (b'moov', b'trak', b'mdia'):
                walk(o + 8, o + sz)
            elif t in (b'mvhd', b'tkhd', b'mdhd'):
                v1 = buf[o + 8] == 1
                p = o + 8 + (20 if t == b'tkhd' else 16) + (8 if v1 else 0)
                n = 8 if v1 else 4
                buf[p:p + n] = bytes(n)
            elif t in (b'mdat', b'moof'):
                return
            o += sz
    if buf[4:8] != b'ftyp' or b'moof' not in buf[:1 << 20] and b'mvex' not in buf[:1 << 20]:
        return buf  # bukan MP4 terfragmentasi, biarin
    walk(0, len(buf))
    return buf


def fix_moov_file(p):
    try:
        with open(p, 'r+b') as f:
            head = bytearray(f.read(256 * 1024))
            fixed = fix_moov(bytearray(head))
            if fixed != head:
                f.seek(0)
                f.write(fixed)
    except OSError:
        pass


_dl_running = set()
_dl_lock = threading.Lock()


def cached_audio(vid):
    for p in AUDIO_CACHE.glob(f'{vid}.*'):
        if p.suffix in TYPES:
            return p
    return None


def prune_cache():
    for p in AUDIO_CACHE.glob('*.part'):  # buang sisa unduhan gagal (0 byte) yang nyangkut
        try:
            if p.stat().st_size == 0:
                p.unlink(missing_ok=True)
        except OSError:
            pass
    files = sorted((p for p in AUDIO_CACHE.iterdir() if p.is_file() and p.suffix in TYPES), key=lambda p: p.stat().st_atime)
    total = sum(p.stat().st_size for p in files)
    while files and total > CACHE_LIMIT:
        p = files.pop(0)
        size = p.stat().st_size
        try:
            p.unlink(missing_ok=True)
            total -= size
        except OSError:
            pass  # Windows nolak hapus file yang lagi diputar


def download(vid, urgent=False):
    """Unduh audio penuh ke cache (dipotong per 8 MB biar nggak dilambatin YouTube)."""
    if cached_audio(vid):
        return cached_audio(vid)
    with _dl_lock:
        if vid in _dl_running:
            return None
        _dl_running.add(vid)
    tmp = AUDIO_CACHE / f'{vid}.part'
    try:
        size = 0
        ext = 'm4a'
        pos = 0
        with open(tmp, 'wb') as f:
            while True:
                end = pos + 8 * 1024 * 1024 - 1
                info, r = fetch_media(vid, f'bytes={pos}-{end}', urgent=urgent)
                with r:
                    total = r.headers.get('Content-Range', '').split('/')[-1]
                    if total.isdigit():
                        size = int(total)
                    chunk = r.read()
                if pos == 0:
                    chunk = bytes(fix_moov(bytearray(chunk)))
                ext = info.get('ext') or ext
                f.write(chunk)
                pos += len(chunk)
                if not chunk or (size and pos >= size):
                    break
        dest = AUDIO_CACHE / f'{vid}.{ext}'
        tmp.replace(dest)
        threading.Thread(target=prune_cache, daemon=True).start()
        return dest
    except Exception:
        tmp.unlink(missing_ok=True)  # jangan tinggalin .part kosong yang bikin lagu nyangkut
        raise
    finally:
        with _dl_lock:
            _dl_running.discard(vid)


_heads = {}
HEAD_SIZE = 1_500_000


def fetch_head(vid):
    """Ambil ~1,5 MB awal ke memori, biar klik pertama langsung bunyi tanpa nunggu koneksi ke YouTube."""
    if vid in _heads or cached_audio(vid):
        return
    info = resolver.get(vid, urgent=False)
    req = urllib.request.Request(info['url'], headers={**info['headers'], 'Range': f'bytes=0-{HEAD_SIZE - 1}'})
    with urllib.request.urlopen(req, timeout=20) as r:
        total = r.headers.get('Content-Range', '').split('/')[-1]
        data = r.read()
    if total.isdigit():
        info['size'] = int(total)
    _heads[vid] = bytes(fix_moov(bytearray(data)))
    while len(_heads) > 40:
        _heads.pop(next(iter(_heads)))


def bg(fn, *a, **kw):
    def run():
        try:
            fn(*a, **kw)
        except Exception:
            pass
    threading.Thread(target=run, daemon=True).start()


# ---------- YouTube Music (API internal, tanpa login) ----------

SEARCH_TYPES = {'songs': 'II', 'videos': 'IQ', 'albums': 'IY', 'artists': 'Ig', 'playlists': 'Io', 'episodes': 'JI', 'podcasts': 'JQ'}
DUR_RE = re.compile(r'\d+[.:]\d{2}([.:]\d{2})?')
STAT_RE = re.compile(r'pemutaran|ditonton|penayangan|audiens|plays|views', re.I)
PAGE_KIND = {
    'MUSIC_PAGE_TYPE_ALBUM': 'album',
    'MUSIC_PAGE_TYPE_PLAYLIST': 'playlist',
    'MUSIC_PAGE_TYPE_ARTIST': 'artist',
    'MUSIC_PAGE_TYPE_USER_CHANNEL': 'artist',
    'MUSIC_PAGE_TYPE_PODCAST_SHOW_DETAIL_PAGE': 'podcast',
}
_feed_lock = threading.Lock()
_browse_cache = {}


def find_all(o, key, out):
    if isinstance(o, dict):
        for k, v in o.items():
            if k == key:
                out.append(v)
            else:
                find_all(v, key, out)
    elif isinstance(o, list):
        for v in o:
            find_all(v, key, out)
    return out


def page_type(o):
    return (o.get('navigationEndpoint', {}).get('browseEndpoint', {})
            .get('browseEndpointContextSupportedConfigs', {})
            .get('browseEndpointContextMusicConfig', {}).get('pageType'))


def parse_duration(s):
    s = str(s).strip()
    if re.fullmatch(r'\d+\.\d{1,3}', s) and not DUR_RE.fullmatch(s) or s.isdigit():
        return int(float(s))  # detik mentah dari RSS
    n = 0
    for p in re.split(r'[.:]', s):
        n = n * 60 + int(p or 0)
    return n


def http_json(url, data=None, headers=None, timeout=15):
    req = urllib.request.Request(url, data=data, headers={'User-Agent': UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


_region = {'at': 0, 'code': None, 'name': None}
_region_lock = threading.Lock()


def user_region():
    """Negara pengguna menurut YouTube Music (dari IP), dibaca dari pilihan negara default di halaman chart."""
    if _region['code'] and _region['at'] > time.time():
        return _region
    with _region_lock:
        if _region['code'] and _region['at'] > time.time():
            return _region
        try:
            data = ytm_call('browse', {'browseId': 'FEmusic_charts'}, region=False)
            code = next((c['opaqueToken'] for c in find_all(data, 'musicFormBooleanChoice', []) if c.get('selected') and re.fullmatch(r'[A-Z]{2}', c.get('opaqueToken', ''))), None)
            name = next((runs_text(b.get('title')) for b in find_all(data, 'musicSortFilterButtonRenderer', [])), None)
            if code:
                _region.update(code=code, name=name or code, at=time.time() + 6 * 3600)
        except Exception:
            _region['at'] = time.time() + 300  # coba lagi 5 menit lagi
        return _region


def ytm_call(endpoint, body, region=True):
    # Bahasa tetap Indonesia (bahasa app), negara ikut lokasi pengguna
    client = {'clientName': 'WEB_REMIX', 'clientVersion': '1.20251020.01.00', 'hl': 'id'}
    if region and user_region()['code']:
        client['gl'] = user_region()['code']
    body = {'context': {'client': client}, **body}
    return http_json(f'https://music.youtube.com/youtubei/v1/{endpoint}?prettyPrint=false', json.dumps(body).encode(),
                     {'Content-Type': 'application/json', 'Origin': 'https://music.youtube.com', 'Referer': 'https://music.youtube.com/'})


def runs_text(o):
    return ''.join(r.get('text', '') for r in (o or {}).get('runs', [])).strip()


def big_thumb(url):
    if 'googleusercontent' in url or 'ggpht' in url:
        return re.sub(r'=w\d+-h\d+.*$', '=w544-h544-l90-rj', url)
    return url


def thumb_of(o):
    src = o.get('thumbnail') or o.get('thumbnailRenderer') or o if isinstance(o, dict) else {}
    ts = next(iter(find_all(src, 'thumbnails', [])), [])
    return big_thumb(ts[-1]['url']) if ts else ''


def first_browse(o):
    for be in find_all(o, 'browseEndpoint', []):
        cfg = be.get('browseEndpointContextSupportedConfigs', {}).get('browseEndpointContextMusicConfig', {})
        if be.get('browseId'):
            return be['browseId'], cfg.get('pageType')
    return None, None


def first_vid(o):
    for w in find_all(o, 'watchEndpoint', []):
        if VID_RE.match(w.get('videoId', '')):
            return w['videoId']
    return None


def parse_row(it):
    cols = [c['musicResponsiveListItemFlexColumnRenderer']['text'].get('runs', []) for c in it.get('flexColumns', [])]
    if not cols:
        return None
    title = ''.join(r['text'] for r in cols[0]).strip()
    vid = (it.get('playlistItemData') or {}).get('videoId') or first_vid(it.get('overlay', {})) or first_vid(cols[0])
    artists, album, album_id, artist_id, dur, plain = [], '', '', '', 0, []
    for r in [r for c in cols[1:] for r in c]:
        t = r['text'].strip()
        pt = page_type(r)
        if pt in ('MUSIC_PAGE_TYPE_ARTIST', 'MUSIC_PAGE_TYPE_USER_CHANNEL'):
            artists.append(t)
            artist_id = artist_id or r['navigationEndpoint']['browseEndpoint']['browseId']
        elif pt == 'MUSIC_PAGE_TYPE_ALBUM':
            album, album_id = t, r['navigationEndpoint']['browseEndpoint']['browseId']
        elif DUR_RE.fullmatch(t):
            dur = parse_duration(t)
        elif t and t not in ('•', '&', ',') and not STAT_RE.search(t):
            plain.append(t)
    for c in it.get('fixedColumns', []):
        t = runs_text(c.get('musicResponsiveListItemFixedColumnRenderer', {}).get('text'))
        if DUR_RE.fullmatch(t):
            dur = parse_duration(t)
    art = thumb_of(it)
    if vid and VID_RE.match(vid):
        return {'type': 'song', 'vid': vid, 'title': title, 'artist': ', '.join(artists) or (plain[0] if plain else ''),
                'artistId': artist_id, 'album': album, 'albumId': album_id, 'duration': dur, 'art': art, 'meta': plain}
    bid, pt = first_browse(it.get('navigationEndpoint', {}))
    if not bid:
        return None
    return {'type': PAGE_KIND.get(pt, 'playlist'), 'id': bid, 'title': title, 'sub': ' • '.join(plain + artists), 'art': art}


def parse_two(it):
    title = runs_text(it.get('title'))
    sub = runs_text(it.get('subtitle'))
    art = thumb_of(it)
    nav = it.get('navigationEndpoint', {})
    vid = nav.get('watchEndpoint', {}).get('videoId')
    if vid and VID_RE.match(vid):
        return {'type': 'song', 'vid': vid, 'title': title, 'artist': sub.split(' • ')[-1] if sub else '', 'album': '', 'duration': 0, 'art': art}
    bid, pt = first_browse(nav)
    if not bid:
        return None
    # MPED + videoId = halaman satu video, bukan playlist; perlakukan sebagai lagu
    if bid.startswith('MPED') and VID_RE.match(bid[4:]):
        return {'type': 'song', 'vid': bid[4:], 'title': title, 'artist': sub.split(' • ')[0] if sub else '', 'album': '', 'duration': 0, 'art': art}
    return {'type': PAGE_KIND.get(pt, 'playlist'), 'id': bid, 'title': title, 'sub': sub, 'art': art}


def parse_multi(it, show=''):
    vid = first_vid(it.get('onTap', {})) or first_vid(it)
    if not vid:
        return None
    sub = [r.get('text', '') for r in it.get('subtitle', {}).get('runs', []) if r.get('text', '').strip() not in ('•', '')]
    dur_t = runs_text(it.get('playbackProgress', {}).get('musicPlaybackProgressRenderer', {}).get('durationText'))
    dur = 0
    for n, unit in re.findall(r'(\d+)\s*(jam|mnt|dtk|hr|min|sec)', dur_t):
        dur += int(n) * {'jam': 3600, 'hr': 3600, 'mnt': 60, 'min': 60}.get(unit, 1)
    views = next((x for x in sub if STAT_RE.search(x)), '')
    return {'type': 'episode', 'vid': vid, 'title': runs_text(it.get('title')), 'artist': show, 'date': sub[-1] if sub else '',
            'views': views, 'desc': runs_text(it.get('description'))[:600], 'art': thumb_of(it), 'duration': dur}


PARSERS = {'musicResponsiveListItemRenderer': parse_row, 'musicTwoRowItemRenderer': parse_two, 'musicMultiRowListItemRenderer': parse_multi}
SHELVES = ('musicCarouselShelfRenderer', 'musicShelfRenderer', 'musicPlaylistShelfRenderer')


def walk_shelves(o, out):
    """Ambil rak (shelf) sesuai urutan di halaman, tanpa masuk ke dalam rak."""
    if isinstance(o, dict):
        for k, v in o.items():
            if k in SHELVES:
                out.append((k, v))
            else:
                walk_shelves(v, out)
    elif isinstance(o, list):
        for v in o:
            walk_shelves(v, out)
    return out


def parse_items(contents, show=''):
    items = []
    for c in contents or []:
        for k, fn in PARSERS.items():
            if k in c:
                x = fn(c[k], show) if k == 'musicMultiRowListItemRenderer' else fn(c[k])
                if x:
                    items.append(x)
    return items


def shelf_title(kind, sh):
    if kind == 'musicCarouselShelfRenderer':
        return runs_text(sh.get('header', {}).get('musicCarouselShelfBasicHeaderRenderer', {}).get('title'))
    return runs_text(sh.get('title'))


def ytm_search(q, kind='songs'):
    params = 'EgWKAQ' + SEARCH_TYPES[kind] + 'AWoKEAkQBRAKEAMQBA%3D%3D'
    data = ytm_call('search', {'query': q, 'params': params})
    out = []
    for it in find_all(data, 'musicResponsiveListItemRenderer', []):
        x = parse_row(it)
        if not x:
            continue
        if kind == 'episodes' and x['type'] == 'song':
            meta = x.pop('meta', [])
            x['type'] = 'episode'
            x['date'] = meta[0] if meta else ''
            x['artist'] = re.sub(r'^Podcast\s+', '', meta[-1]) if meta else x['artist']
            x['showId'] = next((b['browseId'] for b in find_all(it, 'browseEndpoint', []) if str(b.get('browseId', '')).startswith('MPSP')), '')
        x.pop('meta', None)
        out.append(x)
    return out


def ytm_feed():
    hit = _browse_cache.get('__feed__')
    if hit and hit[0] > time.time():
        return hit[1]
    with _feed_lock:
        shelves, seen = [], set()
        for bid in ('FEmusic_home', 'FEmusic_charts', 'FEmusic_explore'):
            try:
                data = ytm_call('browse', {'browseId': bid})
            except Exception:
                continue
            for kind, sh in walk_shelves(data, []):
                title = shelf_title(kind, sh)
                items = [x for x in parse_items(sh.get('contents')) if x['type'] in ('song', 'album', 'playlist', 'artist')]
                for x in items:
                    x.pop('meta', None)
                if len(items) >= 3 and title not in seen:
                    seen.add(title)
                    shelves.append({'title': title, 'items': items[:24], 'src': bid})
        _browse_cache['__feed__'] = (time.time() + 1800, shelves)
        return shelves


def ytm_browse(bid):
    hit = _browse_cache.get(bid)
    if hit and hit[0] > time.time():
        return hit[1]
    data = ytm_call('browse', {'browseId': bid})
    head = {}
    for key in ('musicResponsiveHeaderRenderer', 'musicImmersiveHeaderRenderer', 'musicVisualHeaderRenderer', 'musicDetailHeaderRenderer'):
        found = find_all(data, key, [])
        if found:
            head = found[0]
            break
    title = runs_text(head.get('title'))
    strap = runs_text(head.get('straplineTextOne'))
    sub = runs_text(head.get('subtitle'))
    desc = ''
    for d in find_all(data, 'musicDescriptionShelfRenderer', []):
        desc = runs_text(d.get('description'))
        break
    if not desc:
        desc = runs_text(head.get('description', {}).get('musicDescriptionShelfRenderer', {}).get('description')) if isinstance(head.get('description'), dict) else ''
    art = thumb_of(head)
    shelves, tracks = [], []
    for kind, sh in walk_shelves(data, []):
        items = parse_items(sh.get('contents'), show=title)
        for x in items:
            x.pop('meta', None)
            if x['type'] in ('song', 'episode'):
                x['art'] = x.get('art') or art
                x['artist'] = x.get('artist') or strap or title
                if not x.get('album') and bid.startswith('MPRE'):
                    x['album'], x['albumId'] = title, bid
        if not items:
            continue
        if not tracks and kind != 'musicCarouselShelfRenderer' and any(x['type'] in ('song', 'episode') for x in items):
            tracks = [x for x in items if x['type'] in ('song', 'episode')]
        else:
            shelves.append({'title': shelf_title(kind, sh), 'items': items[:24]})
    if not tracks and bid.startswith('MPED') and VID_RE.match(bid[4:]):
        # Halaman satu video: tampilkan videonya sebagai satu lagu, jangan kosong
        tracks = [{'type': 'song', 'vid': bid[4:], 'title': title, 'artist': strap or sub, 'album': '', 'duration': 0, 'art': art}]
    kind = 'album' if bid.startswith('MPRE') else 'podcast' if bid.startswith('MPSP') else 'artist' if bid.startswith('UC') else 'playlist'
    out = {'id': bid, 'kind': kind, 'title': title, 'sub': ' • '.join(x for x in (strap, sub) if x), 'desc': desc[:900], 'art': art,
           'tracks': tracks, 'shelves': shelves}
    _browse_cache[bid] = (time.time() + 1800, out)
    return out


def ytm_radio(vid):
    """Lagu-lagu mirip buat radio otomatis (daftar 'berikutnya' YouTube Music)."""
    return ytm_upnext(vid)['items']


def ytm_upnext(vid, pl='', params=''):
    """Daftar 'Up next' YouTube Music: judul mix, chip suasana (Semua/Temukan/...), dan lagunya."""
    key = f'upnext:{vid}|{pl}|{params}'
    hit = _browse_cache.get(key)
    if hit and hit[0] > time.time():
        return hit[1]
    body = {'videoId': vid, 'playlistId': pl or 'RDAMVM' + vid, 'isAudioOnly': True}
    if params:
        body['params'] = params
    data = ytm_call('next', body)
    head = next(iter(find_all(data, 'musicQueueHeaderRenderer', [])), {})
    chips = []
    for cl in find_all(data, 'subHeaderChipCloud', [])[:1]:
        for c in cl.get('chipCloudRenderer', {}).get('chips', []):
            r = c.get('chipCloudChipRenderer', {})
            we = next(iter(find_all(r, 'watchEndpoint', [])), {})
            if we.get('playlistId'):
                chips.append({'label': runs_text(r.get('text')), 'pl': we['playlistId'], 'params': we.get('params', ''), 'on': bool(r.get('isSelected'))})
    out, seen = [], {vid}
    for it in find_all(data, 'playlistPanelVideoRenderer', []):
        v = it.get('videoId')
        if not v or v in seen or not VID_RE.match(v):
            continue
        seen.add(v)
        artists, album, album_id, artist_id = [], '', '', ''
        runs = it.get('longBylineText', {}).get('runs', [])
        for r in runs:
            pt = page_type(r)
            if pt in ('MUSIC_PAGE_TYPE_ARTIST', 'MUSIC_PAGE_TYPE_USER_CHANNEL'):
                artists.append(r['text'])
                artist_id = artist_id or r['navigationEndpoint']['browseEndpoint']['browseId']
            elif pt == 'MUSIC_PAGE_TYPE_ALBUM':
                album, album_id = r['text'], r['navigationEndpoint']['browseEndpoint']['browseId']
        if not artists and runs:
            artists = [runs[0]['text']]
        dur = runs_text(it.get('lengthText'))
        out.append({'type': 'song', 'vid': v, 'title': runs_text(it.get('title')), 'artist': ', '.join(artists), 'artistId': artist_id,
                    'album': album, 'albumId': album_id, 'duration': parse_duration(dur) if DUR_RE.fullmatch(dur) else 0, 'art': thumb_of(it)})
    res = {'title': runs_text(head.get('subtitle')), 'chips': chips, 'items': out}
    _browse_cache[key] = (time.time() + 1800, res)
    return res


# ---------- lirik (LRCLIB) ----------

LYRICS_CACHE = CACHE / 'lyrics'
LYRICS_CACHE.mkdir(parents=True, exist_ok=True)


def clean_title(t):
    t = re.sub(r'\s*[\(\[][^)\]]*(feat|ft\.|remaster|official|lyric|video|audio|live|version|from)[^)\]]*[\)\]]', '', t, flags=re.I)
    t = re.sub(r'\s+-\s+(remaster|live|official|lyric).*$', '', t, flags=re.I)
    return t.strip()


def lyrics(artist, title, album='', duration=0):
    key = hashlib.sha1(f'{artist}|{title}|{duration}'.lower().encode()).hexdigest()
    p = LYRICS_CACHE / f'{key}.json'
    if p.exists():
        return json.loads(p.read_text(encoding='utf-8'))
    a1 = re.split(r',| & | x | feat\.? ', artist or '', flags=re.I)[0].strip()
    t1 = clean_title(title)
    hdr = {'User-Agent': 'Putar/1.0 (pemutar musik pribadi)'}
    res = None
    try:
        q = {'artist_name': a1, 'track_name': t1}
        if duration:
            q['duration'] = int(duration)
        res = http_json('https://lrclib.net/api/get?' + urllib.parse.urlencode(q), headers=hdr)
    except Exception:
        res = None
    if not res or not (res.get('syncedLyrics') or res.get('plainLyrics')):
        try:
            found = http_json('https://lrclib.net/api/search?' + urllib.parse.urlencode({'track_name': t1, 'artist_name': a1}), headers=hdr)
            if duration:
                found = [f for f in found if abs((f.get('duration') or 0) - duration) < 8] or found
            res = next((f for f in found if f.get('syncedLyrics')), None) or next((f for f in found if f.get('plainLyrics')), None)
        except Exception:
            res = None
    out = {'synced': (res or {}).get('syncedLyrics') or '', 'plain': (res or {}).get('plainLyrics') or '', 'source': 'LRCLIB' if res else ''}
    p.write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
    return out


# ---------- podcast ----------

_feed_cache = {}
ITUNES = '{http://www.itunes.com/dtds/podcast-1.0.dtd}'


def big_art(u):
    return re.sub(r'/\d+x\d+(bb)?\.(jpg|png|webp)$', r'/600x600bb.\2', u or '')


def itunes_shows(results):
    out = []
    for r in results:
        if not r.get('feedUrl'):
            continue
        out.append({'id': str(r.get('collectionId')), 'title': r.get('collectionName') or r.get('trackName') or '',
                    'author': r.get('artistName') or '', 'feed': r['feedUrl'], 'genre': r.get('primaryGenreName') or '',
                    'art': big_art(r.get('artworkUrl600') or r.get('artworkUrl100') or ''), 'count': r.get('trackCount') or 0})
    return out


def pod_search(q):
    url = 'https://itunes.apple.com/search?' + urllib.parse.urlencode({'media': 'podcast', 'entity': 'podcast', 'limit': 30, 'term': q, 'country': user_region()['code'] or 'US'})
    return itunes_shows(http_json(url).get('results', []))


def pod_top():
    hit = _feed_cache.get('__top__')
    if hit and hit[0] > time.time():
        return hit[1]
    cc = (user_region()['code'] or 'US').lower()
    try:
        chart = http_json(f'https://rss.applemarketingtools.com/api/v2/{cc}/podcasts/top/30/podcasts.json')
    except Exception:
        cc = 'us'  # Apple belum punya chart podcast buat semua negara
        chart = http_json('https://rss.applemarketingtools.com/api/v2/us/podcasts/top/30/podcasts.json')
    ids = [x['id'] for x in chart.get('feed', {}).get('results', [])]
    shows = itunes_shows(http_json('https://itunes.apple.com/lookup?' + urllib.parse.urlencode({'id': ','.join(ids), 'country': cc.upper()})).get('results', []))
    order = {i: n for n, i in enumerate(ids)}
    shows.sort(key=lambda s: order.get(s['id'], 999))
    _feed_cache['__top__'] = (time.time() + 6 * 3600, shows)
    return shows


def strip_html(s):
    s = re.sub(r'<br\s*/?>|</p>', '\n', s or '', flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\n{3,}', '\n\n', html.unescape(s)).strip()


def pod_feed(url):
    u = urllib.parse.urlparse(url)
    if u.scheme not in ('http', 'https'):
        raise ValueError('URL feed nggak valid')
    hit = _feed_cache.get(url)
    if hit and hit[0] > time.time():
        return hit[1]
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, */*'})
    with urllib.request.urlopen(req, timeout=20) as r:
        root = ET.fromstring(r.read())
    ch = root.find('channel')
    if ch is None:
        raise ValueError('feed RSS nggak kebaca')
    img = ch.find(f'{ITUNES}image')
    show_art = (img.get('href') if img is not None else '') or (ch.findtext('image/url') or '')
    eps = []
    for it in ch.findall('item')[:400]:
        enc = it.find('enclosure')
        if enc is None or not enc.get('url'):
            continue
        guid = it.findtext('guid') or enc.get('url')
        date = it.findtext('pubDate') or ''
        try:
            ts = int(email.utils.parsedate_to_datetime(date).timestamp() * 1000)
        except Exception:
            ts = 0
        dur = it.findtext(f'{ITUNES}duration') or '0'
        try:
            dur = parse_duration(dur)
        except Exception:
            dur = 0
        eimg = it.find(f'{ITUNES}image')
        desc = strip_html(it.findtext(f'{ITUNES}summary') or it.findtext('description') or '')
        eps.append({'guid': guid, 'title': (it.findtext('title') or '').strip(), 'url': enc.get('url'), 'date': ts,
                    'duration': dur, 'desc': desc[:600], 'art': eimg.get('href') if eimg is not None else ''})
    data = {'title': (ch.findtext('title') or '').strip(), 'author': (ch.findtext(f'{ITUNES}author') or '').strip(),
            'desc': strip_html(ch.findtext('description') or '')[:900], 'art': show_art, 'episodes': eps}
    _feed_cache[url] = (time.time() + 1800, data)
    return data


# ---------- gambar ----------

def ensure_img(url, any_host=False):
    u = urllib.parse.urlparse(url)
    ok_host = u.hostname and (any_host or any(u.hostname.endswith(h) for h in IMG_HOSTS))
    if u.scheme not in ('http', 'https') or not ok_host:
        raise ValueError('host gambar nggak diizinin')
    p = IMG_CACHE / (hashlib.sha1(url.encode()).hexdigest() + '.jpg')
    if p.exists():
        return p
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=15) as r:
        if not (r.headers.get('Content-Type') or 'image/').startswith('image/'):
            raise ValueError('bukan gambar')
        data = r.read(8 * 1024 * 1024)
    p.write_bytes(data)
    return p


# ---------- simpan ke perpustakaan ----------

def load_saved():
    try:
        data = json.loads(SAVED_INDEX.read_text(encoding='utf-8'))
    except Exception:
        return {}
    return {k: (v if isinstance(v, dict) else {'path': v}) for k, v in data.items()}


def saved_path(vid):
    m = load_saved().get(vid)
    return Path(m['path']) if m and Path(m['path']).exists() else None


def safe_name(s):
    s = re.sub(r'[\\/:*?"<>|\x00-\x1f]', ' ', s or '').strip().lstrip('.')
    s = re.sub(r'\s+', ' ', s)[:120].rstrip(' .') or 'Tanpa Judul'
    # Nama perangkat Windows nggak bisa jadi nama file/folder, walau pakai ekstensi
    if re.fullmatch(r'(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?', s, re.I):
        s = '_' + s
    return s


def save_track(meta):
    vid = meta.get('vid', '')
    if not VID_RE.match(vid):
        raise ValueError('id video nggak valid')
    saved = load_saved()
    if vid in saved and Path(saved[vid]['path']).exists():
        return saved[vid]['path']
    src = cached_audio(vid) or download(vid, urgent=True)
    if not src:
        # lagi diunduh di thread lain, tunggu sebentar
        for _ in range(120):
            time.sleep(0.5)
            src = cached_audio(vid)
            if src:
                break
    if not src:
        raise RuntimeError('lagu belum keunduh')
    artist = safe_name(meta.get('artist'))
    title = safe_name(meta.get('title'))
    folder = SAVE_DIR / artist
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / f'{title}.m4a'
    n = 2
    while dest.exists():
        dest = folder / f'{title} ({n}).m4a'
        n += 1

    cover = None
    if meta.get('art'):
        try:
            cover = ensure_img(meta['art'])
        except Exception:
            cover = None

    tags = []
    for k, v in (('title', meta.get('title')), ('artist', meta.get('artist')),
                 ('album_artist', meta.get('artist').split(',')[0] if meta.get('artist') else ''),
                 ('album', meta.get('album') or meta.get('title')), ('comment', f'youtube:{vid}')):
        if v:
            tags += ['-metadata', f'{k}={v}']
    audio_codec = ['-c:a', 'copy'] if src.suffix == '.m4a' else ['-c:a', 'aac', '-b:a', '192k']
    tmp = dest.with_suffix('.tmp.m4a')
    if cover:
        cmd = [FFMPEG, '-loglevel', 'error', '-y', '-i', str(src), '-i', str(cover), '-map', '0:a', '-map', '1:v',
               *audio_codec, '-c:v', 'mjpeg', '-disposition:v', 'attached_pic', *tags, str(tmp)]
    else:
        cmd = [FFMPEG, '-loglevel', 'error', '-y', '-i', str(src), '-map', '0:a', *audio_codec, *tags, str(tmp)]
    r = subprocess.run(cmd, capture_output=True, text=True, errors='replace', timeout=120)
    if r.returncode != 0:
        tmp.unlink(missing_ok=True)
        raise RuntimeError('ffmpeg gagal: ' + (r.stderr.strip().splitlines() or ['?'])[-1])
    tmp.replace(dest)
    saved[vid] = {'path': str(dest), 'title': meta.get('title'), 'artist': meta.get('artist'), 'album': meta.get('album'),
                  'art': meta.get('art'), 'duration': meta.get('duration') or 0, 'at': int(time.time() * 1000)}
    SAVED_INDEX.write_text(json.dumps(saved, ensure_ascii=False, indent=1), encoding='utf-8')
    return str(dest)


# ---------- remote: app lain di Mac ini (mis. Nusa) bisa milih lagu ----------

class Remote:
    """Antrean perintah buat halaman Svara + laporan antrean lagunya.

    Perintah wajib bawa header X-Senandung-Remote, jadi halaman web lain nggak bisa ngirim
    (header khusus bikin browser minta izin CORS dulu, dan server ini nggak ngasih).
    """

    def __init__(self):
        self.lock = threading.Lock()
        self.cmds = []
        self.state = {}

    def push(self, cmd):
        with self.lock:
            self.cmds = (self.cmds + [cmd])[-20:]

    def take(self):
        with self.lock:
            out, self.cmds = self.cmds, []
            return out


remote = Remote()


# ---------- HTTP ----------

class Handler(SimpleHTTPRequestHandler):
    # Registry Windows sering nyetel .js jadi text/plain, padahal <script type=module> nolak itu
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.css': 'text/css',
                      '.html': 'text/html', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
                      '.woff2': 'font/woff2'}

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, fmt, *args):
        if '/api/' in str(args[0] if args else ''):
            sys.stderr.write('%s %s\n' % (time.strftime('%H:%M:%S'), fmt % args))

    def end_headers(self):
        # File app jangan di-cache keras, biar update langsung kepakai
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, p, ctype, cache='private, max-age=31536000'):
        size = p.stat().st_size
        start, end = 0, size - 1
        m = re.match(r'bytes=(\d*)-(\d*)', self.headers.get('Range') or '')
        if m and (m.group(1) or m.group(2)):
            if m.group(1):
                start = int(m.group(1))
                end = int(m.group(2)) if m.group(2) else size - 1
            else:
                start = max(0, size - int(m.group(2)))
            end = min(end, size - 1)
            if start > end:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{size}')
                self.end_headers()
                return
            self.send_response(206)
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        else:
            self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        self.send_header('Cache-Control', cache)
        self.end_headers()
        if self.command == 'HEAD':
            return
        with open(p, 'rb') as f:
            f.seek(start)
            left = end - start + 1
            while left > 0:
                chunk = f.read(min(65536, left))
                if not chunk:
                    break
                self.wfile.write(chunk)
                left -= len(chunk)

    def pipe(self, r):
        """Terusin respons YouTube ke pemutar; kalau mulai dari byte 0, header moov-nya dibenerin dulu."""
        first = r.status == 200 or (r.headers.get('Content-Range') or '').startswith('bytes 0-')
        while True:
            chunk = r.read(256 * 1024 if first else 65536)
            if not chunk:
                break
            if first:
                chunk = bytes(fix_moov(bytearray(chunk)))
                first = False
            self.wfile.write(chunk)

    def proxy_video(self, vid, h):
        info = resolver.get(vid, urgent=True)
        vids = info.get('videos') or {}
        if not vids:
            return self.json({'error': 'video nggak tersedia'}, 404)
        pick = max((k for k in vids if int(k) <= h), key=int, default=min(vids, key=int))
        v = vids[pick]
        rng = self.headers.get('Range')
        req = urllib.request.Request(v['url'], headers={**v['headers'], 'Range': rng if rng and rng.startswith('bytes=') else 'bytes=0-'})
        with urllib.request.urlopen(req, timeout=30) as r:
            self.send_response(206 if r.status == 206 else 200)
            self.send_header('Content-Type', 'video/mp4')
            self.send_header('Accept-Ranges', 'bytes')
            for k in ('Content-Length', 'Content-Range'):
                if r.headers.get(k):
                    self.send_header(k, r.headers[k])
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.pipe(r)

    def proxy_stream(self, vid):
        """Belum ada di cache: langsung alirin dari YouTube sambil unduh penuh di belakang."""
        info = resolver.get(vid, urgent=True)
        # Episode panjang nggak diunduh penuh: cukup di-stream, biar koneksi nggak rebutan
        if (info.get('duration') or 0) < 900:
            bg(download, vid)
        size = info.get('size') or 0
        head = _heads.get(vid)
        rng = self.headers.get('Range') or 'bytes=0-'
        m = re.match(r'bytes=(\d+)-$', rng)
        if head and size and m and int(m.group(1)) < len(head):
            # Bagian awal dari memori dulu, sisanya nyusul dari YouTube.
            # Buka koneksi lanjutan DULU (dengan retry) supaya kegagalan masih bisa diulang
            # sebelum ada byte yang dikirim ke pemutar.
            start = int(m.group(1))
            info2, r = fetch_media(vid, f'bytes={len(head)}-', urgent=True)
            try:
                self.send_response(206)
                self.send_header('Content-Type', TYPES.get('.' + info2['ext'], 'audio/mp4'))
                self.send_header('Accept-Ranges', 'bytes')
                self.send_header('Content-Range', f'bytes {start}-{size - 1}/{size}')
                self.send_header('Content-Length', str(size - start))
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                self.wfile.write(head[start:])
                while True:
                    chunk = r.read(65536)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
            finally:
                r.close()
            return
        rng = self.headers.get('Range')
        info2, r = fetch_media(vid, rng if rng and rng.startswith('bytes=') else 'bytes=0-', urgent=True)
        try:
            self.send_response(206 if r.status == 206 else 200)
            self.send_header('Content-Type', TYPES.get('.' + info2['ext'], 'audio/mp4'))
            self.send_header('Accept-Ranges', 'bytes')
            for h in ('Content-Length', 'Content-Range'):
                if r.headers.get(h):
                    self.send_header(h, r.headers[h])
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.pipe(r)
        finally:
            r.close()

    def api(self):
        u = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(u.query)
        arg = lambda k: (qs.get(k) or [''])[0].strip()
        parts = u.path.split('/')[2:]  # /api/<grup>/<aksi>/...
        group = parts[0] if parts else ''
        action = parts[1] if len(parts) > 1 else ''
        rest = parts[2] if len(parts) > 2 else ''

        if group == 'pod':
            if action == 'search':
                return self.json(pod_search(arg('q')) if arg('q') else [])
            if action == 'top':
                return self.json(pod_top())
            if action == 'feed':
                return self.json(pod_feed(arg('url')))
            if action == 'img':
                return self.send_file(ensure_img(arg('u'), any_host=True), 'image/jpeg')
            return self.json({'error': 'nggak dikenal'}, 404)

        if group == 'remote':
            if action == 'poll':
                return self.json(remote.take())
            if action == 'state':
                return self.json(remote.state)
            return self.json({'error': 'nggak dikenal'}, 404)

        if group == 'lyrics':
            return self.json(lyrics(arg('artist'), arg('title'), arg('album'), float(arg('duration') or 0)))
        if group != 'yt':
            return self.json({'error': 'nggak dikenal'}, 404)
        if action == 'ping':
            return self.json({'ok': bool(YTDLP), 'ytdlp': bool(YTDLP), 'warm': bool(resolver.py), 'ffmpeg': bool(FFMPEG), 'saveDir': str(SAVE_DIR), 'root': str(ROOT)})
        if action == 'img':
            return self.send_file(ensure_img(arg('u')), 'image/jpeg')
        if not YTDLP:
            return self.json({'error': 'yt-dlp belum terpasang (brew install yt-dlp)'}, 500)

        if action == 'search':
            q = arg('q')
            kind = arg('type') or 'songs'
            if not q or kind not in SEARCH_TYPES:
                return self.json([])
            res = ytm_search(q, kind)
            if kind == 'songs' and not res:
                res = ytm_search(q, 'videos')
            # Hasil teratas langsung disiapin, biasanya itu yang diklik
            for r in [x for x in res if x.get('vid')][:3]:
                bg(download, r['vid']) if kind == 'songs' else bg(fetch_head, r['vid'])
            return self.json(res)
        if action == 'upnext' and VID_RE.match(arg('vid')):
            res = ytm_upnext(arg('vid'), arg('pl') or '', arg('params') or '')
            if res['items']:
                bg(download, res['items'][0]['vid'])
            return self.json(res)
        if action == 'radio' and VID_RE.match(arg('vid')):
            res = ytm_radio(arg('vid'))
            if res:
                bg(download, res[0]['vid'])
            return self.json(res)
        if action == 'feed':
            return self.json(ytm_feed())
        if action == 'region':
            r = user_region()
            return self.json({'code': r['code'], 'name': r['name']})
        if action == 'browse':
            d = ytm_browse(arg('id'))
            for t in d['tracks'][:3]:
                bg(fetch_head, t['vid'])
            return self.json(d)

        if action == 'video' and VID_RE.match(rest):
            return self.proxy_video(rest, int(arg('h') or 720))
        if action == 'qualities' and VID_RE.match(rest):
            return self.json(sorted((int(k) for k in (resolver.get(rest).get('videos') or {})), reverse=True))

        if action == 'resolve' and VID_RE.match(rest):
            # Cuma ambil link audio (ringan), buat episode podcast
            bg(fetch_head, rest)
            return self.json({'ok': True})

        if action == 'prepare' and VID_RE.match(rest):
            # resolve dulu (cepat), baru unduh penuh di belakang
            if not cached_audio(rest) and not saved_path(rest):
                bg(download, rest)
            return self.json({'ok': True})

        if action == 'stream' and VID_RE.match(rest):
            p = cached_audio(rest) or saved_path(rest)
            if p:
                os.utime(p)
                return self.send_file(p, TYPES.get(p.suffix, 'application/octet-stream'))
            return self.proxy_stream(rest)

        if action == 'saved':
            return self.json([{'vid': vid, **{k: v for k, v in m.items() if k != 'path'}} for vid, m in load_saved().items() if Path(m['path']).exists()])

        return self.json({'error': 'nggak dikenal'}, 404)

    def do_GET(self):
        if self.path.startswith('/api/'):
            try:
                return self.api()
            except ConnectionError:  # termasuk ConnectionAbortedError, yang muncul di Windows pas seek
                return
            except Exception as e:
                try:
                    return self.json({'error': str(e)}, 502)
                except Exception:
                    return
        return super().do_GET()

    def do_HEAD(self):
        if self.path.startswith('/api/'):
            return self.do_GET()
        return super().do_HEAD()

    def do_POST(self):
        if self.path in ('/api/remote/cmd', '/api/remote/state'):
            if self.headers.get('X-Senandung-Remote') != '1':
                return self.json({'error': 'ditolak'}, 403)
            try:
                n = int(self.headers.get('Content-Length') or 0)
                body = json.loads(self.rfile.read(n) or b'{}')
            except Exception:
                return self.json({'error': 'json nggak valid'}, 400)
            if self.path == '/api/remote/cmd':
                remote.push(body)
            else:
                remote.state = body
            return self.json({'ok': True})
        if self.path != '/api/yt/save':
            return self.json({'error': 'nggak dikenal'}, 404)
        try:
            n = int(self.headers.get('Content-Length') or 0)
            meta = json.loads(self.rfile.read(n) or b'{}')
            return self.json({'path': save_track(meta), 'dir': str(SAVE_DIR)})
        except Exception as e:
            return self.json({'error': str(e)}, 500)


if __name__ == '__main__':
    if not YTDLP:
        print('Peringatan: yt-dlp nggak ketemu, fitur YouTube mati. Pasang: brew install yt-dlp')
    elif not resolver.py:
        print('Catatan: worker yt-dlp cepat nggak aktif, pakai mode biasa (lebih lambat)')
    for part in AUDIO_CACHE.glob('*.part'):
        part.unlink(missing_ok=True)
    # Benerin cache lama yang durasinya kebaca dobel di Mac
    for f in AUDIO_CACHE.glob('*.m4a'):
        fix_moov_file(f)
    # Panasin worker dari awal: lagu pertama nggak perlu nunggu yt-dlp loading
    if resolver.py:
        resolver.warm()
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    srv.daemon_threads = True
    print(f'Svara jalan di http://localhost:{PORT}  (lagu YouTube disimpan ke {SAVE_DIR})')
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
