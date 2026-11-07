import { kv } from './db.js';

/* ================= util ================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const enc = encodeURIComponent;
const fmt = (s) => {
  if (!isFinite(s) || s < 0) s = 0;
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
};
const fmtLong = (s) => {
  const m = Math.max(1, Math.round(s / 60));
  return m < 60 ? `${m} menit` : `${Math.floor(m / 60)} jam ${m % 60} menit`;
};
const shuffled = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const debounce = (fn, ms) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};
const nf = new Intl.NumberFormat('id-ID');
const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isMobile = () => matchMedia('(max-width: 760px)').matches;

function hashStr(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

async function api(path, opts) {
  const r = await fetch(path, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
  return d;
}

// Semua gambar lewat proxy lokal: di-cache dan warnanya bisa dibaca canvas
const img = (u) => (!u ? null : u.startsWith('/') ? u : /googleusercontent|ytimg|ggpht|mzstatic/.test(u) ? `/api/yt/img?u=${enc(u)}` : `/api/pod/img?u=${enc(u)}`);

/* ================= ikon ================= */

const svg = (cls, body) => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${body}</svg>`;
const NEXT = '<path d="M2.5 6.5v11a1 1 0 0 0 1.55.83L12 13v4.5a1 1 0 0 0 1.55.83l8.1-5.5a1 1 0 0 0 0-1.66l-8.1-5.5A1 1 0 0 0 12 6.5V11L4.05 5.67A1 1 0 0 0 2.5 6.5z"/>';
const REPEAT = '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>';
const HEART = '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1 7.8 7.8 7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>';
const SPEAKER = '<path class="fl" d="M11 5 6 9H2v6h4l5 4V5z"/>';
const BOOK = '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"/>';
// Ikon pixel 12×12: tiap '#' satu kotak, digambar tajam tanpa anti-alias
const pix = (rows) => {
  let d = '';
  rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') d += `M${x} ${y}h1v1h-1z`; });
  return `<svg viewBox="0 0 12 12" class="px" aria-hidden="true" shape-rendering="crispEdges"><path d="${d}"/></svg>`;
};
const mirror = (rows) => rows.map((r) => [...r].reverse().join(''));
const P_NEXT = ['', '', '.#.......##.', '.###.....##.', '.#####...##.', '.#######.##.', '.#######.##.', '.#####...##.', '.###.....##.', '.#.......##.'];
const P_HEART = ['', '', '..##....##..', '.####..####.', '.##########.', '.##########.', '..########..', '...######...', '....####....', '.....##.....'];
const P_BOOK = ['', '..########..', '..########..', '..########..', '..########..', '..########..', '..###..###..', '..##....##..', '..#......#..'];
const I = {
  play: pix(['', '..##', '..####', '..######', '..########', '..##########', '..##########', '..########', '..######', '..####', '..##']),
  pause: pix(['', '', '..###..###..', '..###..###..', '..###..###..', '..###..###..', '..###..###..', '..###..###..', '..###..###..', '..###..###..']),
  next: pix(P_NEXT),
  prev: pix(mirror(P_NEXT.map((r) => r.padEnd(12, '.')))),
  shuffle: pix(['', '........#...', '##....######', '..#..#..#...', '...##.......', '...##.......', '..#..#..#...', '##....######', '........#...']),
  repeat: pix(['', '......#.....', '.##########.', '.#....#...#.', '.#........#.', '.#........#.', '.#...#....#.', '.##########.', '.....#......']),
  repeat1: pix(['', '......#.....', '.##########.', '.#....#...#.', '.#...##...#.', '.#....#...#.', '.#...###..#.', '.##########.', '.....#......']),
  vol: pix(['', '.....#......', '....##...#..', '..####.#..#.', '######..#.#.', '######..#.#.', '######..#.#.', '..####.#..#.', '....##...#..', '.....#......']),
  mute: pix(['', '.....#......', '....##......', '..####.#..#.', '######..##..', '######..##..', '..####.#..#.', '....##......', '.....#......']),
  queue: pix(['', '', '##.#########', '', '', '##.#########', '', '', '##.#########']),
  lyrics: pix(['', '############', '#..........#', '#.########.#', '#..........#', '#.#####....#', '#..........#', '#####.######', '....#.#', '....##']),
  heart: pix(['', '', '..##....##..', '.#..#..#..#.', '.#...##...#.', '.#........#.', '..#......#..', '...#....#...', '....#..#....', '.....##.....']),
  heartF: pix(P_HEART),
  more: pix(['', '', '', '', '', '.##..##..##.', '.##..##..##.']),
  down: pix(['', '', '', '', '.##......##.', '..##....##..', '...##..##...', '....####....', '.....##.....']),
  x: pix(['', '.##......##.', '..##....##..', '...##..##...', '....####....', '....####....', '...##..##...', '..##....##..', '.##......##.']),
  note: pix(['', '....#######.', '....#######.', '....#.....#.', '....#.....#.', '....#.....#.', '..###...###.', '.####..####.', '.####..####.', '..##....##..']),
  user: pix(['', '....####....', '...######...', '...######...', '....####....', '', '..########..', '.##########.', '.##########.', '.##########.']),
  save: pix(['.....##.....', '.....##.....', '.....##.....', '..########..', '...######...', '....####....', '.....##.....', '', '.##########.', '.##########.']),
  check: pix(['', '', '..........##', '.........##.', '........##..', '.##....##...', '..##..##....', '...####.....', '....##......']),
  search: pix(['', '..####......', '.#....#.....', '#......#....', '#......#....', '#......#....', '.#....#.....', '..####.#....', '.......##...', '........##..', '.........##.']),
  plus: pix(['', '.....##.....', '.....##.....', '.....##.....', '.....##.....', '.##########.', '.##########.', '.....##.....', '.....##.....', '.....##.....', '.....##.....']),
  mic: pix(['', '....####....', '....####....', '....####....', '....####....', '..#.####.#..', '..#......#..', '...######...', '.....##.....', '...######...']),
  book: pix(['', '..########..', '..#......#..', '..#......#..', '..#......#..', '..#......#..', '..#..##..#..', '..#.#..#.#..', '..##....##..']),
  bookF: pix(P_BOOK),
  arrow: pix(['', '', '', '.......#....', '........#...', '##########..', '##########..', '........#...', '.......#....']),
  home: pix(['', '.....##.....', '....####....', '...######...', '..########..', '.##########.', '..########..', '..###..###..', '..###..###..', '..###..###..']),
  lib: pix(['', '.##..##..#..', '.##..##..##.', '.##..##...#.', '.##..##...##', '.##..##....#', '.##..##....#', '.##..##.....', '.##..##.....']),
  side: pix(['', '############', '#.......#..#', '#.......#..#', '#.......#..#', '#.......#..#', '#.......#..#', '#.......#..#', '############']),
  full: pix(['', '####....####', '#..........#', '#..........#', '', '', '#..........#', '#..........#', '####....####']),
  moon: pix(['', '....####....', '..####......', '.###........', '.##.........', '.##.........', '.###........', '..####...#..', '...#######..', '.....####...']),
  clock: pix(['', '...######...', '..#......#..', '.#...#....#.', '.#...#....#.', '.#...####.#.', '.#........#.', '..#......#..', '...######...']),
};
const EQ = '<span class="eq"><i></i><i></i><i></i></span>';

/* ================= state ================= */

const S = {
  tr: new Map(), // id -> lagu/episode
  coll: {}, // id -> metadata album/playlist/artis/podcast
  browse: new Map(),
  feed: null,
  feedErr: null,
  feedLoading: false,
  search: {},
  lists: {},
  listSeq: 0,
  playlists: [],
  loved: new Set(),
  plays: {},
  savedColl: [],
  subs: [],
  podMeta: {},
  podShows: new Map(),
  podLoading: new Map(),
  podLimit: {},
  podTop: null,
  podTopLoading: false,
  podErr: null,
  podpos: {},
  podDone: new Set(),
  rate: 1,
  offline: null,
  savedVids: new Set(),
  saving: new Set(),
  recentQ: [],
  queue: [],
  base: [],
  idx: -1,
  shuffle: false,
  repeat: 'off',
  volume: 80,
  restorePos: 0,
  panel: null,
  lyr: null,
  lyrCache: new Map(),
  serverOk: null,
  autoplay: true,
  radio: true,
  radioIds: new Set(),
  sleep: null,
};
const audio = $('#audio');
const T = (id) => S.tr.get(id);
const cur = () => T(S.queue[S.idx]);

/* ================= data lagu ================= */

function song(x) {
  const id = `yt:${x.vid}`;
  const o = T(id) || {};
  const t = {
    id, kind: 'song', vid: x.vid, title: x.title || o.title || 'Tanpa judul',
    artist: x.artist || o.artist || '', artistId: x.artistId || o.artistId || '',
    album: x.album || o.album || '', albumId: x.albumId || o.albumId || '',
    duration: x.duration || o.duration || 0, raw: x.art || o.raw || '', art: img(x.art) || o.art || null,
  };
  S.tr.set(id, t);
  return t;
}

function ytEp(x, show = {}) {
  const id = `yt:${x.vid}`;
  const o = T(id) || {};
  const t = {
    id, kind: 'pod', vid: x.vid, src: `/api/yt/stream/${x.vid}`, title: x.title || o.title || 'Episode',
    artist: x.artist || show.title || o.artist || 'Podcast', showHref: show.id ? `#/c/${enc(show.id)}` : x.showId ? `#/c/${enc(x.showId)}` : o.showHref || '', views: x.views || o.views || '',
    dateText: x.date || o.dateText || '', desc: x.desc || o.desc || '', duration: x.duration || o.duration || 0, raw: x.art || o.raw || '', art: img(x.art) || o.art || null,
  };
  S.tr.set(id, t);
  return t;
}

function itemId(x, show) {
  if (x.type === 'song') return song(x).id;
  if (x.type === 'episode') return ytEp(x, show).id;
  return null;
}

function rememberColl(x) {
  if (!x?.id) return;
  const o = S.coll[x.id] || {};
  S.coll[x.id] = { id: x.id, type: x.type || o.type, title: x.title || o.title, sub: x.sub ?? o.sub ?? '', art: x.art || o.art || '' };
}

const saveTracks = debounce(() => {
  const used = new Set([...S.queue, ...S.base, ...S.loved, ...S.playlists.flatMap((p) => p.ids), ...Object.keys(S.plays), ...Object.keys(S.podpos), ...S.podDone]);
  kv.set('tracks', [...S.tr.values()].filter((t) => used.has(t.id)));
}, 700);

/* ================= warna cover ================= */

const artColors = new Map();
const artLoads = new Map();
function avgColor(src) {
  const c = new OffscreenCanvas(24, 24);
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, 0, 0, 24, 24);
  const px = x.getImageData(0, 0, 24, 24).data;
  let r = 0, g = 0, b = 0, w = 0;
  for (let i = 0; i < px.length; i += 4) {
    const mx = Math.max(px[i], px[i + 1], px[i + 2]), mn = Math.min(px[i], px[i + 1], px[i + 2]);
    const wt = ((mx - mn) / 255) * (mx / 255) + 0.04;
    r += px[i] * wt; g += px[i + 1] * wt; b += px[i + 2] * wt; w += wt;
  }
  return [r / w, g / w, b / w].map(Math.round);
}
function artLoad(u) {
  if (!u) return Promise.resolve(null);
  if (artLoads.has(u)) return artLoads.get(u);
  const p = new Promise((res) => {
    const im = new Image();
    im.onload = () => { try { artColors.set(u, avgColor(im)); } catch {} res(u); };
    im.onerror = () => res(null);
    im.src = u;
  });
  artLoads.set(u, p);
  return p;
}

const cover = (u, cls = '') =>
  `<div class="cover ${cls}">${cls.includes('round') ? I.user : I.note}${u ? `<img src="${esc(u)}" alt="" loading="lazy" decoding="async" onload="this.classList.add('ok')">` : ''}</div>`;

/* ================= pemutar ================= */

let counted = false;

function load(i, play = true, at = 0) {
  if (i < 0 || i >= S.queue.length) return;
  S.idx = i;
  const t = cur();
  $('#lcd').classList.add('loading');
  renderBar();
  // Reset tampilan waktu ke lagu BARU, biar durasi lagu sebelumnya nggak nyangkut
  // (dulu left/cur cuma diupdate pas timeupdate, jadi sempat nampilin waktu lagu lama)
  const nd = t?.duration || 0;
  setSeek(nd ? (at / nd) * 1000 : 0);
  $$('[data-np=cur]').forEach((e) => (e.textContent = fmt(at)));
  $$('[data-np=left]').forEach((e) => (e.textContent = nd ? fmt(nd) : '--:--'));
  markPlaying();
  renderQueue();
  loadLyrics();
  if (t.kind === 'pod') {
    audio.src = t.src;
    // Podcast lanjut dari menit terakhir
    if (!at && !S.podDone.has(t.id)) at = S.podpos[t.id] || 0;
  } else {
    audio.src = `/api/yt/stream/${t.vid}`;
  }
  counted = false;
  audio.defaultPlaybackRate = audio.playbackRate = t.kind === 'pod' ? S.rate : 1;
  if (at) audio.currentTime = at;
  S.restorePos = 0;
  if (play) audio.play().catch(() => {});
  setMediaSession(t);
  saveState();
  saveTracks();
  flipArt();
}

function playFrom(ids, i = 0, shuffle = false) {
  ids = ids.filter((id) => T(id));
  if (!ids.length) return;
  if (shuffle) S.shuffle = true;
  S.base = [...ids];
  if (shuffle) {
    S.queue = shuffled(ids);
    i = 0;
  } else if (S.shuffle) {
    const first = ids[i];
    S.queue = [first, ...shuffled(ids.filter((_, k) => k !== i))];
    i = 0;
  } else S.queue = [...ids];
  load(i);
}

function togglePlay() {
  if (S.idx < 0) return toast('Pilih lagu dulu ya');
  if (!audio.src) return load(S.idx, true, S.restorePos);
  audio.paused ? audio.play().catch(() => {}) : audio.pause();
}

let radioLoading = null;
// Kalau antrean mau habis, tambahin lagu mirip dari lagu yang lagi diputar
async function ensureRadio() {
  const t = cur();
  if (!S.radio || !t?.vid || t.kind !== 'song' || S.repeat === 'all' || S.queue.length - S.idx - 1 > 2) return;
  if (radioLoading) return radioLoading;
  radioLoading = (async () => {
    try {
      const items = await api(`/api/yt/radio?vid=${t.vid}`);
      const have = new Set(S.queue);
      const recent = new Set(Object.keys(S.plays).sort((a, b) => S.plays[b].last - S.plays[a].last).slice(0, 30));
      const ids = items.map((x) => song(x).id).filter((id) => !have.has(id) && !recent.has(id)).slice(0, 15);
      if (!ids.length) return;
      ids.forEach((id) => S.radioIds.add(id));
      S.queue.push(...ids);
      S.base.push(...ids);
      prefetch(ids[0]);
      renderQueue();
      renderNowSide(true);
      saveState();
      saveTracks();
    } catch {}
  })();
  try { await radioLoading; } finally { radioLoading = null; }
}

async function next(auto = false) {
  if (!S.queue.length) return;
  if (S.idx + 1 >= S.queue.length && S.radio && S.repeat !== 'all') await ensureRadio();
  if (S.idx + 1 < S.queue.length) return load(S.idx + 1);
  if (S.repeat === 'all' || !auto) return load(0, S.repeat === 'all' || !auto);
  audio.pause();
}

function prev() {
  if (audio.currentTime > 3 || S.idx <= 0) {
    if (!audio.src) return load(Math.max(0, S.idx));
    audio.currentTime = 0;
    return;
  }
  load(S.idx - 1);
}

function toggleShuffle() {
  S.shuffle = !S.shuffle;
  const id = S.queue[S.idx];
  if (S.shuffle) S.queue = [...S.queue.slice(0, S.idx + 1), ...shuffled(S.queue.slice(S.idx + 1))];
  else if (S.base.length) {
    S.queue = [...S.base];
    S.idx = Math.max(0, S.queue.indexOf(id));
  }
  renderBar();
  renderQueue();
  saveState();
  toast(S.shuffle ? 'Acak nyala' : 'Acak mati');
}

function cycleRepeat() {
  S.repeat = { off: 'all', all: 'one', one: 'off' }[S.repeat];
  renderBar();
  saveState();
  toast({ off: 'Ulangi mati', all: 'Ulangi semua', one: 'Ulangi satu lagu' }[S.repeat]);
}

function playNext(ids) {
  if (S.idx < 0) return playFrom(ids);
  S.queue.splice(S.idx + 1, 0, ...ids);
  S.base.splice(S.base.indexOf(S.queue[S.idx]) + 1, 0, ...ids);
  renderQueue();
  saveState();
  saveTracks();
  toast(ids.length > 1 ? `${ids.length} lagu diputar berikutnya` : 'Diputar berikutnya');
}

function addToQueue(ids) {
  if (S.idx < 0) return playFrom(ids);
  S.queue.push(...ids);
  S.base.push(...ids);
  renderQueue();
  saveState();
  saveTracks();
  toast(ids.length > 1 ? `${ids.length} lagu masuk antrean` : 'Masuk antrean');
}

function removeAt(qi) {
  if (qi === S.idx) return;
  const [id] = S.queue.splice(qi, 1);
  if (qi < S.idx) S.idx--;
  const bi = S.base.indexOf(id);
  if (bi >= 0) S.base.splice(bi, 1);
  renderQueue();
  saveState();
}

function seekTo(sec) {
  if (!audio.src) { S.restorePos = Math.max(0, sec); return; }
  audio.currentTime = Math.max(0, Math.min(sec, isFinite(audio.duration) ? audio.duration : sec));
}

function setVolume(v) {
  S.volume = v;
  audio.volume = (v / 100) ** 2;
  audio.muted = false;
  $$('input.vol').forEach((r) => { r.value = v; r.style.setProperty('--p', v + '%'); });
  renderMute();
  saveState();
}

function renderMute() {
  const m = audio.muted || S.volume === 0;
  $$('[data-act=mute]').forEach((b) => (b.innerHTML = m ? I.mute : I.vol));
}

const stopLoading = () => { $('#lcd').classList.remove('loading'); renderPlayBtn(); };
audio.addEventListener('playing', () => {
  stopLoading();
  // Siapin lagu berikutnya biar pindah lagu langsung bunyi
  prefetch(S.queue[S.idx + 1]);
  ensureRadio();
});
audio.addEventListener('canplay', stopLoading);
audio.addEventListener('play', () => {
  document.body.classList.remove('paused');
  renderPlayBtn(true);
  const t = cur();
  if (t && !counted) {
    counted = true;
    const p = (S.plays[t.id] ||= { n: 0, last: 0 });
    p.n++;
    p.last = Date.now();
    savePlays();
  }
  lyrLoop();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});
audio.addEventListener('pause', () => {
  document.body.classList.add('paused');
  renderPlayBtn(true);
  saveState();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
});
/* ---------- timer tidur ---------- */

let sleepVol = null;
function setSleep(v) {
  S.sleep = v;
  if (sleepVol !== null) { audio.volume = sleepVol; sleepVol = null; }
  renderSleep();
  if (!v) return toast('Timer tidur dimatiin');
  toast(v.endOfTrack ? 'Musik berhenti habis lagu ini' : `Musik berhenti ${Math.round((v.until - Date.now()) / 60000)} menit lagi`);
}
function renderSleep() {
  const left = S.sleep?.until ? Math.max(0, Math.ceil((S.sleep.until - Date.now()) / 60000)) : 0;
  $$('[data-act=sleep]').forEach((b) => {
    b.classList.toggle('on', !!S.sleep);
    b.title = !S.sleep ? 'Timer tidur' : S.sleep.endOfTrack ? 'Berhenti habis lagu ini' : `Berhenti ${left} menit lagi`;
    b.dataset.left = S.sleep?.until ? `${left}m` : S.sleep ? '1' : '';
  });
}
function sleepMenu(el) {
  const r = el.getBoundingClientRect();
  const m = (min) => ({ label: `${min} menit`, act: () => setSleep({ until: Date.now() + min * 60000 }) });
  showMenu(r.left - 140, r.top - 250, [
    ...(S.sleep ? [{ label: 'Matiin timer', danger: true, act: () => setSleep(null) }, '-'] : []),
    m(15), m(30), m(45), m(60),
    { label: 'Habis lagu ini', act: () => setSleep({ endOfTrack: true }) },
  ]);
}
function sleepStop() {
  audio.pause();
  if (sleepVol !== null) audio.volume = sleepVol;
  sleepVol = null;
  S.sleep = null;
  renderSleep();
  toast('Timer tidur: musik dijeda, selamat istirahat');
}
setInterval(() => {
  if (!S.sleep?.until) return;
  const left = S.sleep.until - Date.now();
  // Volume turun pelan di 10 detik terakhir
  if (left <= 10000 && left > 0 && !audio.paused) {
    if (sleepVol === null) sleepVol = audio.volume;
    audio.volume = sleepVol * (left / 10000);
  }
  if (left <= 0) sleepStop();
  else renderSleep();
}, 1000);

// Ulangi satu lagu: muat ulang src-nya, jangan cuma currentTime = 0. Di app Mac (WKWebView)
// seek ke 0 habis 'ended' bisa bikin pemutar nyangkut di 0:00 / 0:00 padahal statusnya main.
function replay() {
  counted = false;
  audio.load();
  audio.play().catch(() => {});
  // Pengaman: kalau 5 detik kemudian masih belum jalan juga, muat ulang lagunya dari nol
  const id = S.queue[S.idx];
  setTimeout(() => {
    if (S.queue[S.idx] === id && S.repeat === 'one' && !audio.paused && !(audio.currentTime > 0.3)) load(S.idx);
  }, 5000);
}

audio.addEventListener('ended', () => {
  if (S.sleep?.endOfTrack) { audio.currentTime = 0; return sleepStop(); }
  if (cur()?.kind === 'pod') {
    markDone(cur().id);
    if (!S.autoplay && S.repeat !== 'one') return;
  }
  if (S.repeat === 'one') replay();
  else next(true);
});
audio.addEventListener('error', () => {
  stopLoading();
  if (!audio.src) return;
  const t = cur();
  if (S.serverOk === false) return toast('Server Senandung belum nyala, jalanin ./senandung dulu');
  toast(t?.kind === 'pod' ? 'Episode ini gagal diputar' : `“${t?.title}” gagal diputar, lanjut ke berikutnya`);
  if (S.idx + 1 < S.queue.length) setTimeout(() => cur() === t && next(true), 1400);
});
audio.addEventListener('loadedmetadata', () => {
  const t = cur();
  if (t && isFinite(audio.duration) && Math.abs((t.duration || 0) - audio.duration) > 2) {
    t.duration = audio.duration;
    saveTracks();
  }
  tick();
});

// WebKit kadang ngasih durasi Infinity/NaN (mis. pas muter ulang), jangan sampai tampilan jadi 0:00 / 0:00
const durNow = () => (isFinite(audio.duration) && audio.duration > 0 ? audio.duration : cur()?.duration || 0);
const posNow = () => (audio.src ? (isFinite(audio.currentTime) ? audio.currentTime : 0) : S.restorePos);

let seeking = false;
let lastSave = 0;
function setSeek(v) {
  const p = v / 10 + '%';
  for (const r of $$('input.seek')) {
    r.value = v;
    r.parentElement.style.setProperty('--p', p);
  }
  $('#lcd').style.setProperty('--p', p);
}
function tick() {
  const d = durNow();
  const c = posNow();
  if (!seeking) {
    setSeek(d ? Math.min(1, c / d) * 1000 : 0);
    $$('[data-np=cur]').forEach((e) => (e.textContent = fmt(c)));
    $$('[data-np=left]').forEach((e) => (e.textContent = fmt(d)));
  }
  if (audio.paused) syncLyrics(c);
  updateSideLyr();
  const t = cur();
  if (t?.kind === 'pod' && audio.src && !audio.paused && c > 5) {
    if (d && c > d - 25) {
      if (!S.podDone.has(t.id)) markDone(t.id);
    } else {
      S.podpos[t.id] = c;
      savePod();
    }
  }
  if (Date.now() - lastSave > 5000) { lastSave = Date.now(); saveState(); }
  if ('mediaSession' in navigator && d && isFinite(d) && audio.src) {
    try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(c, d), playbackRate: audio.playbackRate }); } catch {}
  }
}
audio.addEventListener('timeupdate', tick);

for (const r of $$('input.seek')) {
  r.addEventListener('input', () => {
    seeking = true;
    const d = durNow();
    const c = (r.value / 1000) * d;
    setSeek(r.value);
    $$('[data-np=cur]').forEach((e) => (e.textContent = fmt(c)));
    $$('[data-np=left]').forEach((e) => (e.textContent = fmt(d)));
  });
  r.addEventListener('change', () => {
    const d = durNow();
    seekTo((r.value / 1000) * d);
    seeking = false;
    tick();
  });
}
for (const r of $$('input.vol')) r.addEventListener('input', () => setVolume(+r.value));

function setMediaSession(t) {
  document.title = `${t.title} · ${t.artist}`;
  if (!('mediaSession' in navigator)) return;
  const meta = { title: t.title, artist: t.artist, album: t.album || '' };
  navigator.mediaSession.metadata = new MediaMetadata(t.art ? { ...meta, artwork: [{ src: t.art, sizes: '544x544', type: 'image/jpeg' }] } : meta);
}
if ('mediaSession' in navigator) {
  const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch {} };
  h('play', () => togglePlay());
  h('pause', () => audio.pause());
  h('previoustrack', prev);
  h('nexttrack', () => next());
  h('seekto', (e) => seekTo(e.seekTime));
  h('seekbackward', () => seekTo(audio.currentTime - 10));
  h('seekforward', () => seekTo(audio.currentTime + 10));
}

// Siapin audio sebelum diklik, biar langsung bunyi.
// Lagu diunduh penuh (kecil); episode cukup diambil link-nya (file-nya gede)
const prepared = new Set();
function prefetch(id) {
  const t = T(id);
  if (!t?.vid || prepared.has(t.vid)) return;
  prepared.add(t.vid);
  fetch(`/api/yt/${t.kind === 'pod' ? 'resolve' : 'prepare'}/${t.vid}`).catch(() => prepared.delete(t.vid));
}

/* ================= bar & layar sedang diputar ================= */

let wasPlaying = null;
function renderPlayBtn(animate = false) {
  const playing = !audio.paused;
  const st = $('[data-np=state]');
  if (st) st.textContent = !cur() ? 'Siap' : $('#lcd').classList.contains('loading') && audio.paused ? 'Memuat' : playing ? 'Playing' : 'Jeda';
  $$('[data-act=play]').forEach((b) => {
    b.innerHTML = playing ? I.pause : I.play;
    b.title = playing ? 'Jeda (Spasi)' : 'Putar (Spasi)';
    if (animate && wasPlaying !== playing && !reduceMotion.matches) {
      b.animate([{ transform: 'scale(.8) rotate(-8deg)' }, { transform: 'scale(1.1) rotate(3deg)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.34,1.45,.55,1)' });
    }
  });
  wasPlaying = playing;
}

let lastWave = null;
let npColorKey;
// Waveform dekoratif yang konsisten per lagu (dari hash id)
function waveHtml(seed, n) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  const rnd = () => ((h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 4294967296);
  let v = 0.5;
  let out = '';
  for (let i = 0; i < n; i++) {
    const env = 0.55 + 0.45 * Math.sin(Math.PI * (i + 0.5) / n);
    v = v * 0.4 + rnd() * 0.6;
    out += `<i style="--h:${Math.round((0.16 + v * 0.84 * env) * 100)}%;--i:${i}"></i>`;
  }
  return out;
}

function subHtml(t) {
  if (!t) return S.idx < 0 ? 'Pilih lagu buat mulai' : '';
  if (t.kind === 'pod') return t.showHref ? `<a href="${t.showHref}">${esc(t.artist)}</a>` : esc(t.artist);
  const a = t.artistId ? `<a href="#/c/${enc(t.artistId)}">${esc(t.artist)}</a>` : `<a href="#/search/songs/${enc(t.artist)}">${esc(t.artist)}</a>`;
  return t.album ? `${a} — ${t.albumId ? `<a href="#/c/${enc(t.albumId)}">${esc(t.album)}</a>` : esc(t.album)}` : a;
}

function marquee(el, text) {
  el.classList.remove('marq');
  el.textContent = text;
  requestAnimationFrame(() => {
    if (el.scrollWidth <= el.clientWidth + 2) return;
    el.classList.add('marq');
    el.style.setProperty('--mqd', `${Math.max(8, text.length * 0.3)}s`);
    el.innerHTML = `<span class="mq"><span>${esc(text)}</span><span aria-hidden="true">${esc(text)}</span></span>`;
  });
}

function renderBar() {
  const t = cur();
  renderPlayBtn();
  $$('[data-act=prev]').forEach((b) => (b.innerHTML = I.prev));
  $$('[data-act=next]').forEach((b) => (b.innerHTML = I.next));
  $$('[data-act=shuffle]').forEach((b) => { b.innerHTML = I.shuffle; b.classList.toggle('on', S.shuffle); });
  $$('[data-act=repeat]').forEach((b) => { b.innerHTML = S.repeat === 'one' ? I.repeat1 : I.repeat; b.classList.toggle('on', S.repeat !== 'off'); });
  $$('[data-act=queue]').forEach((b) => { b.innerHTML = I.queue; b.classList.toggle('on', S.panel === 'queue'); });
  $$('[data-act=lyrics]').forEach((b) => {
    b.innerHTML = I.lyrics;
    b.classList.toggle('on', S.panel === 'lyrics');
    b.classList.toggle('has', !!(S.lyr && !S.lyr.none));
  });
  $('.np-close').innerHTML = I.down;
  renderMute();
  const loved = t && S.loved.has(t.id);
  $$('[data-act=love]').forEach((b) => {
    b.innerHTML = loved ? I.heartF : I.heart;
    b.classList.toggle('on', !!loved);
    b.disabled = !t;
  });
  $('#lcd').classList.toggle('empty', !t);
  document.body.classList.toggle('is-pod', t?.kind === 'pod');
  document.body.classList.toggle('has-track', !!t);
  $$('[data-act=rate]').forEach((b) => (b.textContent = `${S.rate}×`));

  const title = t ? t.title : 'Senandung';
  for (const e of $$('[data-np=title]')) if (e.dataset.v !== title) { e.dataset.v = title; marquee(e, title); }
  $$('[data-np=sub]').forEach((e) => (e.innerHTML = subHtml(t)));

  const wid = t?.id || '';
  if (wid !== lastWave) {
    lastWave = wid;
    for (const w of $$('.wave')) {
      const bars = waveHtml(wid || 'kosong', w.classList.contains('big') ? 54 : 70);
      w.querySelector('.bgw').innerHTML = bars;
      w.querySelector('.fgw').innerHTML = bars;
    }
  }
  const art = t?.art || null;
  for (const im of [$('.lcd-art img'), $('.np-art img')]) {
    if (im.dataset.src === (art || '')) continue;
    im.dataset.src = art || '';
    im.classList.remove('ok');
    if (art) { im.onload = () => im.classList.add('ok'); im.src = art; } else im.removeAttribute('src');
  }
  if (art !== npColorKey) {
    npColorKey = art;
    if (art) artLoad(art).then(() => npColorKey === art && setNpColor(artColors.get(art)));
    else setNpColor(null);
  }
  if (!t) document.title = 'Senandung';
  tick();
  renderNowSide();
}

/* ---------- panel kanan: sedang diputar / antrean ---------- */

let sideKey = '';
let sideLyrK = -2;
function renderNowSide(force) {
  const el = $('#side');
  if (!el) return;
  const t = cur();
  const key = [t?.id, S.panel, S.lyr ? (S.lyr.none ? 'n' : S.lyr.lines.length) : '-', S.loved.has(t?.id), S.queue.slice(S.idx + 1, S.idx + 4).join()].join('|');
  if (!force && key === sideKey) return;
  sideKey = key;
  if (S.panel === 'queue' && !npOpen()) {
    el.innerHTML = `<div class="side-h"><b>Antrean</b><button class="ib sm" data-act="queue" aria-label="Tutup antrean">${I.x}</button></div><div class="side-scroll">${queueHtml()}</div>`;
    return;
  }
  if (!t) {
    el.innerHTML = `<div class="side-empty"><figure class="poster"><img src="assets/band.jpg" alt="Ilustrasi band main musik bareng" width="720" height="888"></figure><b>Belum ada yang diputar</b><p>Pilih lagu dari beranda, atau cari lagu favorit lo di atas.</p></div>`;
    return;
  }
  const up = S.queue.slice(S.idx + 1, S.idx + 4).filter((id) => T(id));
  el.innerHTML = `<div class="side-h"><b>${esc(t.album || t.artist)}</b><button class="ib sm" data-act="side" title="Tutup panel" aria-label="Tutup panel">${I.x}</button></div>
    <div class="side-scroll">
      <button class="side-art" data-act="np" aria-label="Layar penuh">${cover(t.art)}</button>
      <div class="viz" aria-hidden="true">${'<i></i>'.repeat(16)}</div>
      <div class="side-meta"><div><b>${esc(t.title)}</b><small>${subLink(t)}</small></div><button class="ib" data-act="love" aria-label="Suka">${S.loved.has(t.id) ? I.heartF : I.heart}</button></div>
      <div class="side-card side-lyr" data-act="lyrics"><div class="sc-h"><b>Lirik</b><span>Tampilkan semua</span></div><div class="sl-body">${sideLyrHtml()}</div></div>
      ${up.length ? `<div class="side-card"><div class="sc-h"><b>Berikutnya${S.radio ? ' <em class="rtag">radio</em>' : ''}</b><button class="link" data-act="queue">Buka antrean</button></div>${up.map((id) => { const x = T(id); return `<div class="side-next" data-qi="${S.queue.indexOf(id, S.idx + 1)}">${cover(x.art, 'sm')}<span><b>${esc(x.title)}</b><small>${esc(x.artist)}</small></span></div>`; }).join('')}</div>` : ''}
    </div>`;
  $$('[data-act=love]', el).forEach((b) => b.classList.toggle('on', S.loved.has(t.id)));
}

function sideLyrK0() {
  if (!S.lyr?.synced) return -1;
  const c = audio.currentTime;
  let k = -1;
  for (let i = 0; i < S.lyr.lines.length; i++) { if (S.lyr.lines[i].t <= c + 0.15) k = i; else break; }
  return k;
}
function sideLyrHtml() {
  if (cur()?.kind !== 'song') return '<p class="sl-note">Nggak ada lirik.</p>';
  if (!S.lyr) return '<p class="sl-note">Lagi nyari lirik…</p>';
  if (S.lyr.none) return '<p class="sl-note">Lirik belum tersedia buat lagu ini.</p>';
  const L = S.lyr.lines;
  const k = sideLyrK0();
  sideLyrK = k;
  const from = S.lyr.synced ? Math.max(0, k - 1) : 0;
  return L.slice(from, from + 5).map((l, j) => `<p class="${from + j === k ? 'on' : from + j < k ? 'past' : ''}">${esc(l.text) || '♪'}</p>`).join('');
}
function updateSideLyr() {
  if (!S.lyr?.synced) return;
  const k = sideLyrK0();
  if (k === sideLyrK) return;
  const b = $('#side .sl-body');
  if (b) b.innerHTML = sideLyrHtml();
}

function setNpColor(c) {
  const np = $('#np');
  if (!c) { np.style.removeProperty('--np-bg'); return; }
  const [r, g, b] = c.map((x) => x / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  }
  const sat = Math.max(38, Math.min(s * 100, 78));
  np.style.setProperty('--np-bg', `hsl(${h} ${sat}% 82%)`);
  np.style.setProperty('--np-bg2', `hsl(${(h + 40) % 360} ${sat}% 70%)`);
}

function flipArt() {
  if (reduceMotion.matches) return;
  for (const el of $$('.lcd-art, .np.open .np-art')) {
    el.animate([{ transform: 'perspective(400px) rotateY(80deg) scale(.9)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.34,1.45,.55,1)' });
  }
}

const npOpen = () => $('#np').classList.contains('open');
function openNp(open) {
  const np = $('#np');
  open ??= !npOpen();
  if (open && !cur()) return;
  np.classList.toggle('open', open);
  np.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('np-open', open);
  if (open && S.panel === null && S.lyr && !S.lyr.none) S.panel = 'lyrics';
  renderPanels();
  lyrLoop();
}

function renderPanels() {
  $('#np').classList.toggle('has-right', !!S.panel);
  renderNowSide(true);
  renderBar();
  renderQueue();
  renderLyrics();
}

function togglePanel(p) {
  if (p === 'lyrics' && !npOpen()) {
    S.panel = 'lyrics';
    return openNp(true);
  }
  S.panel = S.panel === p ? null : p;
  renderPanels();
  lyrLoop();
  saveState();
}

/* ================= antrean ================= */

function queueHtml() {
  const t = cur();
  if (!t) return `<div class="qbox q-empty">${I.queue}<p>Antrean kosong.<br>Putar lagu atau album buat ngisi.</p></div>`;
  const row = (id, qi) => {
    const x = T(id);
    return `<li class="q-row" data-qi="${qi}" draggable="true">${cover(x.art, 'sm')}
      <div class="q-txt"><div>${esc(x.title)}</div><span>${S.radioIds.has(id) ? '<em class="rtag">radio</em> ' : ''}${esc(x.artist)}</span></div>
      <button class="ib xs" data-do="qremove" title="Hapus dari antrean" aria-label="Hapus">${I.x}</button></li>`;
  };
  const up = S.queue.slice(S.idx + 1);
  const shown = up.slice(0, 200);
  return `<div class="qbox"><div class="q-h"><h3>Sedang diputar</h3></div>
    <div class="q-now">${cover(t.art, 'sm')}<div class="q-txt"><div>${esc(t.title)}</div><span>${esc(t.artist)}</span></div>${EQ}</div>
    <button class="radio-sw${S.radio ? ' on' : ''}" data-do="radio"><span><b>Radio otomatis</b><small>Lanjut ke lagu mirip kalau antrean habis</small></span><i></i></button>
    <div class="q-h"><h3>Berikutnya <small>${up.length ? nf.format(up.length) : ''}</small></h3>${up.length ? '<button class="link" data-do="qclear">Bersihkan</button>' : ''}</div>
    ${up.length ? `<ol class="q-list">${shown.map((id, k) => row(id, S.idx + 1 + k)).join('')}</ol>` : `<p class="q-note">${S.repeat === 'all' ? 'Habis ini balik ke awal.' : 'Nggak ada lagi setelah ini.'}</p>`}</div>`;
}

function renderQueue() {
  if (!npOpen() && S.panel === 'queue') renderNowSide(true);
  if (npOpen() && S.panel === 'queue') $('#npRight').innerHTML = `<div class="np-q">${queueHtml()}</div>`;
}

let dragQi = null;
document.addEventListener('dragstart', (e) => {
  const li = e.target.closest?.('.q-row');
  if (li) { dragQi = +li.dataset.qi; e.dataTransfer.effectAllowed = 'move'; return; }
  const row = e.target.closest?.('.tr[data-id]');
  if (row) {
    e.dataTransfer.setData('text/x-putar', JSON.stringify([row.dataset.id]));
    e.dataTransfer.effectAllowed = 'copy';
    document.body.classList.add('dragging');
  }
});
document.addEventListener('dragend', () => {
  dragQi = null;
  document.body.classList.remove('dragging');
  $$('.drop-on').forEach((x) => x.classList.remove('drop-on'));
});
document.addEventListener('dragover', (e) => {
  const tgt = e.target.closest?.(dragQi !== null ? '.q-row' : '[data-pl-drop]');
  if (!tgt || (dragQi === null && !e.dataTransfer.types.includes('text/x-putar'))) return;
  e.preventDefault();
  $$('.drop-on').forEach((x) => x !== tgt && x.classList.remove('drop-on'));
  tgt.classList.add('drop-on');
});
document.addEventListener('drop', (e) => {
  const li = e.target.closest?.('.q-row');
  if (li && dragQi !== null) {
    e.preventDefault();
    const [id] = S.queue.splice(dragQi, 1);
    S.queue.splice(+li.dataset.qi, 0, id);
    renderQueue();
    return saveState();
  }
  const pl = e.target.closest?.('[data-pl-drop]');
  if (pl && e.dataTransfer.types.includes('text/x-putar')) {
    e.preventDefault();
    addToPlaylist(pl.dataset.plDrop, JSON.parse(e.dataTransfer.getData('text/x-putar')));
  }
});

/* ================= lirik (LRCLIB, diambil pas diputar) ================= */

function parseLrc(txt) {
  const lines = [];
  for (const raw of txt.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:[.:]\d+)?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const s of stamps) lines.push({ t: +s[1] * 60 + parseFloat(s[2].replace(':', '.')), text });
  }
  return lines.sort((a, b) => a.t - b.t);
}

async function loadLyrics() {
  const t = cur();
  S.lyr = null;
  renderLyrics();
  if (!t || t.kind !== 'song') return;
  let res = S.lyrCache.get(t.id);
  if (!res) {
    try {
      res = await api(`/api/lyrics?artist=${enc(t.artist)}&title=${enc(t.title)}&album=${enc(t.album)}&duration=${Math.round(t.duration || 0)}`);
    } catch {
      res = {};
    }
    S.lyrCache.set(t.id, res);
  }
  if (cur() !== t) return;
  const synced = parseLrc(res.synced || '');
  S.lyr = synced.length > 2
    ? { id: t.id, synced: true, lines: synced }
    : res.plain ? { id: t.id, synced: false, lines: res.plain.split(/\r?\n/).map((text) => ({ text: text.trim() })) } : { id: t.id, none: true };
  lyrLine = -1;
  if (npOpen() && !S.panel && !S.lyr.none) S.panel = 'lyrics';
  renderPanels();
  lyrLoop();
}

let lyrLine = -1;
let userScrollUntil = 0;
function renderLyrics() {
  if (!npOpen() || S.panel !== 'lyrics') return;
  const box = $('#npRight');
  const t = cur();
  if (t?.kind === 'pod') {
    box.innerHTML = `<div class="lyr-empty">${I.mic}<p>Podcast nggak punya lirik.</p><small>Buka antrean buat lihat episode berikutnya.</small></div>`;
    return;
  }
  if (!S.lyr) {
    box.innerHTML = `<div class="lyr-load">${[70, 52, 84, 60, 76, 44].map((w) => `<b style="--w:${w}%"></b>`).join('')}</div>`;
    return;
  }
  if (S.lyr.none) {
    box.innerHTML = `<div class="lyr-empty">${I.lyrics}<p>Lirik belum ada buat lagu ini.</p><small>Database lirik LRCLIB belum punya lagu ini. Lagu populer biasanya udah lengkap.</small></div>`;
    return;
  }
  box.innerHTML = `<div class="lyr ${S.lyr.synced ? 'synced' : ''}">${S.lyr.lines
    .map((l, i) => `<p data-li="${i}" ${l.t != null ? `data-t="${l.t}"` : ''}><span>${esc(l.text) || '• • •'}</span></p>`)
    .join('')}<small class="lyr-src">Lirik dari LRCLIB</small></div>`;
  lyrLine = -1;
  syncLyrics(audio.currentTime, true);
}

function syncLyrics(c, instant) {
  if (!S.lyr?.synced || S.panel !== 'lyrics' || !npOpen()) return;
  const L = S.lyr.lines;
  let k = -1;
  for (let i = 0; i < L.length; i++) { if (L[i].t <= c + 0.15) k = i; else break; }
  const box = $('.lyr');
  if (!box) return;
  if (k !== lyrLine) {
    lyrLine = k;
    $$('p', box).forEach((p, i) => { p.classList.toggle('on', i === k); p.classList.toggle('past', i < k); });
    const el = box.children[Math.max(0, k)];
    if (el && Date.now() > userScrollUntil) box.scrollTo({ top: el.offsetTop - box.clientHeight * 0.36, behavior: instant ? 'auto' : 'smooth' });
  }
  // Isi warna karaoke di baris aktif
  if (k >= 0) {
    const end = L[k + 1]?.t ?? L[k].t + 4;
    const lp = Math.min(1, Math.max(0, (c - L[k].t) / Math.max(0.4, end - L[k].t)));
    box.children[k]?.style.setProperty('--lp', (lp * 100).toFixed(1) + '%');
  }
}

let lyrRaf;
function lyrLoop() {
  cancelAnimationFrame(lyrRaf);
  const step = () => {
    if (!npOpen() || S.panel !== 'lyrics' || !S.lyr?.synced) return;
    syncLyrics(audio.currentTime);
    if (!audio.paused) lyrRaf = requestAnimationFrame(step);
  };
  lyrRaf = requestAnimationFrame(step);
}
$('#npRight').addEventListener('click', (e) => {
  const p = e.target.closest('.lyr.synced p[data-t]');
  if (!p) return;
  userScrollUntil = 0;
  seekTo(+p.dataset.t);
  if (audio.paused) togglePlay();
});
for (const ev of ['wheel', 'touchmove']) $('#npRight').addEventListener(ev, () => (userScrollUntil = Date.now() + 3000), { passive: true });

/* ================= potongan tampilan ================= */

function listKey(ids) {
  const k = `l${S.listSeq++}`;
  S.lists[k] = ids;
  return k;
}

function subLink(t) {
  if (t.kind === 'pod') return t.showHref ? `<a href="${t.showHref}">${esc(t.artist)}</a>` : esc(t.artist);
  return t.artistId ? `<a href="#/c/${enc(t.artistId)}">${esc(t.artist)}</a>` : esc(t.artist);
}

function saveBtn(t) {
  if (t.kind !== 'song') return '';
  if (S.savedVids.has(t.vid)) return `<span class="ib xs saved" title="Udah ada offline">${I.check}</span>`;
  if (S.saving.has(t.vid)) return `<span class="ib xs saving" title="Lagi download…"><i class="spin"></i></span>`;
  return `<button class="ib xs" data-do="save" title="Download buat offline" aria-label="Download">${I.save}</button>`;
}

function trackList(ids, mode = 'full', opt = {}) {
  ids = ids.filter((id) => T(id));
  if (!ids.length) return `<p class="empty-note">${opt.empty || 'Belum ada lagu.'}</p>`;
  const key = listKey(ids);
  const shown = opt.limit ? ids.slice(0, opt.limit) : ids;
  const rows = shown.map((id, i) => {
    const t = T(id);
    const love = S.loved.has(id) ? `<span class="lv">${I.heartF}</span>` : '';
    const pc = `<span class="n"><span class="pc"><em>${i + 1}</em>${EQ}<i class="hp">${I.play}</i></span></span>`;
    const tail = `<span class="td">${love}${t.duration ? fmt(t.duration) : ''}</span><span class="tm">${saveBtn(t)}<button class="ib xs" data-do="more" title="Lainnya" aria-label="Lainnya">${I.more}</button></span>`;
    const done = S.podDone.has(id);
    const attrs = `class="tr${done ? ' done' : ''}${mode === 'pod' ? ' ep' : ''}" data-id="${esc(id)}" data-ml="${key}" data-i="${i}" draggable="true"`;
    if (mode === 'pod') {
      const pos = S.podpos[id];
      const prog = done ? 100 : pos && t.duration ? Math.min(100, (pos / t.duration) * 100) : 0;
      const meta = [opt.showName ? subLink(t) : '', t.date ? dateFmt.format(t.date) : esc(t.dateText || ''),
        done ? '<em class="ep-ok">Selesai</em>' : pos && t.duration ? `<em>sisa ${fmt(t.duration - pos)}</em>` : ''].filter(Boolean).join(' · ');
      return `<div ${attrs}><span class="ep-thumb">${cover(t.art, 'wide')}<span class="pc">${EQ}<i class="hp">${I.play}</i></span>${t.duration ? `<span class="ep-dur mono">${fmt(t.duration)}</span>` : ''}${prog ? `<span class="ep-prog"><i style="--p:${prog.toFixed(1)}%"></i></span>` : ''}</span>
        <span class="ep-body"><b>${esc(t.title)}</b><small>${meta}</small>${t.desc ? `<p>${esc(t.desc)}</p>` : ''}</span>
        <span class="tm">${love}<button class="ib xs" data-do="more" title="Lainnya" aria-label="Lainnya">${I.more}</button></span></div>`;
    }
    if (mode === 'album') {
      return `<div ${attrs}>${pc}<span class="tt"><span class="tt-t"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span></span>${tail}</div>`;
    }
    const album = t.kind === 'pod' ? 'Podcast' : t.albumId ? `<a href="#/c/${enc(t.albumId)}">${esc(t.album)}</a>` : esc(t.album);
    return `<div ${attrs}>${pc}<span class="tt">${cover(t.art, 'xs')}<span class="tt-t"><b>${esc(t.title)}</b><small>${subLink(t)}</small></span></span><span class="tal">${album}</span>${tail}</div>`;
  });
  if (mode === 'pod') ids.slice(0, 3).forEach(prefetch);
  const head = mode === 'pod' ? '' : `<div class="tr th"><span class="n">#</span><span>Judul</span>${mode === 'full' ? '<span>Album</span>' : ''}<span class="td">${I.clock}</span><span></span></div>`;
  return `<div class="box tl ${mode}">${head}${rows.join('')}</div>`
    + (opt.limit && ids.length > opt.limit && opt.moreKey ? `<div class="more-btn"><button class="btn" data-do="more-rows" data-more="${esc(opt.moreKey)}">Muat ${Math.min(60, ids.length - opt.limit)} lagi</button></div>` : '');
}

function miniGrid(ids) {
  ids = ids.filter((id) => T(id));
  const key = listKey(ids);
  return `<div class="minis">${ids.map((id, i) => {
    const t = T(id);
    return `<div class="mini tilt" data-id="${esc(id)}" data-ml="${key}" data-i="${i}">${cover(t.art)}<div class="mt"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></div><span class="go">${I.play}</span></div>`;
  }).join('')}</div>`;
}

const TYPE_LABEL = { album: 'Album', playlist: 'Playlist', artist: 'Artis', podcast: 'Podcast' };

function collCard(x, i = 0) {
  rememberColl(x);
  const round = x.type === 'artist';
  return `<div class="card c${i % 5} tilt${round ? ' artist' : ''}" data-coll="${esc(x.id)}">
    <a href="#/c/${enc(x.id)}" class="card-art">${cover(img(x.art), round ? 'round' : '')}</a>
    ${round ? '' : `<button class="cplay" data-do="playcoll" aria-label="Putar ${esc(x.title)}">${I.play}</button>`}
    <a href="#/c/${enc(x.id)}" class="ct">${esc(x.title)}</a>
    <span class="cs">${esc(x.sub || TYPE_LABEL[x.type] || '')}</span></div>`;
}

function songCard(id, key, i) {
  const t = T(id);
  return `<div class="card c${i % 5} tilt song" data-id="${esc(id)}" data-ml="${key}" data-i="${i}">
    <span class="card-art">${cover(t.art)}</span><span class="cplay" aria-hidden="true">${I.play}</span>
    <span class="ct">${esc(t.title)}</span><span class="cs">${esc(t.artist)}</span></div>`;
}

function itemsHtml(items, opt = {}) {
  // Daftar lagu murni jadi grid mini; campuran jadi kartu
  const songs = items.filter((x) => x.type === 'song' || x.type === 'episode');
  if (songs.length === items.length && !opt.cards) return miniGrid(items.map((x) => itemId(x)));
  const key = listKey(songs.map((x) => itemId(x)));
  let si = 0;
  return `<div class="row">${items.map((x, i) => (x.type === 'song' || x.type === 'episode' ? songCard(`yt:${x.vid}`, key, si++) : collCard(x, i))).join('')}</div>`;
}

function plArt(ids, cls = '') {
  const arts = [...new Set(ids.map((id) => T(id)?.art).filter(Boolean))].slice(0, 4);
  return arts.length >= 4
    ? `<div class="cover mosaic ${cls}">${arts.map((u) => `<img src="${esc(u)}" alt="" onload="this.classList.add('ok')">`).join('')}</div>`
    : cover(arts[0], cls);
}

function header(title, sub = '', extra = '', stk = '') {
  return `<div class="vh"><div><h1>${title}${stk}</h1>${sub ? `<p class="vh-sub">${sub}</p>` : ''}</div>${extra}</div>`;
}

const totalDur = (ids) => ids.reduce((n, id) => n + (T(id)?.duration || 0), 0);
const skelRows = (n = 6) => `<div class="box tl">${Array.from({ length: n }, () => '<div class="sk"><i></i><b></b><b></b></div>').join('')}</div>`;
const skelCards = (n = 8) => `<div class="row">${Array.from({ length: n }, (_, i) => `<div class="card c${i % 5} skc"><div class="cover"></div><span class="ct">&nbsp;</span><span class="cs">&nbsp;</span></div>`).join('')}</div>`;
const shelf = (title, body, extra = '') => `<section class="shelf"><div class="lbl">${title}${extra}</div>${body}</section>`;

/* ================= data jaringan ================= */

async function loadFeed() {
  if (S.feedLoading) return;
  S.feedLoading = true;
  try {
    S.feed = await api('/api/yt/feed');
    S.feedErr = null;
    kv.set('feed', { at: Date.now(), data: S.feed });
  } catch (e) {
    S.feedErr = e.message;
  }
  S.feedLoading = false;
  if (/^#\/(home)?$/.test(location.hash) || !location.hash || location.hash === '#/search') route(true);
}

async function doSearch(type, q) {
  const key = `${type}|${q}`;
  if (S.search[key]) return;
  S.search[key] = { loading: true };
  try {
    const items = await api(`/api/yt/search?type=${type}&q=${enc(q)}`);
    items.forEach((x) => (x.type === 'song' || x.type === 'episode' ? itemId(x) : rememberColl(x)));
    S.search[key] = { items };
    if (type === 'songs') {
      items.slice(0, 5).forEach((x) => prefetch(`yt:${x.vid}`));
      rememberQuery(q);
    }
  } catch (e) {
    S.search[key] = { err: e.message };
  }
  if (location.hash.startsWith('#/search/') || location.hash.startsWith('#/pod') || /^#\/(home)?$/.test(location.hash) || !location.hash) route(true);
}

function rememberQuery(q) {
  S.recentQ = [q, ...S.recentQ.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
  kv.set('recentQ', S.recentQ);
}

async function loadBrowse(id) {
  const st = S.browse.get(id);
  if (st?.data) return st.data;
  if (st?.loading) return st.loading;
  const p = (async () => {
    const d = await api(`/api/yt/browse?id=${enc(id)}`);
    const show = { id: d.kind === 'podcast' ? id : '', title: d.title };
    d.ids = d.tracks.map((x) => itemId(x, show)).filter(Boolean);
    d.shelves.forEach((s) => s.items.forEach((x) => x.type !== 'song' && x.type !== 'episode' && rememberColl(x)));
    rememberColl({ id, type: d.kind, title: d.title, sub: d.sub, art: d.art });
    S.browse.set(id, { data: d });
    return d;
  })();
  S.browse.set(id, { loading: p });
  try {
    return await p;
  } catch (e) {
    S.browse.set(id, { err: e.message });
    throw e;
  }
}

async function playColl(id, shuffle = false) {
  try {
    const d = await loadBrowse(id);
    if (!d.ids.length) return toast('Isinya kosong');
    playFrom(d.ids, 0, shuffle);
  } catch (e) {
    toast(`Gagal buka: ${e.message}`);
  }
}

function toggleSaveColl(id) {
  const i = S.savedColl.findIndex((x) => x.id === id);
  if (i >= 0) S.savedColl.splice(i, 1);
  else S.savedColl.unshift(S.coll[id]);
  kv.set('savedColl', S.savedColl);
  toast(i >= 0 ? 'Dihapus dari koleksi' : S.coll[id]?.type === 'podcast' ? 'Langganan' : 'Disimpan ke koleksi');
  route(true);
}

// Throttle, bukan debounce: timeupdate jalan terus selama diputar, debounce nggak bakal sempet nyimpen
let podSavedAt = 0;
let podSaveT;
function savePod() {
  clearTimeout(podSaveT);
  const run = () => { podSavedAt = Date.now(); kv.set('podpos', S.podpos); kv.set('podDone', [...S.podDone]); saveTracks(); };
  if (Date.now() - podSavedAt > 3000) run();
  else podSaveT = setTimeout(run, 3000);
}

function markDone(id, done = true) {
  if (done) { S.podDone.add(id); delete S.podpos[id]; }
  else S.podDone.delete(id);
  savePod();
  if (location.hash.startsWith('#/pod') || location.hash.startsWith('#/c/')) route(true);
}

async function loadOffline() {
  try {
    const list = await api('/api/yt/saved');
    S.savedVids = new Set(list.map((x) => x.vid));
    S.offline = list.sort((a, b) => (b.at || 0) - (a.at || 0)).map((x) => song(x).id);
  } catch {
    S.offline = [];
  }
  if (location.hash === '#/lib') route(true);
}

async function saveOffline(t) {
  if (t?.kind !== 'song' || S.saving.has(t.vid) || S.savedVids.has(t.vid)) return;
  S.saving.add(t.vid);
  refreshSaveBtns(t.vid);
  try {
    await api('/api/yt/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vid: t.vid, title: t.title, artist: t.artist, album: t.album, art: t.raw, duration: t.duration }),
    });
    S.savedVids.add(t.vid);
    S.offline = null;
    toast(`“${t.title}” bisa diputar offline`);
  } catch (e) {
    toast(`Gagal download: ${e.message}`);
  }
  S.saving.delete(t.vid);
  refreshSaveBtns(t.vid);
}

function refreshSaveBtns(vid) {
  const t = T(`yt:${vid}`);
  for (const r of $$(`.tr[data-id="yt:${vid}"] .tm`)) r.innerHTML = saveBtn(t) + `<button class="ib xs" data-do="more" title="Lainnya" aria-label="Lainnya">${I.more}</button>`;
}

/* ================= halaman ================= */

const GREET = () => {
  const h = new Date().getHours();
  return h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 19 ? 'sore' : 'malam';
};
const MOODS = ['Galau', 'Santai sore', 'Indie Indonesia', 'Lo-fi belajar', 'Dangdut koplo', 'K-pop', 'Akustik', 'Lagu 90an', 'Workout', 'Jazz'];
const BROWSE_COLORS = ['#e13300', '#1e3264', '#8400e7', '#e8115b', '#148a08', '#bc5900', '#503750', '#0d73ec', '#477d95', '#af2896'];
const TABS = [['songs', 'Lagu'], ['albums', 'Album'], ['artists', 'Artis'], ['playlists', 'Playlist']];

const VIEWS = {
  home() {
    if (!S.feed && !S.feedErr) loadFeed();
    // Beranda cukup lagu & album: rak playlist komunitas, artis, dan video dibuang biar bersih
    // Beranda cukup "Pilihan cepat" biar bersih; rak lain (album baru, trending, playlist, artis, video) dibuang
    const all = S.feed || [];
    const pick = all.find((x) => /pilihan cepat|quick picks/i.test(x.title)) || all.find((x) => x.items.every((y) => y.type === 'song'));
    const feed = pick ? [{ ...pick, items: pick.items.filter((y) => y.type === 'song') }] : [];
    const tiles = [];
    if (S.loved.size) tiles.push(`<a class="tile" href="#/loved"><div class="cover loved-c">${I.heartF}</div><b>Lagu Disukai</b></a>`);
    for (const p of S.playlists.slice(0, 3)) tiles.push(`<a class="tile" href="#/playlist/${p.id}">${plArt(p.ids)}<b>${esc(p.name)}</b></a>`);
    for (const c of S.savedColl.filter((x) => x.type !== 'podcast').slice(0, 3)) tiles.push(`<a class="tile" href="#/c/${enc(c.id)}">${cover(img(c.art), c.type === 'artist' ? 'round' : '')}<b>${esc(c.title)}</b></a>`);
    const recent = Object.keys(S.plays).filter((id) => T(id)?.kind === 'song').sort((a, b) => S.plays[b].last - S.plays[a].last);
    const quick = (feed.find((x) => x.items.every((y) => y.type === 'song'))?.items || []).map((x) => itemId(x));
    const songs = [...new Set([...recent, ...quick])].slice(0, Math.max(0, 8 - tiles.length));
    const sk = listKey(songs);
    songs.forEach((id, i) => tiles.push(`<div class="tile" data-id="${esc(id)}" data-ml="${sk}" data-i="${i}">${cover(T(id).art)}<b>${esc(T(id).title)}</b><span class="tplay">${I.play}</span></div>`));
    return `<div class="hchips"><a class="on" href="#/home">Semua</a>${MOODS.slice(0, 7).map((m) => `<a href="#/search/songs/${enc(m)}">${esc(m)}</a>`).join('')}</div>
      <section class="hello2"><div class="h2-t"><p class="h2-k">Selamat ${GREET()}</p><h1>Mau dengerin apa hari ini?</h1>
        <form class="qform" data-search-form>${I.search}<input name="q" placeholder="Cari lagu, artis, atau album…" autocomplete="off" spellcheck="false" enterkeyhint="search"><button class="btn ink">Cari</button></form></div>
        <img class="h2-img" src="assets/dengerin.png" alt="Dua orang dengerin musik pakai headphone di kereta" width="478" height="472"></section>
      ${tiles.length ? `<div class="tiles">${tiles.join('')}</div>` : `<div class="tiles">${'<div class="tile sk-t"></div>'.repeat(8)}</div>`}`
      + (S.feedErr && !feed.length ? `<div class="note">${I.note}<div><b>Rekomendasi gagal dimuat.</b><p>Cek koneksi internet, terus buka ulang halaman ini. Pencarian tetap bisa dipakai.</p></div></div>` : '');
  },

  search(arg) {
    const [type0, ...rest] = (arg || '').split('/');
    const type = TABS.some((t) => t[0] === type0) ? type0 : 'songs';
    const q = rest.join('/');
    const form = `<form class="qform big" data-search-form>${I.search}<input name="q" value="${esc(q)}" placeholder="Cari lagu, artis, atau album…" autocomplete="off" spellcheck="false" enterkeyhint="search"><button class="btn ink">Cari</button></form>`;
    if (!q) {
      setTimeout(() => $('.page [data-search-form] input')?.focus(), 60);
      if (!S.feed) loadFeed();
      const trend = S.feed?.find((s) => /trending/i.test(s.title));
      return header('Cari', 'Semua lagu bisa langsung diputar, tanpa iklan') + form
        + (S.recentQ.length ? shelf('Terakhir dicari <button class="link" data-do="clearq">Hapus</button>', `<div class="chips">${S.recentQ.map((x, i) => `<a class="chip c${i % 5}" href="#/search/songs/${enc(x)}">${esc(x)}</a>`).join('')}</div>`) : '')
        + shelf('Jelajahi semua', `<div class="browse">${MOODS.map((m, i) => `<a style="--c:${BROWSE_COLORS[i % BROWSE_COLORS.length]}" href="#/search/songs/${enc(m)}"><b>${esc(m)}</b></a>`).join('')}</div>`)
        + (trend ? shelf('Lagi trending', itemsHtml(trend.items)) : '');
    }
    const tabs = `<div class="tabsel">${TABS.map(([k, l]) => `<a class="${k === type ? 'on' : ''}" href="#/search/${k}/${enc(q)}">${l}</a>`).join('')}</div>`;
    const st = S.search[`${type}|${q}`];
    if (!st) doSearch(type, q);
    let body;
    if (!st || st.loading) body = type === 'songs' || type === 'episodes' ? skelRows() : skelCards();
    else if (st.err) body = `<p class="empty-note">Gagal nyari: ${esc(st.err)}</p>`;
    else if (!st.items.length) body = '<p class="empty-note">Nggak ketemu apa-apa. Coba kata kunci lain.</p>';
    else if (type === 'songs') body = trackList(st.items.map((x) => itemId(x)), 'full');
    else body = `<div class="grid">${st.items.map(collCard).join('')}</div>`;
    return header(`“${esc(q)}”`, st?.items ? `${st.items.length} hasil` : 'Lagi nyari…') + form + tabs + body;
  },

  c(id) {
    const st = S.browse.get(id);
    const meta = S.coll[id] || {};
    if (!st || st.loading) {
      if (!st) loadBrowse(id).then(() => route(true), () => route(true));
      return heroHtml({ ...meta, kind: meta.type }, '<p class="vh-sub">Lagi dimuat…</p>') + skelRows(8);
    }
    if (st.err) return header('Gagal dibuka', esc(st.err));
    const d = st.data;
    const isPod = d.kind === 'podcast';
    const key = listKey(d.ids);
    const saved = S.savedColl.some((x) => x.id === id);
    const btns = `<div class="btns">${d.ids.length ? `<button class="btn ink" data-do="playall" data-ml="${key}">${I.play} ${isPod ? 'Terbaru' : 'Putar'}</button>${isPod ? '' : `<button class="btn" data-do="shuffleall" data-ml="${key}">${I.shuffle} Acak</button>`}` : ''}
      <button class="btn ${saved ? '' : 'coral'}" data-do="savecoll" data-coll-id="${esc(id)}">${saved ? `${I.bookF} ${isPod ? 'Langganan' : 'Tersimpan'}` : `${I.book} ${isPod ? 'Langganan' : 'Simpan'}`}</button></div>`;
    const sub = [d.sub, d.ids.length ? `${d.ids.length} ${isPod ? 'episode' : 'lagu'}` : '', !isPod && totalDur(d.ids) ? fmtLong(totalDur(d.ids)) : ''].filter(Boolean).join(' · ');
    return heroHtml(d, `<p class="vh-sub">${esc(sub)}</p>${d.desc && (isPod || d.kind === 'artist') ? `<p class="desc">${esc(d.desc)}</p>` : ''}${btns}`)
      + (d.ids.length ? (d.kind === 'artist' ? shelf('Lagu populer', trackList(d.ids, 'full')) : trackList(d.ids, isPod ? 'pod' : d.kind === 'album' ? 'album' : 'full', { art: isPod })) : '')
      + d.shelves.map((s) => shelf(esc(s.title), itemsHtml(s.items, { cards: true }))).join('');
  },

  lib() {
    if (!S.offline) loadOffline();
    const loved = [...S.loved].filter((id) => T(id));
    const card = (href, art, title, n, drop, i) => `<a class="card c${i % 5} tilt" href="${href}" data-pl-drop="${drop}"><span class="card-art">${art}</span><span class="ct">${esc(title)}</span><span class="cs">${n}</span></a>`;
    const recent = Object.keys(S.plays).filter((id) => T(id)).sort((a, b) => S.plays[b].last - S.plays[a].last).slice(0, 30);
    return header('Koleksi', `${S.playlists.length + 1} playlist · ${loved.length} favorit · ${S.savedColl.length} tersimpan`, `<div class="btns"><button class="btn pri" data-do="newpl">${I.plus} Playlist baru</button></div>`)
      + shelf('Playlist', `<div class="grid">${card('#/loved', `<div class="cover loved-c">${I.heartF}</div>`, 'Favorit', `${loved.length} lagu`, 'loved', 2)}${S.playlists
        .map((p, i) => card(`#/playlist/${p.id}`, plArt(p.ids), p.name, `${p.ids.filter((x) => T(x)).length} lagu`, p.id, i + 3)).join('')}
        <button class="card newcard" data-do="newpl"><span>${I.plus}</span><b>Playlist baru</b></button></div>`)
      + (S.savedColl.length ? shelf('Album & playlist tersimpan', `<div class="row">${S.savedColl.map(collCard).join('')}</div>`) : '')
      + shelf('Offline', S.offline === null ? skelRows(3) : trackList(S.offline, 'full', { empty: `Belum ada. Klik ${I.save} di lagu mana aja biar bisa diputar tanpa internet.` }))
      + (recent.length ? shelf('Riwayat', trackList(recent, 'full', { limit: 15 })) : '');
  },

  loved() {
    const ids = [...S.loved].filter((id) => T(id)).reverse();
    return plHero({ name: 'Favorit', fixed: true }, ids) + trackList(ids, 'full', { empty: 'Klik ikon hati di lagu yang lagi diputar buat nyimpen ke sini.' });
  },

  playlist(id) {
    const p = S.playlists.find((x) => x.id === id);
    if (!p) return header('Playlist nggak ketemu');
    const ids = p.ids.filter((x) => T(x));
    return plHero(p, ids) + trackList(ids, 'full', { empty: 'Playlist masih kosong. Pakai menu ⋯ di lagu buat nambahin.' });
  },
};

function heroHtml(d, body) {
  const kind = d.kind || d.type;
  const cls = { album: '', playlist: 'coral', artist: 'lilac', podcast: 'mint' }[kind] ?? '';
  return `<div class="hero ${cls}" data-art="${esc(img(d.art) || '')}">${cover(img(d.art), `hero-art${kind === 'artist' ? ' round' : ''}`)}<div class="hero-info"><span class="stk ${kind === 'artist' ? 'coral' : 'yellow'}">${TYPE_LABEL[kind] || 'Koleksi'}</span><h1>${esc(d.title || '…')}</h1>${body}</div></div>`;
}

function plHero(p, ids) {
  const art = p.fixed ? `<div class="cover hero-art loved">${I.heartF}</div>` : plArt(ids, 'hero-art');
  const key = listKey(ids);
  return `<div class="hero coral" data-art="${esc(p.fixed ? '' : T(ids[0])?.art || '')}">${art}<div class="hero-info"><span class="stk lilac">Playlist</span>
    <h1 ${p.fixed ? '' : `contenteditable="plaintext-only" spellcheck="false" data-rename="${p.id}"`}>${esc(p.name)}</h1>
    <p class="vh-sub">${ids.length} lagu${totalDur(ids) ? ' · ' + fmtLong(totalDur(ids)) : ''}</p>
    <div class="btns">${ids.length ? `<button class="btn ink" data-do="playall" data-ml="${key}">${I.play} Putar</button><button class="btn" data-do="shuffleall" data-ml="${key}">${I.shuffle} Acak</button>` : ''}${p.fixed ? '' : `<button class="ib" data-do="plmore" data-pl="${p.id}" title="Lainnya" aria-label="Lainnya">${I.more}</button>`}</div></div></div>`;
}

/* ================= panel kiri: koleksi ================= */

let libFilter = 'all';
let libQuery = '';
function libItems() {
  const loved = [...S.loved].filter((id) => T(id));
  const items = [{ type: 'playlist', href: '#/loved', title: 'Lagu Disukai', sub: `Playlist • ${loved.length} lagu`, loved: true, drop: 'loved' }];
  for (const p of S.playlists) items.push({ type: 'playlist', href: `#/playlist/${p.id}`, title: p.name, sub: `Playlist • ${p.ids.filter((x) => T(x)).length} lagu`, ids: p.ids, drop: p.id });
  for (const c of S.savedColl) if (c && c.type !== 'podcast') items.push({ type: c.type, href: `#/c/${enc(c.id)}`, title: c.title, sub: [TYPE_LABEL[c.type], (c.sub || '').split(' • ').pop()].filter(Boolean).join(' • '), art: img(c.art) });
  const q = libQuery.trim().toLowerCase();
  return items.filter((x) => (libFilter === 'all' || x.type === libFilter) && (!q || x.title.toLowerCase().includes(q)));
}
function libListHtml() {
  const here = location.hash || '#/home';
  const items = libItems();
  if (!items.length) return `<p class="lib-empty">${libQuery ? 'Nggak ketemu di koleksi.' : 'Belum ada yang disimpan. Klik “Simpan” di album atau artis.'}</p>`;
  return items.map((x) => {
    const art = x.loved ? `<div class="cover li-art loved-c">${I.heartF}</div>` : x.ids ? plArt(x.ids, 'li-art') : cover(x.art, `li-art${x.type === 'artist' ? ' round' : ''}`);
    const on = decodeURIComponent(here) === decodeURIComponent(x.href);
    return `<a class="li${on ? ' on' : ''}" href="${x.href}"${x.drop ? ` data-pl-drop="${esc(x.drop)}"` : ''}>${art}<span><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span></a>`;
  }).join('');
}
function renderLib() {
  const el = $('#lib');
  if (!el) return;
  if (!el.firstChild) {
    el.innerHTML = `<div class="lib-h"><b>Koleksi</b><button class="ib round" data-do="newpl" title="Bikin playlist" aria-label="Bikin playlist">${I.plus}</button></div>
      <div class="lib-chips">${[['all', 'Semua'], ['playlist', 'Playlist'], ['album', 'Album'], ['artist', 'Artis']].map(([k, l]) => `<button data-do="libf" data-f="${k}" class="${k === libFilter ? 'on' : ''}">${l}</button>`).join('')}</div>
      <label class="lib-q">${I.search}<input placeholder="Cari di koleksi" aria-label="Cari di koleksi"></label>
      <div class="lib-list"></div>`;
    $('.lib-q input', el).addEventListener('input', (e) => { libQuery = e.target.value; $('.lib-list', el).innerHTML = libListHtml(); });
  }
  $$('.lib-chips button', el).forEach((b) => b.classList.toggle('on', b.dataset.f === libFilter));
  $('.lib-list', el).innerHTML = libListHtml();
}

/* ================= router + transisi ================= */

let lastHash = null;
function route(keepScroll = false) {
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const [name, ...rest] = h.split('/');
  const view = $('#view');
  const top = view.scrollTop;
  const enter = !keepScroll && h !== lastHash;
  S.lists = {};
  S.listSeq = 0;
  const fn = VIEWS[name] || VIEWS.home;
  const arg = name === 'search' || name === 'pod' ? rest.map(decodeURIComponent).join('/') : decodeURIComponent(rest.join('/'));
  view.innerHTML = `<div class="page${enter ? ' enter' : ''}">${fn(arg)}</div>`;
  if (enter) splitTitles(view);
  renderLib();
  const hero = $('.hero[data-art]', view);
  if (hero?.dataset.art) artLoad(hero.dataset.art).then(() => { const c = artColors.get(hero.dataset.art); if (c) hero.style.setProperty('--tint', `rgb(${c.join(' ')})`); });
  markNav();
  markPlaying();
  if (keepScroll || h === lastHash) view.scrollTop = top;
  else view.scrollTop = 0;
  lastHash = h;
  const sq = $('#q');
  if (name !== 'search' && document.activeElement !== sq) sq.value = '';
}

function navigate() {
  if (!document.startViewTransition || reduceMotion.matches) return route();
  document.startViewTransition(() => route());
}
window.addEventListener('hashchange', navigate);

// Judul muncul per huruf
function splitTitles(root) {
  if (reduceMotion.matches) return;
  for (const h of $$('.vh h1, .hero h1:not([contenteditable]), .hello h1', root)) {
    let i = 0;
    const walk = (node) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const part of n.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { frag.append(part); continue; }
            const w = document.createElement('span');
            w.className = 'w';
            for (const ch of part) {
              const s = document.createElement('span');
              s.className = 'ch';
              s.style.setProperty('--i', Math.min(i++, 40));
              s.textContent = ch;
              w.append(s);
            }
            frag.append(w);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('stk')) walk(n);
      }
    };
    walk(h);
  }
}

function markNav() {
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const top = h.split('/')[0];
  const key = { playlist: 'lib', loved: 'lib', c: '' }[top] ?? top;
  $$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === key));
}
window.addEventListener('resize', debounce(markNav, 100));

function markPlaying() {
  const id = S.queue[S.idx];
  for (const r of $$('[data-id]')) r.classList.toggle('on', r.dataset.id === id);
}

/* ================= playlist & favorit ================= */

const savePlaylists = () => { saveTracks(); kv.set('playlists', S.playlists); renderLib(); };
const saveLoved = () => { saveTracks(); kv.set('loved', [...S.loved]); renderLib(); };
const savePlays = debounce(() => { saveTracks(); kv.set('plays', S.plays); }, 1000);

function newPlaylist(ids = []) {
  const p = { id: Date.now().toString(36), name: 'Playlist Baru', ids: [...ids], created: Date.now() };
  S.playlists.push(p);
  savePlaylists();
  history.pushState(null, '', `#/playlist/${p.id}`);
  route();
  const h = $('[data-rename]');
  h?.focus();
  if (h) getSelection().selectAllChildren(h);
}

function addToPlaylist(pid, ids) {
  if (pid === 'loved') {
    ids.forEach((id) => S.loved.add(id));
    saveLoved();
    toast('Masuk Favorit');
    return renderBar();
  }
  const p = S.playlists.find((x) => x.id === pid);
  if (!p) return;
  const fresh = ids.filter((id) => !p.ids.includes(id));
  p.ids.push(...fresh);
  savePlaylists();
  toast(fresh.length ? `Masuk “${p.name}”` : `Udah ada di “${p.name}”`);
  if (location.hash === `#/playlist/${pid}` || location.hash === '#/lib') route(true);
}

function toggleLove(id, el) {
  if (!id) return;
  const add = !S.loved.has(id);
  add ? S.loved.add(id) : S.loved.delete(id);
  saveLoved();
  renderBar();
  if (add && el) burst(el);
  if (location.hash === '#/loved') route(true);
  else for (const r of $$(`.tr[data-id="${CSS.escape(id)}"] .td`)) r.innerHTML = (add ? `<span class="lv">${I.heartF}</span>` : '') + (T(id).duration ? fmt(T(id).duration) : '');
}

$('#view').addEventListener('keydown', (e) => {
  if (e.target.dataset?.rename && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
});
$('#view').addEventListener('focusout', (e) => {
  const id = e.target.dataset?.rename;
  if (!id) return;
  const p = S.playlists.find((x) => x.id === id);
  const name = e.target.textContent.trim() || 'Playlist Baru';
  e.target.textContent = name;
  if (p && p.name !== name) { p.name = name; savePlaylists(); }
});

/* ================= menu ================= */

const menuEl = $('#menu');
function showMenu(x, y, items) {
  menuEl.innerHTML = items.map((it, i) => (it === '-' ? '<hr>' : `<button data-mi="${i}" ${it.danger ? 'class="danger"' : ''}>${esc(it.label)}${it.sub ? '<span>›</span>' : ''}</button>`)).join('');
  menuEl._items = items;
  menuEl.hidden = false;
  const r = menuEl.getBoundingClientRect();
  menuEl.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
  menuEl.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
}
const hideMenu = () => (menuEl.hidden = true);
menuEl.addEventListener('click', (e) => {
  e.stopPropagation();
  const b = e.target.closest('[data-mi]');
  if (!b) return;
  const it = menuEl._items[+b.dataset.mi];
  const r = menuEl.getBoundingClientRect();
  hideMenu();
  if (it.sub) showMenu(r.left, r.top, it.sub());
  else it.act?.();
});

function playlistSub(ids) {
  return () => [
    { label: 'Favorit', act: () => addToPlaylist('loved', ids) },
    ...S.playlists.map((p) => ({ label: p.name, act: () => addToPlaylist(p.id, ids) })),
    '-',
    { label: 'Playlist baru…', act: () => newPlaylist(ids) },
  ];
}

function trackMenu(id) {
  const t = T(id);
  const pl = location.hash.match(/^#\/playlist\/(.+)/)?.[1];
  const items = [
    { label: 'Putar berikutnya', act: () => playNext([id]) },
    { label: 'Tambah ke antrean', act: () => addToQueue([id]) },
    '-',
    { label: S.loved.has(id) ? 'Hapus dari favorit' : 'Favoritkan', act: () => toggleLove(id) },
    { label: 'Tambah ke playlist', sub: playlistSub([id]) },
  ];
  if (t.kind === 'song') {
    if (!S.savedVids.has(t.vid)) items.push({ label: 'Download buat offline', act: () => saveOffline(t) });
    items.push('-');
    if (t.albumId) items.push({ label: 'Buka album', act: () => (location.hash = `#/c/${enc(t.albumId)}`) });
    items.push({ label: 'Buka artis', act: () => (location.hash = t.artistId ? `#/c/${enc(t.artistId)}` : `#/search/artists/${enc(t.artist)}`) });
  } else {
    items.push('-', { label: S.podDone.has(id) ? 'Tandai belum didengar' : 'Tandai selesai', act: () => markDone(id, !S.podDone.has(id)) });
    if (t.showHref) items.push({ label: 'Buka podcast', act: () => (location.hash = t.showHref) });
  }
  if (pl) {
    items.push('-', {
      label: 'Hapus dari playlist', danger: true,
      act: () => {
        const p = S.playlists.find((x) => x.id === pl);
        const at = p.ids.indexOf(id);
        if (at >= 0) p.ids.splice(at, 1);
        savePlaylists();
        route(true);
      },
    });
  }
  return items;
}

function collMenu(id) {
  const saved = S.savedColl.some((x) => x.id === id);
  return [
    { label: 'Putar', act: () => playColl(id) },
    { label: 'Acak', act: () => playColl(id, true) },
    '-',
    { label: saved ? 'Hapus dari koleksi' : 'Simpan ke koleksi', act: () => toggleSaveColl(id) },
  ];
}

/* ================= event ================= */

const ACTS = {
  play: togglePlay,
  prev,
  next: () => next(),
  shuffle: toggleShuffle,
  repeat: cycleRepeat,
  love: (el) => toggleLove(S.queue[S.idx], el),
  mute: () => { audio.muted = !audio.muted; if (!audio.muted && S.volume === 0) setVolume(50); renderMute(); saveState(); },
  queue: () => togglePanel('queue'),
  lyrics: () => togglePanel('lyrics'),
  np: () => openNp(),
  side: () => {
    if (S.panel === 'queue') { S.panel = null; renderPanels(); }
    document.body.classList.toggle('side-off');
    localStorage.setItem('putar-side', document.body.classList.contains('side-off') ? 'off' : '');
  },
  back15: () => seekTo(audio.currentTime - 15),
  fwd30: () => seekTo(audio.currentTime + 30),
  sleep: (el) => sleepMenu(el),
  rate: () => {
    const steps = [1, 1.25, 1.5, 1.75, 2, 0.75];
    S.rate = steps[(steps.indexOf(S.rate) + 1) % steps.length];
    if (cur()?.kind === 'pod') audio.defaultPlaybackRate = audio.playbackRate = S.rate;
    kv.set('rate', S.rate);
    renderBar();
  },
};

document.addEventListener('click', (e) => {
  if (!menuEl.hidden && !e.target.closest('#menu')) hideMenu();

  // Cover kartu "terbang" jadi header halaman berikutnya
  const link = e.target.closest('a[href^="#/c/"]');
  if (link && document.startViewTransition) {
    const c = link.closest('.card, .acard, .alc')?.querySelector('.cover');
    $$('.hero-art').forEach((x) => (x.style.viewTransitionName = 'none'));
    if (c) c.style.viewTransitionName = 'cover-morph';
  }

  const act = e.target.closest('[data-act]');
  if (act) return ACTS[act.dataset.act]?.(act);

  const d = e.target.closest('[data-do]');
  if (d) {
    e.preventDefault();
    e.stopPropagation();
    const k = d.dataset.do;
    const ml = S.lists[d.dataset.ml || d.closest('[data-ml]')?.dataset.ml] || [];
    const cid = d.dataset.collId || d.closest('[data-coll]')?.dataset.coll;
    if (k === 'playall') return playFrom(ml);
    if (k === 'shuffleall') return playFrom(ml, 0, true);
    if (k === 'playcoll') return playColl(cid);
    if (k === 'shufflecoll') return playColl(cid, true);
    if (k === 'savecoll') return toggleSaveColl(cid);
    if (k === 'save') return saveOffline(T(d.closest('[data-id]').dataset.id));
    if (k === 'newpl') return newPlaylist();
    if (k === 'radio') { S.radio = !S.radio; kv.set('radio', S.radio); toast(S.radio ? 'Radio otomatis nyala' : 'Radio otomatis mati'); renderQueue(); return ensureRadio(); }
    if (k === 'libf') { libFilter = d.dataset.f; return renderLib(); }
    if (k === 'clearq') { S.recentQ = []; kv.set('recentQ', []); return route(true); }
    if (k === 'addpl') { const r = d.getBoundingClientRect(); return showMenu(r.left, r.bottom + 6, playlistSub([d.dataset.id])()); }
    if (k === 'more-rows') { S.podLimit[d.dataset.more] = (S.podLimit[d.dataset.more] || 60) + 60; return route(true); }
    if (k === 'qclear') { S.queue.splice(S.idx + 1); renderQueue(); return saveState(); }
    if (k === 'qremove') return removeAt(+d.closest('[data-qi]').dataset.qi);
    if (k === 'more') {
      const r = d.getBoundingClientRect();
      const row = d.closest('[data-id]');
      if (row) return showMenu(r.left, r.bottom + 6, trackMenu(row.dataset.id));
    }
    if (k === 'plmore') {
      const r = d.getBoundingClientRect();
      const p = S.playlists.find((x) => x.id === d.dataset.pl);
      return showMenu(r.left, r.bottom + 6, [
        { label: 'Putar berikutnya', act: () => playNext(p.ids.filter((x) => T(x))) },
        { label: 'Ganti nama', act: () => { const h = $('[data-rename]'); h.focus(); getSelection().selectAllChildren(h); } },
        '-',
        { label: 'Hapus playlist', danger: true, act: () => {
          if (!confirm(`Hapus playlist “${p.name}”?`)) return;
          S.playlists = S.playlists.filter((x) => x !== p);
          savePlaylists();
          location.hash = '#/lib';
        } },
      ]);
    }
    return;
  }

  const sn = e.target.closest('.side-next');
  if (sn) return load(+sn.dataset.qi);
  const qrow = e.target.closest('.q-row');
  if (qrow) return load(+qrow.dataset.qi);

  const row = e.target.closest('[data-id][data-ml]');
  if (row && !e.target.closest('a')) {
    if (row.dataset.id === S.queue[S.idx] && audio.src) return togglePlay();
    return playFrom(S.lists[row.dataset.ml] || [row.dataset.id], +row.dataset.i);
  }

  // Di HP, ketuk player = buka layar Sedang Diputar
  if (isMobile() && e.target.closest('.bar') && !e.target.closest('button, input, a')) openNp(true);
});

document.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('[data-id]');
  const coll = e.target.closest('[data-coll]');
  if (!row && !coll) return;
  e.preventDefault();
  showMenu(e.clientX, e.clientY, row ? trackMenu(row.dataset.id) : collMenu(coll.dataset.coll));
});

document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-search-form]');
  if (!f) return;
  e.preventDefault();
  const v = f.q.value.trim();
  if (!v) return;
  f.q.blur();
  const type = location.hash.match(/^#\/search\/([a-z]+)\//)?.[1] || 'songs';
  location.hash = `#/search/${type}/${enc(v)}`;
});

const q = $('#q');
const goSearch = debounce(() => {
  const v = q.value.trim();
  if (!v) return;
  const target = `#/search/songs/${enc(v)}`;
  if (location.hash.startsWith('#/search/')) { history.replaceState(null, '', target); route(true); }
  else location.hash = target;
}, 450);
q.addEventListener('input', goSearch);
q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { goSearch(); q.blur(); } });

let hoverT;
document.addEventListener('mouseover', (e) => {
  const r = e.target.closest?.('[data-id^="yt:"]');
  if (!r) return;
  clearTimeout(hoverT);
  hoverT = setTimeout(() => prefetch(r.dataset.id), 80);
});

document.addEventListener('keydown', (e) => {
  const typing = e.target.closest?.('input:not([type=range]), [contenteditable]');
  if (e.key === 'Escape') {
    if (!menuEl.hidden) return hideMenu();
    if (npOpen()) return openNp(false);
    if (typing) return e.target.blur();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); q.focus(); q.select(); return; }
  if (typing) return;
  if (e.key === '/') { e.preventDefault(); isMobile() ? (location.hash = '#/search') : q.focus(); return; }
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'ArrowRight' && e.shiftKey) next();
  else if (e.key === 'ArrowLeft' && e.shiftKey) prev();
  else if (e.key === 'ArrowRight') seekTo(audio.currentTime + 10);
  else if (e.key === 'ArrowLeft') seekTo(audio.currentTime - 10);
  else if (e.key === 'ArrowUp') { e.preventDefault(); setVolume(Math.min(100, S.volume + 5)); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); setVolume(Math.max(0, S.volume - 5)); }
  else if (e.key.toLowerCase() === 'l' && !e.metaKey) togglePanel('lyrics');
  else if (e.key.toLowerCase() === 'm' && !e.metaKey) ACTS.mute();
});

/* ---------- motion ---------- */

function burst(el) {
  if (reduceMotion.matches) return;
  const r = el.getBoundingClientRect();
  const colors = ['var(--coral)', 'var(--yellow)', 'var(--lilac)', 'var(--mint)', 'var(--blue)'];
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('i');
    s.className = 'spark';
    s.style.left = r.left + r.width / 2 + 'px';
    s.style.top = r.top + r.height / 2 + 'px';
    s.style.background = colors[i % 5];
    document.body.append(s);
    const a = (i / 12) * Math.PI * 2;
    const dist = 28 + Math.random() * 26;
    s.animate([
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist}px)) scale(.2)`, opacity: 0 },
    ], { duration: 640 + Math.random() * 200, easing: 'cubic-bezier(.23,1,.32,1)' }).onfinish = () => s.remove();
  }
}

// Header mengecil pas discroll
$('#view').addEventListener('scroll', () => $('.top').classList.toggle('scrolled', $('#view').scrollTop > 24), { passive: true });

// Di HP, usap ke atas di mini player buat buka layar penuh
{
  let y0 = null;
  $('#lcd').addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  $('#lcd').addEventListener('touchend', (e) => {
    if (y0 !== null && y0 - e.changedTouches[0].clientY > 40) openNp(true);
    y0 = null;
  });
}

// Di HP, layar Sedang Diputar bisa diusap ke bawah buat nutup
{
  const np = $('#np');
  let sy = null;
  let dy = 0;
  np.addEventListener('touchstart', (e) => {
    if (e.target.closest('.np-right, input, button')) return;
    sy = e.touches[0].clientY;
    dy = 0;
    np.style.transition = 'none';
  }, { passive: true });
  np.addEventListener('touchmove', (e) => {
    if (sy === null) return;
    dy = Math.max(0, e.touches[0].clientY - sy);
    np.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  np.addEventListener('touchend', () => {
    if (sy === null) return;
    np.style.transition = '';
    np.style.transform = '';
    if (dy > 110) openNp(false);
    sy = null;
  });
}

let toastT;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  el.classList.remove('out');
  clearTimeout(toastT);
  toastT = setTimeout(() => { el.classList.add('out'); setTimeout(() => (el.hidden = true), 250); }, 2400);
}

/* ================= simpan & mulai ================= */

const stateObj = () => ({ queue: S.queue, base: S.base, idx: S.idx, shuffle: S.shuffle, repeat: S.repeat, volume: S.volume, muted: audio.muted, pos: audio.currentTime || S.restorePos, panel: S.panel === 'queue' ? 'queue' : null });
const saveState = debounce(() => kv.set('state', stateObj()), 400);
window.addEventListener('pagehide', () => kv.set('state', stateObj()));

async function init() {
  const keys = ['state', 'playlists', 'loved', 'plays', 'tracks', 'yt', 'subs', 'podmeta', 'podpos', 'podDone', 'rate', 'savedColl', 'recentQ', 'feed', 'autoplay', 'radio'];
  const v = Object.fromEntries(await Promise.all(keys.map(async (k) => [k, await kv.get(k)])));
  for (const t of [...(v.yt || []), ...(v.tracks || [])]) {
    if (!t?.id || !(t.id.startsWith('yt:') || t.id.startsWith('pod:'))) continue;
    if (!t.kind) t.kind = 'song';
    S.tr.set(t.id, t);
  }
  S.playlists = v.playlists || [];
  S.loved = new Set((v.loved || []).filter((id) => T(id)));
  S.plays = v.plays || {};
  S.subs = v.subs || [];
  S.podMeta = v.podmeta || {};
  for (const s of S.subs) S.podMeta[s.id] ||= s;
  S.podpos = v.podpos || {};
  S.podDone = new Set(v.podDone || []);
  S.rate = v.rate || 1;
  S.savedColl = v.savedColl || [];
  S.savedColl.forEach(rememberColl);
  S.recentQ = v.recentQ || [];
  S.autoplay = v.autoplay ?? true;
  S.radio = v.radio ?? true;
  if (localStorage.getItem('putar-side') === 'off') document.body.classList.add('side-off');
  if (v.feed?.data) {
    S.feed = v.feed.data;
    S.feed.forEach((s) => s.items.forEach((x) => x.type !== 'song' && rememberColl(x)));
  }
  const st = v.state;
  if (st) {
    Object.assign(S, { queue: (st.queue || []).filter((id) => T(id)), base: (st.base || []).filter((id) => T(id)), shuffle: !!st.shuffle, repeat: st.repeat || 'off', volume: st.volume ?? 80, restorePos: st.pos || 0, panel: st.panel || null });
    S.idx = Math.min(st.idx ?? -1, S.queue.length - 1);
    audio.muted = !!st.muted;
  }
  $$('[data-ic]').forEach((e) => (e.outerHTML = I[e.dataset.ic] || ''));
  $$('[data-act=sleep]').forEach((b) => (b.innerHTML = I.moon));
  renderSleep();
  setVolume(S.volume);
  renderPanels();
  if (S.idx >= 0) loadLyrics();
  route();
  // Beranda disegerin di belakang
  if (!v.feed || Date.now() - v.feed.at > 20 * 60 * 1000) loadFeed();
  try {
    const ping = await api('/api/yt/ping');
    S.serverOk = !!ping.ok;
  } catch {
    S.serverOk = false;
    toast('Server Senandung belum nyala. Jalanin ./senandung di Terminal');
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

init();
