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
const ANDROID = /SvaraAndroid/.test(navigator.userAgent);
// Mode ringan: efek berat (blur, animasi, visualizer spektrum) dimatiin. Otomatis di app Android dan
// perangkat spek rendah; bisa dipaksa nyala/mati dari panel Suara (disimpan di localStorage 'svara-lite').
const litePref = () => { try { return localStorage.getItem('svara-lite') || 'auto'; } catch { return 'auto'; } };
const liteAuto = ANDROID || (navigator.deviceMemory || 8) <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
let LITE = litePref() === 'auto' ? liteAuto : litePref() === 'on';
document.documentElement.classList.toggle('lite', LITE);
function setLite(on) {
  try { on === liteAuto ? localStorage.removeItem('svara-lite') : localStorage.setItem('svara-lite', on ? 'on' : 'off'); } catch {}
  LITE = on;
  document.documentElement.classList.toggle('lite', LITE);
}
const motionMq = matchMedia('(prefers-reduced-motion: reduce)');
// Di mode ringan animasi hiasan ikut dimatiin, sama kayak "kurangi gerakan" di sistem
const reduceMotion = { get matches() { return LITE || motionMq.matches; } };
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

// Ikon vektor 24×24: garis membulat (o) atau isi penuh (f)
const o = (body) => `<svg viewBox="0 0 24 24" class="ic" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const f = (body) => `<svg viewBox="0 0 24 24" class="ic" fill="currentColor" aria-hidden="true">${body}</svg>`;
const REPEAT = '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>';
const HEART = '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>';
const BOOK = '<path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>';
const SPEAKER = '<path d="M11 5 6 9H3v6h3l5 4z"/>';
const I = {
  play: f('<path d="M7 4.8v14.4a1.2 1.2 0 0 0 1.8 1l11.6-7.2a1.2 1.2 0 0 0 0-2L8.8 3.8A1.2 1.2 0 0 0 7 4.8z"/>'),
  pause: f('<rect x="5.5" y="4" width="4.5" height="16" rx="1.4"/><rect x="14" y="4" width="4.5" height="16" rx="1.4"/>'),
  next: f('<path d="M4.5 5.6v12.8a1.1 1.1 0 0 0 1.7.9l9.4-6.4a1.1 1.1 0 0 0 0-1.8L6.2 4.7a1.1 1.1 0 0 0-1.7.9z"/><rect x="17" y="4.5" width="2.6" height="15" rx="1.3"/>'),
  prev: f('<path d="M19.5 5.6v12.8a1.1 1.1 0 0 1-1.7.9l-9.4-6.4a1.1 1.1 0 0 1 0-1.8l9.4-6.4a1.1 1.1 0 0 1 1.7.9z"/><rect x="4.4" y="4.5" width="2.6" height="15" rx="1.3"/>'),
  shuffle: o('<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>'),
  repeat: o(REPEAT),
  repeat1: o(REPEAT + '<path d="M11 10h1v4"/>'),
  vol: o(SPEAKER + '<path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9.5 9.5 0 0 1 0 13"/>'),
  mute: o(SPEAKER + '<path d="m22 9-6 6"/><path d="m16 9 6 6"/>'),
  queue: o('<path d="M3 6h13"/><path d="M3 12h9"/><path d="M3 18h9"/><path d="M20 15V5l2 1"/><circle cx="17.5" cy="17.5" r="2.5"/>'),
  lyrics: o('<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 8h8"/><path d="M8 12h5"/>'),
  heart: o(HEART),
  heartF: f(HEART),
  more: f('<circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/>'),
  down: o('<path d="m6 9 6 6 6-6"/>'),
  x: o('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  note: o('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  user: o('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  save: o('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
  check: o('<path d="M20 6 9 17l-5-5"/>'),
  search: o('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  plus: o('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  mic: o('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/>'),
  book: o(BOOK),
  bookF: f(BOOK),
  arrow: o('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'),
  home: o('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  lib: o('<path d="M5 4v16"/><path d="M10 4v16"/><path d="m14.5 4.5 4.5 15"/>'),
  side: o('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/>'),
  full: o('<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/>'),
  moon: o('<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a6.5 6.5 0 0 0 11 11z"/>'),
  clock: o('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  sun: o('<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>'),
  contrast: o('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'),
  trash: o('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>'),
  edit: o('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  disc: o('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>'),
  panel: o('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>'),
  share: o('<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>'),
  pip: o('<rect x="2" y="4" width="20" height="16" rx="2.5"/><rect x="12" y="11" width="7" height="6" rx="1.2" fill="currentColor" stroke="none"/>'),
  copy: o('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  sliders: o('<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/>'),
  stats: o('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16V12"/><path d="M12 16V8"/><path d="M17 16v-5"/>'),
  fire: o('<path d="M12 22c4 0 7-2.7 7-7 0-4-3-6-4-9-1 2-2 3-4 3 1-3 0-5-2-7 0 4-5 6-5 12 0 4.3 3 8 8 8z"/>'),
  keys: o('<rect x="2" y="6" width="20" height="12" rx="2.5"/><path d="M6 10h.01"/><path d="M10 10h.01"/><path d="M14 10h.01"/><path d="M18 10h.01"/><path d="M7 14h10"/>'),
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
  log: [], // riwayat dengerin: [waktu, id, detik]
  smartIds: new Set(), // lagu sisipan smart shuffle
  skips: {}, // id -> berapa kali di-skip cepat
};
/* ---------- mesin audio: dua elemen, biar bisa crossfade & gapless ---------- */
// Lagu berikutnya disiapin di elemen cadangan, terus tinggal "tukar" pas pindah lagu.
const AUD = [$('#audio'), $('#audio2')];
let audio = AUD[0];
const standby = () => (audio === AUD[0] ? AUD[1] : AUD[0]);
// Event cuma diurus buat elemen yang lagi jadi pemutar utama
const onAudio = (ev, fn) => AUD.forEach((el) => el.addEventListener(ev, (e) => { if (e.target === audio) fn(e); }));
// iOS nggak ngizinin volume elemen diatur (dan elemen kedua bisa diblok di latar), jadi di sana pakai satu elemen aja
const DUAL = (() => { const a = document.createElement('audio'); a.volume = 0.5; return a.volume === 0.5; })();
const FX = { xf: 0, eq: 'flat', bands: [0, 0, 0, 0, 0] };
let sleepMul = 1, fadeIn = 1, ghost = null, xfT = 0, xfNow = false;
const userVol = () => (S.volume / 100) ** 2 * sleepMul;
function setElVol(el, v) {
  v = Math.max(0, Math.min(1, v));
  if (el._g) { el.volume = 1; el._g.gain.value = v; } else el.volume = v;
}
const applyVol = () => setElVol(audio, userVol() * fadeIn);
function dropEl(el) {
  el.pause();
  el._id = null;
  el.removeAttribute('src');
  el.load();
}
// Lagu lama pelan-pelan turun, lagu baru pelan-pelan naik (kurva equal-power biar nggak ada "lubang" di tengah)
function crossfadeFrom(old, dur) {
  endFade();
  ghost = old;
  const t0 = performance.now();
  fadeIn = 0;
  applyVol();
  xfT = setInterval(() => {
    const p = Math.min(1, (performance.now() - t0) / (dur * 1000));
    if (ghost) setElVol(ghost, userVol() * Math.cos((p * Math.PI) / 2));
    fadeIn = Math.sin((p * Math.PI) / 2);
    applyVol();
    if (p >= 1 || !ghost) endFade();
  }, 40);
}
function endFade() {
  clearInterval(xfT);
  xfT = 0;
  fadeIn = 1;
  applyVol();
  if (ghost) { const g = ghost; ghost = null; dropEl(g); }
}
function pauseAll() {
  endFade();
  audio.pause();
}
function upcoming() {
  if (S.repeat === 'one' || S.sleep?.endOfTrack) return null;
  const id = S.idx + 1 < S.queue.length ? S.queue[S.idx + 1] : S.repeat === 'all' ? S.queue[0] : null;
  return T(id)?.kind === 'song' ? id : null;
}
// Dipanggil tiap timeupdate: siapin lagu berikutnya ~25 detik sebelum habis, lalu mulai crossfade
function xfTick(c, d) {
  // audio._id beda = lagi di tengah pindah lagu; jangan ganggu elemen cadangan
  if (!DUAL || audio.paused || ghost || !d || audio._id !== S.queue[S.idx] || cur()?.kind !== 'song') return;
  const left = d - c;
  const id = upcoming();
  if (!id || left > FX.xf + 25) return;
  const sb = standby();
  if (sb._id !== id) { sb._id = id; sb.preload = 'auto'; sb.muted = audio.muted; sb.src = `/api/yt/stream/${T(id).vid}`; }
  if (FX.xf > 0 && left <= FX.xf && left > 0.5 && d > FX.xf * 2 + 10 && sb.readyState >= 3 && !sb.error) { xfNow = true; next(true); }
}

/* ---------- equalizer (Web Audio, baru dinyalain kalau dipakai) ---------- */
const BANDS = [[60, 'lowshelf', '60'], [230, 'peaking', '230'], [910, 'peaking', '910'], [3600, 'peaking', '3.6k'], [14000, 'highshelf', '14k']];
const EQ_PRESETS = {
  flat: ['Datar', [0, 0, 0, 0, 0]],
  bass: ['Bass Boost', [7, 4, 0, 0, 1]],
  vocal: ['Vokal', [-2, -1, 3, 4, 1]],
  acoustic: ['Akustik', [3, 1, 1, 3, 3]],
  electro: ['Elektronik', [5, 2, -2, 2, 5]],
  rock: ['Rock', [4, 2, -1, 2, 4]],
  night: ['Malam', [2, 1, 0, -2, -4]],
  treble: ['Treble', [-1, 0, 0, 3, 6]],
};
let actx = null, eqF = [], preG = null, anl = null, anBuf = null;
for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => { if (!actx && !audio.paused) wakeGraph(); }, { capture: true, passive: true });

/* ---------- visualizer: gelombang spektrum beneran, bagian yang udah lewat diwarnai ---------- */
const VIZ_N = 72;
let vizRaf = 0, vizV = null, vizCol = null, vizColAt = 0;
function vizStart() { if (!vizRaf) vizRaf = requestAnimationFrame(vizFrame); }
let vizLast = 0;
function vizFrame(now) {
  vizRaf = 0;
  if (LITE && now - vizLast < 40) { if (!audio.paused) vizRaf = requestAnimationFrame(vizFrame); return; }
  vizLast = now;
  const cvs = $$('canvas.spec').filter((c) => (c.closest('#np') ? npOpen() : c.offsetParent !== null));
  if (pipWin) cvs.push(...pipWin.document.querySelectorAll('canvas.spec'));
  if (!cvs.length && !npOpen()) return;
  vizV ||= new Float32Array(VIZ_N);
  if (!vizCol || now - vizColAt > 1000) {
    const cs = getComputedStyle(document.documentElement);
    vizCol = ['--viz-a', '--coral', '--viz-b', '--fg'].map((k) => cs.getPropertyValue(k).trim());
    vizColAt = now;
  }
  const playing = !audio.paused;
  const live = playing && anl && actx?.state === 'running';
  if (live) anl.getByteFrequencyData(anBuf);
  const binHz = (actx?.sampleRate || 48000) / 2048;
  let energy = 0;
  for (let i = 0; i < VIZ_N; i++) {
    let t = 0;
    if (live) {
      // Frekuensi disebar logaritmik (40 Hz - 15 kHz), kayak telinga dengerin
      const f0 = 40 * 375 ** (i / VIZ_N), f1 = 40 * 375 ** ((i + 1) / VIZ_N);
      let m = 0;
      for (let b = Math.floor(f0 / binHz); b <= Math.ceil(f1 / binHz); b++) m = Math.max(m, anBuf[b] || 0);
      // Bass biasanya paling keras: diredam dikit, treble didongkrak biar seimbang
      t = Math.min(0.95, (m / 255) ** 1.8 * (0.5 + (i / VIZ_N) * 1.1));
    } else if (playing) {
      t = 0.18 + 0.32 * Math.abs(Math.sin(i * 0.45 + now / 260) * Math.sin(i * 0.13 - now / 610));
    }
    vizV[i] += (t - vizV[i]) * (t > vizV[i] ? 0.55 : 0.14);
    energy += vizV[i];
  }
  const d = durNow(), prog = d ? Math.min(1, posNow() / d) : 0;
  for (const c of cvs) drawWave(c, prog);
  beatTick(now, live);
  if (npOpen() && !LITE) drawRing();
  hhFrame(now, live);
  if (playing || energy > 0.05) vizRaf = requestAnimationFrame(vizFrame);
}
// Bar spektrum yang tumbuh keluar dari keempat sisi cover di layar penuh, warnanya dari cover
let ringPal = null, ringPalU = '';
function drawRing() {
  const c = $('.np-ring'), art = $('.np-art');
  if (!c || !art) return;
  const t = cur();
  if (t?.art !== ringPalU) { ringPalU = t?.art || ''; ringPal = null; if (t?.art) palette(t.art).then((p) => { if (ringPalU === t.art) ringPal = p; }); }
  const dpr = devicePixelRatio || 1, cr = c.getBoundingClientRect(), ar = art.getBoundingClientRect();
  if (!cr.width || !ar.width) return;
  if (c.width !== Math.round(cr.width * dpr)) { c.width = Math.round(cr.width * dpr); c.height = Math.round(cr.height * dpr); }
  const x = c.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, cr.width, cr.height);
  const S0 = ar.width, gap = 12, x0 = ar.left - cr.left - gap, y0 = ar.top - cr.top - gap, side = S0 + gap * 2;
  const cx = x0 + side / 2, cy = y0 + side / 2, maxL = Math.min(70, S0 * 0.16);
  const [c1, c2, c3] = ringPal || [vizCol[0], vizCol[1], vizCol[2]];
  const g = x.createConicGradient(-Math.PI / 2, cx, cy);
  g.addColorStop(0, c1); g.addColorStop(0.33, c2); g.addColorStop(0.66, c3); g.addColorStop(1, c1);
  x.strokeStyle = g;
  x.lineCap = 'round';
  x.lineWidth = Math.max(2.5, side / 150);
  const n = 112;
  for (let k = 0; k < n; k++) {
    const pos = k / n;
    // spektrum dicerminkan biar simetris; bass di tengah sisi atas, sisi bawah dipendekin biar nggak nimpa judul
    const m = 1 - Math.abs(((pos - 0.125 + 1) % 1) * 2 - 1);
    const v = vizV[Math.floor(m * (VIZ_N - 1) * 0.75)];
    const tt = pos * 4, sd = Math.floor(tt), u = tt - sd;
    const L = 3 + v * maxL * (sd === 2 ? 0.35 : 1);
    let px, py, nx, ny;
    if (sd === 0) { px = x0 + u * side; py = y0; nx = 0; ny = -1; }
    else if (sd === 1) { px = x0 + side; py = y0 + u * side; nx = 1; ny = 0; }
    else if (sd === 2) { px = x0 + side - u * side; py = y0 + side; nx = 0; ny = 1; }
    else { px = x0; py = y0 + side - u * side; nx = -1; ny = 0; }
    x.globalAlpha = 0.35 + v * 0.65;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + nx * L, py + ny * L);
    x.stroke();
  }
  x.globalAlpha = 1;
}
function drawWave(c, prog) {
  const dpr = devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
  if (!w || !h) return;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const x = c.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, w, h);
  // Bar tipis membulat, simetris atas-bawah; yang udah lewat pakai gradasi, sisanya pudar
  const n = Math.max(24, Math.min(VIZ_N, Math.floor(w / 6)));
  const step = w / n, bw = Math.max(2, step * 0.5), mid = h / 2;
  const g = x.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, vizCol[0]);
  g.addColorStop(0.5, vizCol[1]);
  g.addColorStop(1, vizCol[2]);
  const px = w * prog;
  for (let k = 0; k < n; k++) {
    const v = vizV[Math.floor((k / n) * VIZ_N)];
    const bh = Math.max(bw, v * (h - 2));
    const bx = k * step + (step - bw) / 2;
    const on = bx + bw / 2 <= px;
    x.globalAlpha = on ? 1 : 0.22;
    x.fillStyle = on ? g : vizCol[3];
    x.beginPath();
    x.roundRect(bx, mid - bh / 2, bw, bh, bw / 2);
    x.fill();
  }
  x.globalAlpha = 1;
}
const eqOn = () => FX.bands.some((x) => x);
function graph() {
  if (actx) return actx;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  try {
    const ctx = new C();
    const srcs = AUD.map((el) => ctx.createMediaElementSource(el));
    preG = ctx.createGain();
    eqF = BANDS.map(([f, type]) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = 1.1; return b; });
    anl = ctx.createAnalyser();
    anl.fftSize = 2048;
    anl.smoothingTimeConstant = 0.72;
    anBuf = new Uint8Array(anl.frequencyBinCount);
    [preG, ...eqF, anl].reduce((a, b) => (a.connect(b), b)).connect(ctx.destination);
    AUD.forEach((el, i) => { el._g = ctx.createGain(); srcs[i].connect(el._g); el._g.connect(preG); });
    actx = ctx;
  } catch { return null; }
  applyEq();
  applyVol();
  return actx;
}
function applyEq() {
  if (!actx) return;
  const t = actx.currentTime;
  eqF.forEach((b, i) => b.gain.setTargetAtTime(FX.bands[i], t, 0.04));
  // Turunin sedikit gain depan biar band yang di-boost nggak bikin pecah
  preG.gain.setTargetAtTime(10 ** ((-Math.max(0, ...FX.bands) * 0.6) / 20), t, 0.04);
}
// Graph Web Audio harus dibikin pas ada interaksi user, kalau nggak AudioContext-nya ketahan (suspended) dan jadi senyap
// Di desktop graph selalu dipakai (buat visualizer); di iOS cuma kalau EQ nyala
function wakeGraph() {
  if (((DUAL && !LITE) || eqOn()) && !actx && (navigator.userActivation?.hasBeenActive ?? true)) graph();
  if (actx?.state === 'suspended') actx.resume().catch(() => {});
}
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

// Warna placeholder yang konsisten per lagu/gambar selagi cover belum kemuat
const hue = (x) => { let h = 2166136261; for (let i = 0; i < x.length; i++) h = Math.imul(h ^ x.charCodeAt(i), 16777619) >>> 0; return h % 360; };
const cover = (u, cls = '', seed = u) =>
  `<div class="cover ${cls}"${seed ? ` style="--h:${hue(seed)}"` : ''}>${cls.includes('round') ? I.user : I.note}${u ? `<img src="${esc(u)}" alt="" loading="lazy" decoding="async" onload="this.classList.add('ok')">` : ''}</div>`;

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
  const sb = standby();
  const fade = xfNow;
  xfNow = false;
  if (DUAL && t.kind === 'song' && !at && sb._id === t.id && sb.getAttribute('src') && !sb.error) {
    // Udah kebuffer di elemen cadangan: tukar, langsung bunyi tanpa jeda
    const old = audio;
    endFade();
    audio = sb;
    audio.muted = old.muted;
    if (audio.currentTime > 0.5) audio.currentTime = 0;
    if (fade && !old.paused && FX.xf > 0) crossfadeFrom(old, FX.xf);
    else { dropEl(old); applyVol(); }
    metaFix();
  } else {
    endFade();
    if (t.kind === 'pod') {
      audio.src = t.src;
      // Podcast lanjut dari menit terakhir
      if (!at && !S.podDone.has(t.id)) at = S.podpos[t.id] || 0;
    } else {
      audio.src = `/api/yt/stream/${t.vid}`;
    }
  }
  audio._id = t.id;
  counted = false;
  audio.defaultPlaybackRate = audio.playbackRate = t.kind === 'pod' ? S.rate : 1;
  if (at) audio.currentTime = at;
  S.restorePos = 0;
  if (play) audio.play().catch(() => {});
  setMediaSession(t);
  saveState();
  saveTracks();
  flipArt();
  loadChips();
  updateHomeHero();
}

function playFrom(ids, i = 0, shuffle = false, srcName) {
  ids = ids.filter((id) => T(id));
  if (!ids.length) return;
  S.src = { mix: false, name: srcName || pageSrcName(), chip: '' };
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
  S.smartIds.clear();
  load(i);
  if (S.shuffle === 'smart') smartFill();
}

function togglePlay() {
  if (S.idx < 0) return toast('Pilih lagu dulu ya');
  if (!audio.src) return load(S.idx, true, S.restorePos);
  audio.paused ? audio.play().catch(() => {}) : pauseAll();
}

/* ---------- up next: mix rekomendasi ala YouTube Music ---------- */

// S.src = sumber antrean: { mix, name, chip }. UPMETA = chip suasana buat lagu yang lagi diputar.
const UPN = new Map();
let UPMETA = { vid: '', chips: [] };
let mixLoading = false;
function upNext(vid, chip) {
  const k = `${vid}|${chip?.pl || ''}|${chip?.params || ''}`;
  if (!UPN.has(k)) {
    const q = chip ? `&pl=${enc(chip.pl)}&params=${enc(chip.params)}` : '';
    UPN.set(k, api(`/api/yt/upnext?vid=${vid}${q}`).catch((e) => { UPN.delete(k); throw e; }));
  }
  return UPN.get(k);
}
async function loadChips() {
  const t = cur();
  if (!t?.vid || t.kind !== 'song' || UPMETA.vid === t.vid) return;
  UPMETA = { vid: t.vid, chips: [] };
  try {
    const d = await upNext(t.vid);
    if (cur()?.vid !== t.vid) return;
    UPMETA = { vid: t.vid, chips: d.chips || [], title: d.title };
    renderQueue();
    renderNowSide(true);
  } catch {}
}
// Pilih lagu satuan (beranda, cari, chart) = mulai mix: lagunya diputar, "berikutnya" diisi rekomendasi
function playMix(id, list, i) {
  const t = T(id);
  if (!t?.vid || t.kind !== 'song') return playFrom(list || [id], i || 0);
  S.queue = [id];
  S.base = [id];
  S.src = { mix: true, name: `Mix ${t.title}`, chip: '' };
  load(0);
  fillMix(t.vid);
}
async function fillMix(vid, chip) {
  mixLoading = true;
  renderQueue();
  renderNowSide(true);
  try {
    const d = await upNext(vid, chip);
    const t = cur();
    if (t?.vid !== vid) return;
    if (d.title && !chip) S.src.name = d.title;
    S.src.chip = chip?.label || '';
    const ids = d.items.map((x) => song(x).id).filter((id) => id !== t.id);
    S.queue = [...S.queue.slice(0, S.idx + 1), ...ids];
    S.base = [...S.queue];
    ids.forEach((x) => S.radioIds.add(x));
    if (ids[0]) prefetch(ids[0]);
    saveTracks();
  } catch {
    toast('Rekomendasi gagal dimuat');
  } finally {
    mixLoading = false;
    renderQueue();
    renderNowSide(true);
    saveState();
  }
}
// Ganti suasana mix lewat chip (Semua, Temukan, Romansa, ...)
function pickChip(i) {
  const t = cur();
  const c = UPMETA.chips[i];
  if (!t || !c || UPMETA.vid !== t.vid) return;
  if (!S.src?.mix) S.src = { mix: true, name: UPMETA.title || `Mix ${t.title}`, chip: '' };
  S.src.chip = c.label;
  fillMix(t.vid, i === 0 ? null : c);
}
// Nama sumber buat daftar yang diputar dari halaman (album, playlist, favorit, dll)
const pageSrcName = () => $('.page .hero h1, .page .vh h1')?.textContent.trim() || 'Antrean';

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
  if (!auto) noteSkip();
  if (S.idx + 1 >= S.queue.length && S.radio && S.repeat !== 'all') await ensureRadio();
  if (S.idx + 1 < S.queue.length) return load(S.idx + 1);
  if (S.repeat === 'all' || !auto) return load(0, S.repeat === 'all' || !auto);
  pauseAll();
}

function prev() {
  if (audio.currentTime > 3 || S.idx <= 0) {
    if (!audio.src) return load(Math.max(0, S.idx));
    audio.currentTime = 0;
    return;
  }
  load(S.idx - 1);
}

// Acak: mati -> acak -> smart shuffle (diselipin lagu mirip ✨, lagu yang sering di-skip ditaruh belakang)
function toggleShuffle() {
  const id = S.queue[S.idx];
  S.shuffle = !S.shuffle ? true : S.shuffle === true ? 'smart' : false;
  if (S.shuffle === true) S.queue = [...S.queue.slice(0, S.idx + 1), ...shuffled(S.queue.slice(S.idx + 1))];
  else if (S.shuffle === 'smart') smartFill();
  else {
    dropSmart();
    if (S.base.length) { S.queue = [...S.base]; S.idx = Math.max(0, S.queue.indexOf(id)); }
  }
  renderBar();
  renderQueue();
  saveState();
  toast({ true: 'Acak nyala', smart: '✨ Smart shuffle: diselipin lagu mirip', false: 'Acak mati' }[S.shuffle]);
}
function dropSmart() {
  S.queue = S.queue.filter((x, i) => i <= S.idx || !S.smartIds.has(x));
  S.smartIds.clear();
}
let smartBusy = false;
async function smartFill() {
  const t = cur();
  if (!t?.vid || smartBusy) return;
  smartBusy = true;
  try {
    const rest = S.queue.slice(S.idx + 1).filter((x) => !S.smartIds.has(x));
    const ok = shuffled(rest.filter((x) => (S.skips[x] || 0) < 2)), late = rest.filter((x) => (S.skips[x] || 0) >= 2);
    const seeds = [t, ...ok.slice(0, 2).map(T)].filter((x) => x?.vid).slice(0, 2);
    const ds = await Promise.all(seeds.map((x) => upNext(x.vid).catch(() => null)));
    if (S.shuffle !== 'smart' || cur() !== t) return;
    const have = new Set(S.queue);
    const recs = shuffled([...new Set(ds.flatMap((d) => d?.items || []).map((x) => song(x).id))].filter((x) => !have.has(x) && (S.skips[x] || 0) < 2));
    const out = [];
    let r = 0;
    const add = () => { if (recs[r]) { S.smartIds.add(recs[r]); out.push(recs[r++]); } };
    ok.forEach((x, i) => { out.push(x); if (i % 3 === 2) add(); });
    while (out.length < 15 && recs[r]) add();
    S.queue = [...S.queue.slice(0, S.idx + 1), ...out, ...late];
    saveTracks();
    renderQueue();
    renderNowSide(true);
    saveState();
  } finally { smartBusy = false; }
}
// Skip di 30 detik pertama = sinyal "kurang suka"
const saveSkips = debounce(() => kv.set('skips', S.skips), 1000);
function noteSkip() {
  const t = cur();
  if (!t || t.kind !== 'song' || !audio.src) return;
  const c = audio.currentTime, d = durNow();
  if (c < 30 && d > 60) { S.skips[t.id] = (S.skips[t.id] || 0) + 1; saveSkips(); }
  else if (c > d * 0.6 && S.skips[t.id]) { S.skips[t.id]--; saveSkips(); }
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
  audio.muted = false;
  applyVol();
  $$('input.vol').forEach((r) => { r.value = v; r.style.setProperty('--p', v + '%'); });
  renderMute();
  saveState();
}

function renderMute() {
  const m = audio.muted || S.volume === 0;
  $$('[data-act=mute]').forEach((b) => (b.innerHTML = m ? I.mute : I.vol));
}

const stopLoading = () => { $('#lcd').classList.remove('loading'); renderPlayBtn(); };
onAudio('playing', () => {
  stopLoading();
  // Siapin lagu berikutnya biar pindah lagu langsung bunyi
  prefetch(S.queue[S.idx + 1]);
  ensureRadio();
});
onAudio('canplay', stopLoading);
onAudio('play', () => {
  document.body.classList.remove('paused');
  renderPlayBtn(true);
  const t = cur();
  if (t && !counted) {
    counted = true;
    const p = (S.plays[t.id] ||= { n: 0, last: 0 });
    p.n++;
    p.last = Date.now();
    savePlays();
    logStart(t.id);
  }
  wakeGraph();
  vizStart();
  updateHomeHero();
  lyrLoop();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});
onAudio('pause', () => {
  updateHomeHero();
  document.body.classList.add('paused');
  renderPlayBtn(true);
  saveState();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
});
/* ---------- timer tidur ---------- */

function setSleep(v) {
  S.sleep = v;
  sleepMul = 1;
  applyVol();
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
  pauseAll();
  sleepMul = 1;
  applyVol();
  S.sleep = null;
  renderSleep();
  toast('Timer tidur: musik dijeda, selamat istirahat');
}
setInterval(() => {
  if (!S.sleep?.until) return;
  const left = S.sleep.until - Date.now();
  // Volume turun pelan di 10 detik terakhir
  if (left <= 10000 && left > 0 && !audio.paused) {
    sleepMul = left / 10000;
    applyVol();
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

onAudio('ended', () => {
  if (S.sleep?.endOfTrack) { audio.currentTime = 0; return sleepStop(); }
  if (cur()?.kind === 'pod') {
    markDone(cur().id);
    if (!S.autoplay && S.repeat !== 'one') return;
  }
  if (S.repeat === 'one') replay();
  else next(true);
});
onAudio('error', () => {
  stopLoading();
  if (!audio.src) return;
  const t = cur();
  if (S.serverOk === false) return toast('Server Svara belum nyala, jalanin ./senandung dulu');
  toast(t?.kind === 'pod' ? 'Episode ini gagal diputar' : `“${t?.title}” gagal diputar, lanjut ke berikutnya`);
  if (S.idx + 1 < S.queue.length) setTimeout(() => cur() === t && next(true), 1400);
});
function metaFix() {
  const t = cur();
  if (t && isFinite(audio.duration) && Math.abs((t.duration || 0) - audio.duration) > 2) {
    t.duration = audio.duration;
    saveTracks();
  }
  tick();
}
onAudio('loadedmetadata', metaFix);

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
  xfTick(c, d);
  logTick();
  hhLyr();
  vizStart();
  if ('mediaSession' in navigator && d && isFinite(d) && audio.src) {
    try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(c, d), playbackRate: audio.playbackRate }); } catch {}
  }
}
onAudio('timeupdate', tick);

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
  h('pause', () => pauseAll());
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
  $$('[data-act=shuffle]').forEach((b) => {
    b.innerHTML = I.shuffle;
    b.classList.toggle('on', !!S.shuffle);
    b.classList.toggle('smart', S.shuffle === 'smart');
    b.title = { true: 'Acak (klik lagi: smart shuffle)', smart: 'Smart shuffle (klik: matiin)', false: 'Acak' }[S.shuffle];
  });
  $$('[data-act=repeat]').forEach((b) => { b.innerHTML = S.repeat === 'one' ? I.repeat1 : I.repeat; b.classList.toggle('on', S.repeat !== 'off'); });
  $$('.ib[data-act=queue]').forEach((b) => { b.innerHTML = I.queue; b.classList.toggle('on', S.panel === 'queue'); });
  $$('.ib[data-act=lyrics]').forEach((b) => {
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

  const title = t ? t.title : 'Svara';
  for (const e of $$('[data-np=title]')) {
    if (e.dataset.v === title) continue;
    const first = e.dataset.v === undefined;
    e.dataset.v = title;
    marquee(e, title);
    if (!first && !reduceMotion.matches) for (const x of [e, e.nextElementSibling]) x?.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
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
  for (const im of [$('.lcd-art img'), $('.np-art img'), $('.np-bg img')]) {
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
  if (!t) document.title = 'Svara';
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
  const key = [t?.id, S.panel, S.lyr ? (S.lyr.none ? 'n' : S.lyr.lines.length) : '-', S.loved.has(t?.id), S.queue.slice(S.idx + 1, S.idx + 6).join(), mixLoading, S.src?.name, S.src?.chip, UPMETA.vid, UPMETA.chips.length].join('|');
  if (!force && key === sideKey) return;
  sideKey = key;
  setTimeout(vizStart, 0);
  if (S.panel === 'queue' && !npOpen()) {
    el.innerHTML = `<div class="side-h"><b>Antrean</b><button class="ib sm" data-act="queue" aria-label="Tutup antrean">${I.x}</button></div><div class="side-scroll">${queueHtml()}</div>`;
    return;
  }
  if (!t) {
    el.innerHTML = `<div class="side-empty"><figure class="poster"><img src="assets/band.jpg" alt="Ilustrasi band main musik bareng" width="720" height="888"></figure><b>Belum ada yang diputar</b><p>Pilih lagu dari beranda, atau cari lagu favorit lo di atas.</p></div>`;
    return;
  }
  const up = S.queue.slice(S.idx + 1, S.idx + 6).filter((id) => T(id));
  el.innerHTML = `<div class="side-h"><b>${esc(t.album || t.artist)}</b><button class="ib sm" data-act="side" title="Tutup panel" aria-label="Tutup panel">${I.x}</button></div>
    <div class="side-scroll">
      <button class="side-art" data-act="np" aria-label="Layar penuh">${cover(t.art, '', t.id)}</button>
      <canvas class="spec" aria-hidden="true"></canvas>
      <div class="side-meta"><div><b>${esc(t.title)}</b><small>${subLink(t)}</small></div><button class="ib" data-act="love" aria-label="Suka">${S.loved.has(t.id) ? I.heartF : I.heart}</button></div>
      <div class="side-card side-up"><div class="sc-h"><b>Berikutnya</b><button class="link" data-act="queue">Buka antrean</button></div>${upHeadHtml()}
        ${mixLoading ? upSkel(4) : up.length ? up.map((id) => { const x = T(id); return `<div class="side-next" data-qi="${S.queue.indexOf(id, S.idx + 1)}">${cover(x.art, 'sm', x.id)}<span><b>${esc(x.title)}</b><small>${esc(x.artist)}</small></span><em class="q-dur mono">${x.duration ? fmt(x.duration) : ''}</em></div>`; }).join('') : '<p class="sl-note">Nggak ada lagi setelah ini.</p>'}</div>
      <div class="side-card side-lyr" data-act="lyrics"><div class="sc-h"><b>Lirik</b><span>Tampilkan semua</span></div><div class="sl-body">${sideLyrHtml()}</div></div>
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
  if (!c) { np.style.removeProperty('--np-bg'); np.style.removeProperty('--np-bg2'); document.documentElement.style.removeProperty('--art'); return; }
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
  document.documentElement.style.setProperty('--art', `hsl(${Math.round(h)} ${Math.round(sat)}% 58%)`);
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
  if (open && S.panel === null && !isMobile()) S.panel = 'queue';
  renderPanels();
  lyrLoop();
  setTimeout(vizStart, 60);
}

function renderPanels() {
  $('#np').classList.toggle('has-right', !!S.panel);
  $('#np').classList.toggle('p-queue', S.panel === 'queue');
  $$('.np-tabs button').forEach((b) => { const on = b.dataset.p === S.panel; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
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

// Potongan "up next": sumber, tombol simpan, chip suasana, lalu daftar lagu (lagu sekarang di paling atas)
function upHeadHtml() {
  const t = cur();
  const chips = UPMETA.vid === t?.vid ? UPMETA.chips : [];
  const on = S.src?.mix ? S.src.chip || chips[0]?.label : '';
  return `<div class="un-h"><div class="un-src"><small>Diputar dari</small><b>${esc(S.src?.name || 'Antrean')}</b></div>
      <button class="btn sm un-save" data-do="qsave" title="Simpan antrean jadi playlist">${I.plus} Simpan</button></div>
    ${chips.length ? `<div class="un-chips">${chips.map((c, i) => `<button class="${c.label === on ? 'on' : ''}" data-do="chip" data-c="${i}">${esc(c.label)}</button>`).join('')}</div>` : ''}`;
}
const upRow = (id, qi, now) => {
  const x = T(id);
  return `<li class="q-row${now ? ' q-cur' : ''}" data-qi="${qi}" draggable="${now ? 'false' : 'true'}">${cover(x.art, 'sm', x.id)}
    <div class="q-txt"><div>${esc(x.title)}</div><span>${S.smartIds.has(id) ? '<em class="rtag smart">✨ smart</em> ' : S.radioIds.has(id) && !S.src?.mix ? '<em class="rtag">radio</em> ' : ''}${esc(x.artist)}</span></div>
    ${now ? EQ : ''}<span class="q-dur mono">${x.duration ? fmt(x.duration) : ''}</span>
    ${now ? '' : `<button class="ib xs" data-do="qremove" title="Hapus dari antrean" aria-label="Hapus">${I.x}</button>`}</li>`;
};
const upSkel = (n) => `<ol class="q-list">${'<li class="q-row q-sk"><i></i><b></b></li>'.repeat(n)}</ol>`;

function queueHtml() {
  const t = cur();
  if (!t) return `<div class="qbox q-empty">${I.queue}<p>Antrean kosong.<br>Putar lagu atau album buat ngisi.</p></div>`;
  const up = S.queue.slice(S.idx + 1);
  const shown = up.slice(0, 200);
  return `<div class="qbox">${upHeadHtml()}
    <ol class="q-list">${upRow(t.id, S.idx, true)}${mixLoading ? '' : shown.map((id, k) => upRow(id, S.idx + 1 + k)).join('')}</ol>
    ${mixLoading ? upSkel(6) : up.length ? `<div class="q-foot"><small>${nf.format(up.length)} lagu berikutnya</small><button class="link" data-do="qclear">Bersihkan</button></div>` : `<p class="q-note">${S.repeat === 'all' ? 'Habis ini balik ke awal.' : 'Nggak ada lagi setelah ini.'}</p>`}
    <button class="radio-sw${S.radio ? ' on' : ''}" data-do="radio"><span><b>Radio otomatis</b><small>Lanjut ke lagu mirip kalau antrean habis</small></span><i></i></button></div>`;
}

function renderQueue() {
  if (!npOpen() && S.panel === 'queue') renderNowSide(true);
  if (npOpen() && S.panel === 'queue') $('#npBody').innerHTML = `<div class="np-q">${queueHtml()}</div>`;
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
  const box = $('#npBody');
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
      return `<div ${attrs}><span class="ep-thumb">${cover(t.art, 'wide', t.id)}<span class="pc">${EQ}<i class="hp">${I.play}</i></span>${t.duration ? `<span class="ep-dur mono">${fmt(t.duration)}</span>` : ''}${prog ? `<span class="ep-prog"><i style="--p:${prog.toFixed(1)}%"></i></span>` : ''}</span>
        <span class="ep-body"><b>${esc(t.title)}</b><small>${meta}</small>${t.desc ? `<p>${esc(t.desc)}</p>` : ''}</span>
        <span class="tm">${love}<button class="ib xs" data-do="more" title="Lainnya" aria-label="Lainnya">${I.more}</button></span></div>`;
    }
    if (mode === 'album') {
      return `<div ${attrs}>${pc}<span class="tt"><span class="tt-t"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span></span>${tail}</div>`;
    }
    const album = t.kind === 'pod' ? 'Podcast' : t.albumId ? `<a href="#/c/${enc(t.albumId)}">${esc(t.album)}</a>` : esc(t.album);
    return `<div ${attrs}>${pc}<span class="tt">${cover(t.art, 'xs', t.id)}<span class="tt-t"><b>${esc(t.title)}</b><small>${subLink(t)}</small></span></span><span class="tal">${album}</span>${tail}</div>`;
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
    return `<div class="mini tilt" data-id="${esc(id)}" data-ml="${key}" data-i="${i}">${cover(t.art, '', id)}<div class="mt"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></div><span class="go">${I.play}</span></div>`;
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
    <span class="card-art">${cover(t.art, '', id)}</span><span class="cplay" aria-hidden="true">${I.play}</span>
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

// Kartu sorotan buat lagu #1 trending: latar cover diblur, tombol putar gede
function spotlightHtml(items) {
  if (!items.length) return '';
  const ids = items.map((x) => itemId(x));
  const t = T(ids[0]);
  return `<section class="spot" data-id="${esc(ids[0])}" data-ml="${listKey(ids)}" data-i="0">
    ${t.art ? `<div class="spot-bg" aria-hidden="true"><img src="${esc(t.art)}" alt="" onload="this.classList.add('ok')"></div>` : ''}
    ${cover(t.art, 'spot-art', ids[0])}
    <div class="spot-info"><span class="spot-k">🔥 #1 Trending minggu ini</span><h2>${esc(t.title)}</h2><p>${esc(t.artist)}</p>
      <span class="btn ink spot-play">${I.play} Putar sekarang</span></div>
    ${EQ}</section>`;
}

// Rak mood: kartu gradasi + emoji, warnanya diambil dari palet kotak jelajah
const MOOD_EMOJI = [[/galau|sad/i, '💔'], [/santai|chill/i, '🌇'], [/indie/i, '🎸'], [/lo-?fi/i, '📚'], [/dangdut|koplo/i, '🥁'], [/k-?pop/i, '💜'],
  [/akustik|acoustic/i, '🪕'], [/90/i, '📼'], [/workout/i, '💪'], [/jazz/i, '🎷'], [/hits/i, '🔥']];
// Kartu mood pakai cover lagu beneran dari hasil pencarian mood itu (disimpan 3 hari)
const artSize = (u, n) => (u && /googleusercontent|ggpht/.test(u) ? u.replace(/=w\d+-h\d+/, `=w${n}-h${n}`) : u);
const MOOD_ART = (() => { try { return JSON.parse(localStorage.getItem('putar-moodart')) || {}; } catch { return {}; } })();
const moodArtHtml = (m) => {
  const a = MOOD_ART[m]?.arts;
  if (!a?.length) return `<span class="mood-e">${MOOD_EMOJI.find(([re]) => re.test(m))?.[1] || '🎵'}</span>`;
  return `<span class="mood-art">${a.slice(0, 2).reverse().map((u, i, l) => `<img class="${i === l.length - 1 ? 'm1' : 'm2'}" src="${esc(img(artSize(u, 360)))}" alt="" loading="lazy" decoding="async" onload="this.classList.add('ok')">`).join('')}</span>`;
};
let moodArtBusy = false;
async function loadMoodArt() {
  if (moodArtBusy) return;
  const need = MOODS.filter((m) => !MOOD_ART[m] || Date.now() - MOOD_ART[m].at > 3 * 864e5);
  if (!need.length) return;
  moodArtBusy = true;
  const one = async (m) => {
    try {
      const items = await api(`/api/yt/search?type=songs&q=${enc(m)}`);
      items.forEach((x) => itemId(x));
      S.search[`songs|${m}`] ||= { items }; // sekalian: pas kartunya diklik, hasilnya udah siap
      MOOD_ART[m] = { at: Date.now(), arts: [...new Set(items.map((x) => x.art).filter(Boolean))].slice(0, 2) };
      try { localStorage.setItem('putar-moodart', JSON.stringify(MOOD_ART)); } catch {}
      const card = $$('.mood').find((c) => c.dataset.m === m);
      if (card) { $('.mood-e, .mood-art', card)?.remove(); card.insertAdjacentHTML('beforeend', moodArtHtml(m)); }
    } catch {}
  };
  const q = [...need];
  await Promise.all([0, 1, 2].map(async () => { while (q.length) await one(q.shift()); }));
  moodArtBusy = false;
}
const moodCards = () => {
  setTimeout(loadMoodArt, 300);
  return `<div class="row moods">${MOODS.map((m, i) => `<a class="mood" style="--c:${BROWSE_COLORS[i % BROWSE_COLORS.length]}" href="#/search/songs/${enc(m)}" data-m="${esc(m)}"><b>${esc(m)}</b>${moodArtHtml(m)}</a>`).join('')}</div>`;
};

// Chart bernomor: dua kolom, peringkat gede, ada equalizer pas diputar
function chartHtml(items) {
  const ids = items.map((x) => itemId(x));
  const key = listKey(ids);
  return `<ol class="chart">${ids.map((id, i) => {
    const t = T(id);
    return `<li class="ch-row r${i + 1}" data-id="${esc(id)}" data-ml="${key}" data-i="${i}"><span class="ch-n">${i + 1}</span>${cover(t.art, 'sm', id)}<span class="ch-t"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span>${EQ}<span class="ch-go">${I.play}</span></li>`;
  }).join('')}</ol>`;
}

/* ---------- gambar khusus: Lagu Disukai & Svara Recap ---------- */
let artUid = 0;
// Ilustrasi hati mengkilap (dipakai kalau belum ada lagu yang di-love)
function heartSvg() {
  const u = `h${++artUid}`;
  return `<svg class="art-svg" viewBox="0 0 64 64" aria-hidden="true"><defs>
    <linearGradient id="${u}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a8b"/><stop offset=".5" stop-color="#ff5e9c"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient>
    <radialGradient id="${u}b" cx=".28" cy=".2" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ffd3e6"/></linearGradient>
    <filter id="${u}d" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#6d1b5b" flood-opacity=".45"/></filter></defs>
    <rect width="64" height="64" fill="url(#${u}a)"/><circle cx="50" cy="54" r="22" fill="#fff" opacity=".08"/><circle cx="10" cy="8" r="16" fill="#fff" opacity=".07"/><rect width="64" height="64" fill="url(#${u}b)"/>
    <path filter="url(#${u}d)" fill="url(#${u}c)" d="M32 50 18.6 37.2C13 31.8 14 23.5 20.4 21.4c3.9-1.3 7.9.2 10.2 3.4l1.4 1.9 1.4-1.9c2.3-3.2 6.3-4.7 10.2-3.4 6.4 2.1 7.4 10.4 1.8 15.8z"/>
    <ellipse cx="23.5" cy="27" rx="3.8" ry="2.4" fill="#fff" opacity=".9" transform="rotate(-35 23.5 27)"/>
    <path fill="#fff" d="M49 12l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2zM13 44l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" opacity=".9"/></svg>`;
}
// Ilustrasi grafik naik (dipakai kalau belum ada riwayat)
function recapSvg() {
  const u = `r${++artUid}`;
  return `<svg class="art-svg" viewBox="0 0 64 64" aria-hidden="true"><defs>
    <linearGradient id="${u}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc94a"/><stop offset=".55" stop-color="#ff6a88"/><stop offset="1" stop-color="#7c5cff"/></linearGradient>
    <radialGradient id="${u}b" cx=".25" cy=".18" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="64" height="64" fill="url(#${u}a)"/><rect width="64" height="64" fill="url(#${u}b)"/>
    <g fill="#fff"><rect x="13" y="38" width="7" height="14" rx="3.5" opacity=".55"/><rect x="23.5" y="30" width="7" height="22" rx="3.5" opacity=".7"/><rect x="34" y="34" width="7" height="18" rx="3.5" opacity=".6"/><rect x="44.5" y="22" width="7" height="30" rx="3.5" opacity=".9"/></g>
    <path d="M14 30 26 21l10 5 13-13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="49" cy="13" r="4" fill="#fff"/><circle cx="49" cy="13" r="7.5" fill="#fff" opacity=".25"/></svg>`;
}
// Kartu Lagu Disukai: kolase cover lagu favorit + lencana hati
function lovedArt(cls = '') {
  const arts = [...new Set([...S.loved].reverse().map((id) => T(id)?.art).filter(Boolean))].slice(0, 4);
  const body = arts.length >= 4 ? `<div class="mosaic-in">${arts.map((u) => `<img src="${esc(u)}" alt="" onload="this.classList.add('ok')">`).join('')}</div>`
    : arts.length ? `<img src="${esc(arts[0])}" alt="" onload="this.classList.add('ok')">` : heartSvg();
  return `<div class="cover sp-art ${cls}${arts.length ? ' has-img' : ''}">${body}${arts.length ? `<span class="art-badge love">${I.heartF}</span>` : ''}</div>`;
}
// Kartu Recap: cover lagu yang paling sering diputar + lencana grafik
function recapArt(cls = '') {
  const top = favSongs().map((id) => T(id)?.art).filter(Boolean)[0];
  return `<div class="cover sp-art ${cls}${top ? ' has-img' : ''}">${top ? `<img src="${esc(top)}" alt="" onload="this.classList.add('ok')"><span class="art-shade"></span>` : recapSvg()}${top ? `<span class="art-badge stat">${I.stats}</span>` : ''}</div>`;
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
// Chip mood ikut negara pengguna (dideteksi server dari YouTube Music)
const MOODS_ID = ['Galau', 'Santai sore', 'Indie Indonesia', 'Lo-fi belajar', 'Dangdut koplo', 'K-pop', 'Akustik', 'Lagu 90an', 'Workout', 'Jazz'];
const moodsFor = (r) => (!r?.code || r.code === 'ID' ? MOODS_ID
  : [`Hits ${r.name}`, 'Chill', 'Lo-fi', 'Sad songs', `Indie ${r.name}`, 'K-pop', 'Acoustic', 'Workout', '90s hits', 'Jazz']);
let REGION = null;
try { REGION = JSON.parse(localStorage.getItem('putar-region')); } catch {}
let MOODS = moodsFor(REGION);
async function loadRegion() {
  try {
    const r = await api('/api/yt/region');
    if (!r?.code) return;
    const prev = REGION?.code;
    REGION = r;
    MOODS = moodsFor(r);
    try { localStorage.setItem('putar-region', JSON.stringify(r)); } catch {}
    if (prev && prev !== r.code) {
      // Pindah negara: rekomendasi yang kesimpen nggak relevan lagi
      S.feed = null; S.podTop = null; kv.set('feed', null);
      loadFeed();
    }
    if (prev !== r.code) route(true);
  } catch {}
}
const BROWSE_COLORS = ['#e13300', '#1e3264', '#8400e7', '#e8115b', '#148a08', '#bc5900', '#503750', '#0d73ec', '#477d95', '#af2896'];
const TABS = [['songs', 'Lagu'], ['albums', 'Album'], ['artists', 'Artis'], ['playlists', 'Playlist']];

/* ---------- hero beranda: ikut keadaan (pengguna baru / ada riwayat / lagi muter) ---------- */

const GREET_E = { pagi: '☀️', siang: '🌤️', sore: '🌇', malam: '🌙' };
const GREET_EN = { pagi: 'Good morning', siang: 'Good afternoon', sore: 'Good evening', malam: 'Good evening' };
const MIX_NAME = { pagi: 'Morning Boost Mix', siang: 'Afternoon Focus Mix', sore: 'Golden Hour Mix', malam: 'Late Night Mix' };
// Lagu favorit: sering diputar, yang baru-baru ini bobotnya lebih gede
function favSongs() {
  const now = Date.now();
  return Object.entries(S.plays)
    .filter(([id]) => T(id)?.kind === 'song')
    .map(([id, p]) => [id, p.n * (now - p.last < 30 * 864e5 ? 1 : 0.35)])
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
const lastSong = () => Object.keys(S.plays).filter((id) => T(id)?.kind === 'song').sort((a, b) => S.plays[b].last - S.plays[a].last)[0];
const heroTrack = () => (cur()?.kind === 'song' ? cur() : T(lastSong()));
const heroState = () => (cur() && !audio.paused ? 'play' : heroTrack() ? 'back' : 'new');

function hhLeft(st, t) {
  const g = GREET();
  if (st === 'play') {
    const n = S.plays[t.id]?.n || 0;
    const tags = [`<span class="hh-tag live">${EQ.replace('eq', 'eq hh-eq')} Now playing</span>`];
    if (S.src?.name) tags.push(`<span class="hh-tag">${I.disc}${esc(S.src.name)}</span>`);
    if (n > 1) tags.push(`<span class="hh-tag">${I.fire}Played ${n}×</span>`);
    if (S.loved.has(t.id)) tags.push(`<span class="hh-tag love">${I.heartF}Favorite</span>`);
    return `<div class="hh-tags">${tags.join('')}</div>
      <h1 class="hh-t">${esc(t.title)}</h1><p class="hh-a">${esc(t.artist)}</p>
      <div class="hh-lyr" aria-live="off"><p class="l1"></p><p class="l2"></p></div>
      <div class="hh-prog"><span class="hh-cur">0:00</span><canvas class="spec hh-spec" aria-hidden="true"></canvas><span class="hh-rem">-0:00</span></div>
      <div class="hh-ctl"><button class="ib xl hh-play" data-act="play" aria-label="Putar atau jeda">${I.pause}</button><button class="ib" data-act="next" aria-label="Berikutnya">${I.next}</button><button class="ib" data-act="love" aria-label="Suka">${S.loved.has(t.id) ? I.heartF : I.heart}</button><button class="ib" data-act="np" aria-label="Layar penuh">${I.full}</button><button class="ib" data-act="share" aria-label="Bagikan">${I.share}</button>
        <button class="hh-next" data-do="hhnext" hidden><span class="hh-next-art"></span><span class="hh-next-t"><small>Up next</small><b></b></span></button></div>`;
  }
  // Tanda tanya nempel ke kata yang berganti, biar nggak turun sendirian ke baris baru
  const head = `<p class="h2-k">${GREET_EN[g]} ${GREET_E[g]}</p><h1>In the mood for <span class="rq"><span class="rot"><b>${esc(ROT_WORDS[rotI])}</b></span>?</span></h1>`;
  if (st === 'new') {
    return head + `<p class="hh-sub">Pick a mood and let Svara handle the rest.</p><div class="hh-moods">${MOODS.slice(0, 4).map((m) => `<a href="#/search/songs/${enc(m)}"><span>${MOOD_EMOJI.find(([re]) => re.test(m))?.[1] || '🎵'}</span>${esc(m)}</a>`).join('')}</div>`;
  }
  const fav = favSongs();
  const arts = [...new Set(fav.map((id) => mainArtist(T(id).artist)).filter(Boolean))].slice(0, 2);
  const covers = [...new Set(fav.map((id) => T(id).art).filter(Boolean))].slice(0, 3);
  const resume = cur()?.kind === 'song' ? cur() : t;
  return head + `<div class="hh-acts">
      <button class="hh-mix" data-do="daymix"><span class="hh-mix-art">${covers.map((u, i) => `<img src="${esc(u)}" alt="" style="--i:${i}" onload="this.classList.add('ok')">`).join('')}<span class="hh-mix-go">${I.play}</span></span><span class="hh-mix-t"><b>Play ${MIX_NAME[g]}</b><small>${arts.length ? `${arts.map(esc).join(' & ')} + similar songs` : 'Your favorites + similar songs'}</small></span></button>
      ${resume ? `<button class="hh-cont" data-do="hhcont">${I.repeat}<span>Resume <b>${esc(resume.title)}</b></span></button>` : ''}
    </div>`;
}
function hhRight(st, t) {
  if (st === 'new') return `<div class="hh-r"><img class="h2-img" src="assets/dengerin.png" alt="Dua orang dengerin musik pakai headphone di kereta" width="478" height="472"></div>`;
  // Piringan nyembul dari sampul albumnya; pas diputar, keluar lebih jauh dan muter
  return `<div class="hh-r"><span class="hh-rings" aria-hidden="true"><i></i><i></i><i></i><i></i></span><div class="deck"><div class="vinyl-slot"><div class="vinyl"><span class="vinyl-lbl">${cover(t.art, '', t.id)}</span></div></div><div class="sleeve">${cover(bigArt(t.art), '', t.id)}</div></div></div>`;
}
let hhKey = '';
function homeHero() {
  const st = heroState(), t = heroTrack();
  hhKey = `${st}|${t?.id || ''}`;
  return `<section class="hello2 hh st-${st}" data-art="${esc(t?.art || '')}">${st === 'new' ? '' : hhBg(t)}<div class="h2-t hh-l">${hhLeft(st, t)}</div>${hhRight(st, t)}<span class="notes" aria-hidden="true"><i>♪</i><i>♫</i><i>♪</i><i>♬</i><i>♩</i></span></section>`;
}
// Latar hero: aurora 3 warna dari cover + cover raksasa samar di kanan + grain
const hhBg = (t) => `<div class="hh-bg" aria-hidden="true"><img class="hh-bgart" src="${esc(bigArt(t.art) || '')}" alt="" decoding="async" onload="this.classList.add('ok')"><i class="b1"></i><i class="b2"></i><i class="b3"></i><span class="hh-grain"></span></div>`;
// Ambil 3 warna yang paling "hidup" dan beda-beda dari cover
const artPal = new Map();
function palette(u) {
  if (artPal.has(u)) return Promise.resolve(artPal.get(u));
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      try {
        const c = new OffscreenCanvas(32, 32), x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(im, 0, 0, 32, 32);
        const px = x.getImageData(0, 0, 32, 32).data, bins = new Map();
        for (let i = 0; i < px.length; i += 4) {
          const k = ((px[i] >> 5) << 6) | ((px[i + 1] >> 5) << 3) | (px[i + 2] >> 5);
          const b = bins.get(k) || [0, 0, 0, 0];
          b[0] += px[i]; b[1] += px[i + 1]; b[2] += px[i + 2]; b[3]++;
          bins.set(k, b);
        }
        const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let h = 0; if (d) h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; return [h, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l]; };
        const cand = [...bins.values()].map((b) => { const rgb = [b[0] / b[3], b[1] / b[3], b[2] / b[3]]; const [h, sat, l] = hsl(rgb); return { rgb, h, score: b[3] * (0.25 + sat) * (l > 0.08 && l < 0.92 ? 1 : 0.2) }; }).sort((a, b) => b.score - a.score);
        const pick = [];
        for (const c2 of cand) { if (pick.every((p) => Math.min(Math.abs(p.h - c2.h), 360 - Math.abs(p.h - c2.h)) > 28)) pick.push(c2); if (pick.length === 3) break; }
        // Warna dibikin "hidup": saturasi & terang dinaikin; cover yang pucat (putih/abu) pakai warna Svara
        const vivid = pick.filter((p) => hsl(p.rgb)[1] > 0.18 && hsl(p.rgb)[2] > 0.12 && hsl(p.rgb)[2] < 0.9).map((p) => { const [h, sat] = hsl(p.rgb); return `hsl(${Math.round(h)} ${Math.round(Math.max(0.62, Math.min(0.9, sat)) * 100)}% 58%)`; });
        const brand = ['hsl(42 100% 62%)', 'hsl(0 100% 72%)', 'hsl(256 100% 78%)'];
        const out = [...vivid, ...brand].slice(0, 3);
        artPal.set(u, out);
        res(out);
      } catch { res(null); }
    };
    im.onerror = () => res(null);
    im.src = u;
  });
}
function tintHero(el) {
  const u = el.dataset.art;
  if (!u) return el.style.removeProperty('--tint');
  artLoad(u).then(() => { const c = artColors.get(u); if (c && el.dataset.art === u) el.style.setProperty('--tint', `rgb(${c.join(' ')})`); });
  palette(u).then((p) => { if (p && el.dataset.art === u) p.forEach((c, i) => el.style.setProperty(`--c${i + 1}`, c)); });
}
// Ganti isi hero tanpa render ulang halaman: piringan tetap di tempat, jarumnya yang gerak
function updateHomeHero() {
  renderPip();
  const el = $('.page .hh');
  if (!el) return;
  const st = heroState(), t = heroTrack();
  const key = `${st}|${t?.id || ''}`;
  if (key === hhKey) return;
  const [pst, pid] = hhKey.split('|');
  hhKey = key;
  if (pst === 'new' || st === 'new') {
    el.outerHTML = homeHero();
    const n = $('.page .hh');
    if (n) tintHero(n);
    return;
  }
  el.classList.remove('st-play', 'st-back');
  el.classList.add(`st-${st}`);
  const l = $('.hh-l', el);
  l.innerHTML = hhLeft(st, t);
  if (!reduceMotion.matches) l.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
  if (pid !== (t?.id || '')) {
    $('.hh-r', el).outerHTML = hhRight(st, t);
    $('.hh-bg', el)?.replaceWith(document.createRange().createContextualFragment(hhBg(t)));
    if (!reduceMotion.matches) $('.deck', el).animate([{ transform: 'translateY(14px) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.34,1.3,.64,1)' });
    el.dataset.art = t.art || '';
    tintHero(el);
  }
  hhLyrK = null;
  hhNextId = null;
  hhLyr();
  vizStart();
}
// Lirik karaoke di hero: baris sekarang terisi warna, baris berikutnya pudar di bawahnya
let hhLyrK = null, hhNextId = null;
function hhLyr() {
  const box = $('.page .hh.st-play .hh-lyr');
  if (!box) return;
  const k = S.lyr?.synced ? sideLyrK0() : -2;
  if (k !== hhLyrK) {
    hhLyrK = k;
    const L = S.lyr?.lines || [];
    const a = k >= 0 ? L[k].text : '', b = k >= -1 && S.lyr?.synced ? (L[k + 1]?.text || '') : '';
    box.classList.toggle('on', !!(a || b));
    const [p1, p2] = box.children;
    p1.textContent = a || (b ? '♪ ♪ ♪' : '');
    p2.textContent = b;
    if (!reduceMotion.matches && (a || b)) box.animate([{ opacity: 0.2, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  // Waktu & lagu berikutnya
  const el = $('.page .hh.st-play');
  const d = durNow(), c = posNow();
  const cu = $('.hh-cur', el), re = $('.hh-rem', el);
  if (cu) { cu.textContent = fmt(c); re.textContent = '-' + fmt(Math.max(0, d - c)); }
  const nid = S.queue[S.idx + 1];
  if (nid !== hhNextId) {
    hhNextId = nid;
    const nb = $('.hh-next', el), nt = T(nid);
    if (nb) {
      nb.hidden = !nt;
      if (nt) { $('.hh-next-art', nb).innerHTML = cover(nt.art, '', nt.id); $('.hh-next-t b', nb).textContent = nt.title; }
    }
  }
}
// Isi warna baris lirik + denyut bass, dipanggil tiap frame dari visualizer
let beatV = 0, bassAvg = 0, lastKick = 0;
function hhFrame(now, live) {
  const el = $('.page .hh.st-play');
  if (!el) return;
  const L = S.lyr?.lines;
  if (S.lyr?.synced && hhLyrK >= 0 && L[hhLyrK]) {
    const c = audio.currentTime, st = L[hhLyrK].t, en = L[hhLyrK + 1]?.t ?? st + 4;
    el.style.setProperty('--lp', (Math.min(1, Math.max(0, (c - st) / Math.max(0.4, en - st))) * 100).toFixed(1) + '%');
  }
  // Dentuman: not musik nyembur dari piringan
  if (kickNow) hhBurst(el);
}
// Denyut bass dihitung sekali per frame, dibagi ke hero, player bar, dan layar penuh
let kickNow = false;
function beatTick(now, live) {
  let bass = 0;
  for (let i = 0; i < 6; i++) bass += vizV[i];
  bass /= 6;
  if (!live && !audio.paused) bass = 0.3 + 0.25 * Math.max(0, Math.sin(now / 240));
  beatV += (bass - beatV) * (bass > beatV ? 0.6 : 0.12);
  bassAvg += (bass - bassAvg) * 0.03;
  kickNow = !audio.paused && bass > 0.32 && bass > bassAvg * 1.3 && now - lastKick > 320 && !reduceMotion.matches;
  if (kickNow) lastKick = now;
  const b = beatV.toFixed(3);
  for (const el of [$('#lcd'), npOpen() ? $('#np') : null, $('.page .hh.st-play')]) el?.style.setProperty('--beat', b);
}
const NOTE_CH = ['♪', '♫', '♬', '♩', '•', '✦'];
function hhBurst(el) {
  const r = $('.hh-r', el);
  if (!r || r.querySelectorAll('.hh-pt').length > 14) return;
  const p = document.createElement('i');
  p.className = 'hh-pt';
  p.textContent = NOTE_CH[(Math.random() * NOTE_CH.length) | 0];
  p.style.setProperty('--dx', `${(Math.random() * 2 - 1) * 90}px`);
  p.style.setProperty('--dy', `${-70 - Math.random() * 90}px`);
  p.style.setProperty('--rot', `${(Math.random() * 2 - 1) * 50}deg`);
  p.style.setProperty('--c', ['var(--amber)', 'var(--coral)', 'var(--lilac)', 'var(--teal)'][(Math.random() * 4) | 0]);
  p.style.left = `${45 + Math.random() * 30}%`;
  p.style.fontSize = `${14 + Math.random() * 14}px`;
  p.addEventListener('animationend', () => p.remove());
  r.append(p);
}
async function playDayMix(btn) {
  const fav = favSongs();
  if (!fav.length) return;
  btn?.classList.add('busy');
  const seeds = shuffled(fav.slice(0, 14));
  let recs = [];
  try {
    const ds = await Promise.all(fav.slice(0, 2).map((id) => upNext(T(id).vid).catch(() => null)));
    recs = shuffled(ds.flatMap((d) => d?.items || []).map((x) => song(x).id));
  } catch {}
  // Selang-seling: 1 lagu favorit, 2 lagu mirip
  const out = [], seen = new Set();
  for (let i = 0, j = 0; out.length < 30 && (i < seeds.length || j < recs.length);) {
    for (const id of [seeds[i++], recs[j++], recs[j++]]) if (id && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  btn?.classList.remove('busy');
  saveTracks();
  playFrom(out, 0, false, MIX_NAME[GREET()]);
  toast(`${MIX_NAME[GREET()]} · ${out.length} songs`);
}

// Banner kecil di beranda: ringkasan 7 hari terakhir
function recapBanner() {
  const wk = S.log.filter((e) => e[0] > Date.now() - 7 * 864e5);
  if (wk.length < 3) return '';
  const mins = Math.round(wk.reduce((n, e) => n + e[2], 0) / 60);
  const cnt = new Map();
  wk.forEach((e) => cnt.set(e[1], (cnt.get(e[1]) || 0) + 1));
  const arts = [...cnt].sort((a, b) => b[1] - a[1]).map(([id]) => T(id)?.art).filter(Boolean).slice(0, 3);
  return `<a class="rc-ban" href="#/recap"><span class="rc-ban-art">${arts.map((u, i) => `<img src="${esc(u)}" alt="" style="--i:${i}" onload="this.classList.add('ok')">`).join('')}</span><span class="rc-ban-t"><small>${I.stats} Svara Recap minggu ini</small><b>${nf.format(mins)} menit · ${nf.format(cnt.size)} lagu</b></span><span class="rc-ban-go">Lihat ${I.arrow}</span></a>`;
}

const VIEWS = {
  home() {
    if (!S.feed && !S.feedErr) loadFeed();
    // Beranda rame: pintasan, chart trending, playlist bertema, artis, album baru, playlist komunitas
    const all = S.feed || [];
    const sec = (fn) => all.find((x) => x.items.length && fn(x));
    const trend = sec((x) => /trending|tangga|chart/i.test(x.title) && x.items.filter((y) => y.type === 'song').length >= 5);
    const moodPl = sec((x) => x.items.every((y) => y.type === 'playlist') && !/trending|tangga|chart|komunitas|community/i.test(x.title));
    const artists = sec((x) => x.items.every((y) => y.type === 'artist'));
    const albums = sec((x) => x.items.some((y) => y.type === 'album'));
    const comm = sec((x) => /komunitas|community/i.test(x.title) && x !== moodPl);
    // Lagu buat pintasan diambil dari rak selain chart, biar nggak dobel
    const quickSongs = all.filter((x) => x !== trend).flatMap((x) => x.items.filter((y) => y.type === 'song'));
    const feed = quickSongs.length ? [{ items: quickSongs }] : trend ? [{ items: trend.items.filter((y) => y.type === 'song') }] : [];
    const tiles = [];
    if (S.loved.size) tiles.push(`<a class="tile" href="#/loved">${lovedArt()}<b>Lagu Disukai</b></a>`);
    for (const p of S.playlists.slice(0, 3)) tiles.push(`<a class="tile" href="#/playlist/${p.id}">${plArt(p.ids)}<b>${esc(p.name)}</b></a>`);
    for (const c of S.savedColl.filter((x) => x.type !== 'podcast').slice(0, 3)) tiles.push(`<a class="tile" href="#/c/${enc(c.id)}">${cover(img(c.art), c.type === 'artist' ? 'round' : '')}<b>${esc(c.title)}</b></a>`);
    const recent = Object.keys(S.plays).filter((id) => T(id)?.kind === 'song').sort((a, b) => S.plays[b].last - S.plays[a].last);
    const quick = (feed.find((x) => x.items.every((y) => y.type === 'song'))?.items || []).map((x) => itemId(x));
    const songs = [...new Set([...recent, ...quick])].slice(0, Math.max(0, 8 - tiles.length));
    const sk = listKey(songs);
    songs.forEach((id, i) => tiles.push(`<div class="tile" data-id="${esc(id)}" data-ml="${sk}" data-i="${i}">${cover(T(id).art, '', id)}<b>${esc(T(id).title)}</b><span class="tplay">${I.play}</span></div>`));
    return `<div class="hchips"><a class="on" href="#/home">Semua</a>${MOODS.slice(0, 7).map((m) => `<a href="#/search/songs/${enc(m)}">${esc(m)}</a>`).join('')}</div>
      ${homeHero()}
      ${tiles.length ? `<div class="tiles">${tiles.join('')}</div>` : `<div class="tiles">${'<div class="tile sk-t"></div>'.repeat(8)}</div>`}`
      + (!S.feed && !S.feedErr ? shelf('Lagi nyiapin rekomendasi…', skelCards(6)) + shelf('&nbsp;', skelCards(6)) : '')
      + (trend ? spotlightHtml(trend.items.filter((y) => y.type === 'song').slice(0, 10)) : '')
      + (trend ? shelf(esc(trend.title), chartHtml(trend.items.filter((y) => y.type === 'song').slice(0, 10)), '<span class="lbl-tag">Top 10</span>') : '')
      + recapBanner()
      + (S.feed ? shelf('Pilih mood', moodCards()) : '')
      + (moodPl ? shelf(esc(moodPl.title), itemsHtml(moodPl.items, { cards: true })) : '')
      + (artists ? shelf(esc(artists.title), `<div class="row artists">${artists.items.map(collCard).join('')}</div>`) : '')
      + (albums ? shelf(esc(albums.title), itemsHtml(albums.items.filter((y) => y.type !== 'song'), { cards: true })) : '')
      + (comm ? shelf(esc(comm.title), itemsHtml(comm.items, { cards: true })) : '')
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
    return header('Koleksi', `${S.playlists.length + 1} playlist · ${loved.length} favorit · ${S.savedColl.length} tersimpan`, `<div class="btns"><a class="btn" href="#/recap">${I.stats} Recap</a><button class="btn pri" data-do="newpl">${I.plus} Playlist baru</button></div>`)
      + shelf('Playlist', `<div class="grid">${card('#/loved', lovedArt(), 'Favorit', `${loved.length} lagu`, 'loved', 2)}${S.playlists
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

// Latar hero: cover yang diblur, atau foto artis selebar halaman
const heroBg = (u) => (u ? `<div class="hero-bg" aria-hidden="true"><img src="${esc(u)}" alt="" decoding="async" onload="this.classList.add('ok')"></div>` : '');
// Thumbnail YouTube Music bisa diminta lebih gede lewat parameter ukurannya
const bigArt = (u) => (u && /googleusercontent|ggpht/.test(u) ? u.replace(/=w\d+-h\d+/, '=w1200-h1200') : u);

function heroHtml(d, body) {
  const kind = d.kind || d.type;
  const cls = { album: '', playlist: 'coral', artist: 'lilac', podcast: 'mint' }[kind] ?? '';
  return `<div class="hero ${cls}${kind === 'artist' ? ' artist' : ''}" data-art="${esc(img(d.art) || '')}">${heroBg(img(bigArt(d.art)))}${cover(img(d.art), `hero-art${kind === 'artist' ? ' round' : ''}`)}<div class="hero-info"><span class="stk ${kind === 'artist' ? 'coral' : 'yellow'}">${TYPE_LABEL[kind] || 'Koleksi'}</span><h1>${esc(d.title || '…')}</h1>${body}</div></div>`;
}

function plHero(p, ids) {
  const art = p.fixed ? lovedArt('hero-art') : plArt(ids, 'hero-art');
  const key = listKey(ids);
  return `<div class="hero coral" data-art="${esc(p.fixed ? '' : T(ids[0])?.art || '')}">${p.fixed ? '' : heroBg(T(ids[0])?.art)}${art}<div class="hero-info"><span class="stk lilac">Playlist</span>
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
  const recap = libFilter === 'all' && !libQuery ? `<a class="li li-recap${here.startsWith('#/recap') ? ' on' : ''}" href="#/recap">${recapArt('li-art')}<span><b>Svara Recap</b><small>Statistik dengerin kamu</small></span></a>` : '';
  if (!items.length) return recap + `<p class="lib-empty">${libQuery ? 'Nggak ketemu di koleksi.' : 'Belum ada yang disimpan. Klik “Simpan” di album atau artis.'}</p>`;
  return recap + items.map((x) => {
    const art = x.loved ? lovedArt('li-art') : x.ids ? plArt(x.ids, 'li-art') : cover(x.art, `li-art${x.type === 'artist' ? ' round' : ''}`);
    const on = decodeURIComponent(here) === decodeURIComponent(x.href);
    return `<a class="li${on ? ' on' : ''}" href="${x.href}"${x.drop ? ` data-pl-drop="${esc(x.drop)}"` : ''}>${art}<span><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></span></a>`;
  }).join('') + libExtraHtml(items.length);
}
// Koleksi masih sepi: kasih ajakan bikin playlist + lagu yang baru diputar
function libExtraHtml(n) {
  if (libQuery || libFilter === 'album' || libFilter === 'artist') return '';
  let out = '';
  if (!S.playlists.length) out += `<button class="lib-cta" data-do="newpl"><span>${I.plus}</span><span><b>Bikin playlist pertama</b><small>Kumpulin lagu favorit lo di satu tempat</small></span></button>`;
  if (n > 4 || libFilter === 'playlist') return out;
  const ids = Object.keys(S.plays).filter((id) => T(id)).sort((a, b) => S.plays[b].last - S.plays[a].last).slice(0, 8);
  if (!ids.length) return out;
  const key = listKey(ids);
  return out + `<div class="lib-sub">Baru diputar</div>` + ids.map((id, i) => {
    const t = T(id);
    return `<div class="li li-song" data-id="${esc(id)}" data-ml="${key}" data-i="${i}">${cover(t.art, 'li-art', id)}<span><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span></div>`;
  }).join('');
}
function renderLib() {
  const el = $('#lib');
  if (!el) return;
  if (!el.firstChild) {
    el.innerHTML = `<div class="lib-h"><button class="ib lib-tog" data-do="libmini" title="Ciutkan/lebarkan koleksi" aria-label="Ciutkan atau lebarkan koleksi">${I.panel}</button><b>Koleksi</b><button class="ib round" data-do="newpl" title="Bikin playlist" aria-label="Bikin playlist">${I.plus}</button></div>
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
  if (name === 'recap') countUp(view);
  revealShelves(view);
  renderLib();
  const hh = $('.hh', view);
  if (hh) { tintHero(hh); hhLyrK = null; hhNextId = null; hhLyr(); vizStart(); }
  const hero = $('.hero[data-art], .rc-hero[data-art]', view);
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
// Rak di bawah layar muncul pelan pas discroll; isinya nyusul satu-satu
let revealIO;
function revealShelves(root) {
  if (reduceMotion.matches || !('IntersectionObserver' in window)) return;
  revealIO ||= new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      revealIO.unobserve(e.target);
      e.target.classList.add('in');
      // Lepas kelasnya habis animasi biar efek hover kartu balik normal
      setTimeout(() => e.target.classList.remove('rv', 'in'), 1500);
    }
  }, { root: $('#view'), rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  const bottom = root.getBoundingClientRect().bottom;
  for (const sh of $$('.shelf, .hero + .box.tl', root)) {
    if (sh.getBoundingClientRect().top < bottom) continue; // yang udah kelihatan cukup pakai animasi masuk halaman
    sh.classList.add('rv');
    $$('.row > *, .chart > li, .grid > *, .minis > *, .browse > a, .tr', sh).forEach((c, i) => c.style.setProperty('--ri', Math.min(i, 12)));
    revealIO.observe(sh);
  }
}

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
  const key = { playlist: 'lib', loved: 'lib', recap: 'lib', c: '' }[top] ?? top;
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
const savePlays = debounce(() => { saveTracks(); kv.set('plays', S.plays); renderLib(); }, 1000);
const saveLog = debounce(() => kv.set('log', S.log.map((e) => [e[0], e[1], Math.round(e[2])])), 3000);
const saveFx = debounce(() => kv.set('fx', FX), 400);

// Catat tiap lagu yang diputar + berapa detik beneran didengerin, buat Recap
let logCur = null, logAt = 0, logSaved = 0;
function logStart(id) {
  logCur = [Date.now(), id, 0];
  S.log.push(logCur);
  if (S.log.length > 15000) S.log.splice(0, S.log.length - 15000);
  logAt = performance.now();
  saveLog();
}
function logTick() {
  const now = performance.now();
  if (!audio.paused && logCur && logCur[1] === S.queue[S.idx] && now - logAt < 2500) logCur[2] += (now - logAt) / 1000;
  logAt = now;
  if (Date.now() - logSaved > 15000) { logSaved = Date.now(); saveLog(); }
}

function newPlaylist(ids = [], name = 'Playlist Baru') {
  const p = { id: Date.now().toString(36), name, ids: [...ids], created: Date.now() };
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
  if (add && el) loveFx(el);
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
// Ikon menu ditebak dari labelnya, biar semua menu (lagu, playlist, timer) kebagian
const MENU_IC = [[/^putar berikutnya/i, 'next'], [/^putar/i, 'play'], [/^acak/i, 'shuffle'], [/antrean/i, 'queue'], [/^tambah ke playlist|^playlist baru/i, 'plus'],
  [/^hapus dari favorit/i, 'heartF'], [/^favorit/i, 'heart'], [/^download/i, 'save'], [/^buka artis/i, 'user'], [/^buka album/i, 'disc'], [/^buka podcast/i, 'mic'],
  [/^hapus dari koleksi/i, 'bookF'], [/^simpan ke koleksi/i, 'book'], [/^hapus/i, 'trash'], [/^ganti nama/i, 'edit'], [/^matiin timer/i, 'x'], [/menit$|^habis lagu/i, 'clock'],
  [/^tandai selesai/i, 'check'], [/^tandai belum/i, 'x']];
const menuIcon = (label) => I[MENU_IC.find(([re]) => re.test(label))?.[1]] || '<i class="mi-gap"></i>';
function showMenu(x, y, items) {
  menuEl.innerHTML = items.map((it, i) => (it === '-' ? '<hr>' : `<button data-mi="${i}" ${it.danger ? 'class="danger"' : ''}>${menuIcon(it.label)}<em>${esc(it.label)}</em>${it.sub ? '<span>›</span>' : ''}</button>`)).join('');
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
  if (t.kind === 'song') items.push({ label: 'Bagikan (kartu story)', act: () => shareCard('song', id) });
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
  fx: () => showFx(),
  share: () => shareCard('song', S.queue[S.idx]),
  pip: () => openPip(),
  theme: () => {
    const order = ['auto', 'light', 'dark'];
    setTheme(order[(order.indexOf(themePref()) + 1) % 3]);
    toast({ auto: 'Tema ngikutin sistem', light: 'Tema terang', dark: 'Tema gelap' }[themePref()]);
  },
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
    if (k === 'chip') return pickChip(+d.dataset.c);
    if (k === 'nptab') {
      // Di desktop tab aktif tetap kebuka; di HP klik tab aktif = balik ke tampilan cover
      S.panel = S.panel === d.dataset.p && isMobile() ? null : d.dataset.p;
      renderPanels();
      lyrLoop();
      return saveState();
    }
    if (k === 'qsave') {
      const ids = S.queue.slice(Math.max(0, S.idx)).filter((id) => T(id));
      if (!ids.length) return;
      newPlaylist(ids, S.src?.name || 'Antrean');
      return toast(`Antrean disimpan jadi playlist (${ids.length} lagu)`);
    }
    if (k === 'playall') return playFrom(ml);
    if (k === 'daymix') return playDayMix(d);
    if (k === 'recapshare') return shareCard('recap', d.dataset.p);
    if (k === 'hhnext') return next();
    if (k === 'hhcont') { if (cur()) return togglePlay(); const id = lastSong(); return id && playMix(id, [id], 0); }
    if (k === 'eqp') return setEq([...EQ_PRESETS[d.dataset.p][1]], d.dataset.p);
    if (k === 'lite') { setLite(d.dataset.v === 'on'); drawFx(); return toast(LITE ? 'Mode ringan nyala' : 'Mode ringan mati'); }
    if (k === 'recapsave') { newPlaylist(ml, d.dataset.name); return toast('Top lagu disimpan jadi playlist'); }
    if (k === 'shuffleall') return playFrom(ml, 0, true);
    if (k === 'playcoll') return playColl(cid);
    if (k === 'shufflecoll') return playColl(cid, true);
    if (k === 'savecoll') return toggleSaveColl(cid);
    if (k === 'save') return saveOffline(T(d.closest('[data-id]').dataset.id));
    if (k === 'newpl') return newPlaylist();
    if (k === 'radio') { S.radio = !S.radio; kv.set('radio', S.radio); toast(S.radio ? 'Radio otomatis nyala' : 'Radio otomatis mati'); renderQueue(); return ensureRadio(); }
    if (k === 'libf') { libFilter = d.dataset.f; return renderLib(); }
    if (k === 'libmini') {
      const on = document.body.classList.toggle('lib-mini');
      try { localStorage.setItem('putar-lib', on ? 'mini' : ''); } catch {}
      return;
    }
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
    const list = S.lists[row.dataset.ml] || [row.dataset.id];
    if (!/^#\/(c|playlist|loved|lib|recap)\b/.test(location.hash) || row.closest('#lib')) return playMix(row.dataset.id, list, +row.dataset.i);
    return playFrom(list, +row.dataset.i);
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

// Tombol back Android: tutup yang lagi kebuka dulu (dialog, menu, layar penuh). true = udah ditangani
window.__svaraBack = () => {
  const dlg = $$('dialog[open]').pop();
  if (dlg) { dlg.close(); return true; }
  if (!menuEl.hidden) { hideMenu(); return true; }
  if (npOpen()) { openNp(false); return true; }
  if (document.activeElement?.matches?.('input:not([type=range])')) { document.activeElement.blur(); return true; }
  return false;
};

document.addEventListener('keydown', (e) => {
  const typing = e.target.closest?.('input:not([type=range]), [contenteditable]');
  if (e.key === 'Escape') {
    if (!menuEl.hidden) return hideMenu();
    if (npOpen()) return openNp(false);
    if (typing) return e.target.blur();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); q.focus(); q.select(); return; }
  if (typing) return;
  if (e.key === '?') { e.preventDefault(); return showKeys(); }
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
  else if (e.key.toLowerCase() === 'e' && !e.metaKey) showFx();
  else if (e.key.toLowerCase() === 'p' && !e.metaKey) openPip();
});

/* ---------- motion ---------- */

// Pas nge-love: percikan + hati-hati kecil terbang + hati besar muncul sekilas di atas cover + getar halus
function loveFx(el) {
  burst(el);
  navigator.vibrate?.(14);
  if (reduceMotion.matches) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 7; i++) {
    const h = document.createElement('i');
    h.className = 'love-pt';
    h.innerHTML = I.heartF;
    h.style.left = r.left + r.width / 2 + 'px';
    h.style.top = r.top + r.height / 2 + 'px';
    h.style.color = ['#ff5e9c', '#ff7a7a', '#b49bff', '#ffc94a'][i % 4];
    document.body.append(h);
    const dx = (Math.random() * 2 - 1) * 60, dy = -60 - Math.random() * 70, sc = 0.6 + Math.random() * 0.7;
    h.animate([
      { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 },
      { transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${dy * 0.4}px)) scale(${sc})`, opacity: 1, offset: 0.3 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${sc * 0.8}) rotate(${dx / 3}deg)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)', delay: i * 30 }).onfinish = () => h.remove();
  }
  for (const art of $$('.lcd-art, .np.open .np-art, .page .hh .sleeve')) {
    const b = document.createElement('i');
    b.className = 'love-big';
    b.innerHTML = I.heartF;
    art.append(b);
    b.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: 0.35 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.6 }, { transform: 'translate(-50%,-50%) scale(1.3)', opacity: 0 }], { duration: 900, easing: 'ease-out' }).onfinish = () => b.remove();
    art.animate([{ transform: 'scale(1)' }, { transform: 'scale(.94)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'ease-out' });
  }
}
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
    if (e.target.closest('.np-right, input, button') || np.scrollTop > 0) return;
    sy = e.touches[0].clientY;
    dy = 0;
    np.style.transition = 'none';
  }, { passive: true });
  np.addEventListener('touchmove', (e) => {
    if (sy === null) return;
    dy = Math.max(0, e.touches[0].clientY - sy);
    np.style.transform = `translateY(${dy}px)`;
    np.style.opacity = String(Math.max(0.5, 1 - dy / 600));
  }, { passive: true });
  np.addEventListener('touchend', () => {
    if (sy === null) return;
    np.style.transition = '';
    np.style.transform = '';
    np.style.opacity = '';
    if (dy > 110) openNp(false);
    sy = null;
  });
}

// Head unit Android: layar sentuhnya kadang kebaca sebagai mouse/stylus, jadi geser jari nggak nge-scroll
// (tap doang yang jalan). Cadangan kalau konversi di MainActivity nggak kena: geser = scroll manual + efek lempar.
if (/SvaraAndroid/.test(navigator.userAgent)) {
  let d = null;
  let fling = 0;
  let eatClick = false;
  const canScroll = (el, axis) => {
    const cs = getComputedStyle(el);
    const ov = axis === 'y' ? cs.overflowY : cs.overflowX;
    if (!/(auto|scroll)/.test(ov)) return false;
    return axis === 'y' ? el.scrollHeight > el.clientHeight + 1 : el.scrollWidth > el.clientWidth + 1;
  };
  const findScroller = (el, axis) => {
    for (; el && el !== document.body && el !== document.documentElement; el = el.parentElement) if (canScroll(el, axis)) return el;
    return null;
  };
  // Selama digeser manual, scroll-snap dimatiin: tiap ubah scrollLeft dari kode, Chrome nge-snap balik
  // ke kartu terdekat, jadi baris kartu kerasa nyangkut. Dibalikin lagi pas geseran/lemparan selesai.
  let unsnap = null;
  const release = () => { if (unsnap) { unsnap(); unsnap = null; } };
  const hold = (el) => {
    release();
    const prev = el.style.scrollSnapType;
    el.style.scrollSnapType = 'none';
    unsnap = () => { el.style.scrollSnapType = prev; };
  };
  // Auto-scroll lirik cuma ngalah ke wheel/touchmove; geseran manual ini juga harus dihitung
  const scrollBy = (g, v) => {
    if (g.axis === 'y') g.el.scrollTop -= v; else g.el.scrollLeft -= v;
    if (g.lyr) userScrollUntil = Date.now() + 3000;
  };
  document.addEventListener('pointerdown', (e) => {
    cancelAnimationFrame(fling);
    release();
    eatClick = false;
    d = null;
    if (e.pointerType === 'touch' || e.button !== 0 || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    d = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: e.timeStamp, vx: 0, vy: 0, target: e.target, el: null, axis: null, lyr: false };
  }, { capture: true, passive: true });
  document.addEventListener('pointermove', (e) => {
    if (!d) return;
    if (!d.el) {
      const ax = Math.abs(e.clientX - d.x0);
      const ay = Math.abs(e.clientY - d.y0);
      if (Math.max(ax, ay) < 8) return;
      const pref = ay >= ax ? 'y' : 'x';
      d.axis = pref;
      d.el = findScroller(d.target, pref);
      // Geser horizontal di dalam daftar vertikal (atau sebaliknya): pakai sumbu yang emang bisa digulir
      if (!d.el) { d.axis = pref === 'y' ? 'x' : 'y'; d.el = findScroller(d.target, d.axis); }
      if (!d.el) { d = null; return; }
      d.lyr = !!d.el.closest('#npRight');
      hold(d.el);
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const dt = Math.max(1, e.timeStamp - d.t);
    scrollBy(d, d.axis === 'y' ? dy : dx);
    d.vx = 0.8 * (dx / dt) + 0.2 * d.vx;
    d.vy = 0.8 * (dy / dt) + 0.2 * d.vy;
    d.x = e.clientX;
    d.y = e.clientY;
    d.t = e.timeStamp;
  }, { capture: true, passive: true });
  const end = (e) => {
    if (!d) return;
    const g = d;
    d = null;
    if (!g.el) return;
    // Klik yang nyusul pointerup ini dibuang; pointerdown berikutnya ngereset, jadi tap baru nggak ikut ketelan
    eatClick = e.type === 'pointerup';
    let v = (g.axis === 'y' ? g.vy : g.vx) * 16;
    if (e.timeStamp - g.t > 100 || Math.abs(v) < 2) return release();
    const step = () => {
      scrollBy(g, v);
      v *= 0.95;
      if (Math.abs(v) > 0.5) fling = requestAnimationFrame(step);
      else release();
    };
    fling = requestAnimationFrame(step);
  };
  document.addEventListener('pointerup', end, { capture: true, passive: true });
  document.addEventListener('pointercancel', end, { capture: true, passive: true });
  // Habis geser, jangan sampai jari dilepas di atas lagu malah dianggap klik
  document.addEventListener('click', (e) => {
    if (!eatClick) return;
    eatClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);
  // Baris lagu draggable="true": dari mouse/stylus, drag HTML5 bakal nyerobot geseran, jadi dimatiin.
  // Begitu juga blok teks (judul halaman bisa diblok) biar nggak ikut keblok waktu digeser.
  document.addEventListener('dragstart', (e) => { if (d) e.preventDefault(); }, true);
  document.addEventListener('selectstart', (e) => { if (d) e.preventDefault(); }, true);
}

let toastT;
/* ---------- sapaan yang ganti-ganti ---------- */

const ROT_WORDS = ['something new', 'heartbreak songs', 'something chill', 'a hype boost', 'old-school hits', "what's trending"];
let rotI = 0;
setInterval(() => {
  const el = $('.hello2 .rot');
  if (!el || document.hidden || reduceMotion.matches) return;
  rotI = (rotI + 1) % ROT_WORDS.length;
  const b = document.createElement('b');
  b.textContent = ROT_WORDS[rotI];
  const old = el.firstElementChild;
  old?.classList.add('out');
  el.append(b);
  setTimeout(() => old?.remove(), 600);
}, 2800);

// Kartu dapet cahaya lembut yang ngikutin posisi kursor
$('#view').addEventListener('pointermove', (e) => {
  const c = e.target.closest?.('.card, .tile, .ch-row, .mini, .mood, .spot');
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', `${e.clientX - r.left}px`);
  c.style.setProperty('--my', `${e.clientY - r.top}px`);
}, { passive: true });

/* ---------- intro pas web dibuka ---------- */

function endIntro() {
  const el = $('#intro');
  if (!el || el.classList.contains('out')) return;
  el.classList.add('out');
  document.body.classList.add('boot-in');
  setTimeout(() => { el.remove(); document.body.classList.remove('boot-in'); }, 1300);
}
$('#intro')?.addEventListener('click', endIntro);
if (reduceMotion.matches) $('#intro')?.remove();

/* ---------- daftar shortcut ---------- */

const KEYS = [['Spasi', 'Putar / jeda'], ['→ / ←', 'Maju / mundur 10 detik'], ['⇧ → / ⇧ ←', 'Lagu berikutnya / sebelumnya'], ['↑ / ↓', 'Volume naik / turun'],
  ['L', 'Buka / tutup lirik'], ['M', 'Bisu'], ['E', 'Suara & equalizer'], ['P', 'Mini player melayang'], ['⌘K atau /', 'Cari'], ['Esc', 'Tutup layar penuh / menu'], ['?', 'Daftar shortcut ini']];
function showKeys() {
  const d = $('#keys');
  if (d.open) return d.close();
  d.innerHTML = `<div class="keys-h"><b>${I.keys} Shortcut keyboard</b><button class="ib" data-close aria-label="Tutup">${I.x}</button></div>
    <dl>${KEYS.map(([k, v]) => `<dt>${k.split(' ').map((x) => (x === '/' || x === 'atau' ? `<span>${x}</span>` : `<kbd>${esc(x)}</kbd>`)).join('')}</dt><dd>${v}</dd>`).join('')}</dl>`;
  d.showModal();
}
$('#keys').addEventListener('click', (e) => { if (e.target === e.currentTarget || e.target.closest('[data-close]')) e.currentTarget.close(); });

/* ---------- panel suara: crossfade + equalizer ---------- */

function renderFxBtn() {
  const on = FX.xf > 0 || eqOn();
  $$('[data-act=fx]').forEach((b) => { b.innerHTML = I.sliders; b.classList.toggle('on', on); });
}
function setEq(bands, preset = 'custom') {
  FX.bands = bands;
  FX.eq = preset;
  if (eqOn()) graph();
  applyEq();
  saveFx();
  renderFxBtn();
  drawFx();
}
// Kurva respons EQ dihitung dari filter beneran (OfflineAudioContext), jadi gambarnya jujur
let respF = null;
function eqResponse(n = 96) {
  const fr = Float32Array.from({ length: n }, (_, i) => 20 * 1000 ** (i / (n - 1)));
  const tot = new Float32Array(n);
  try {
    if (!respF) {
      const C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const ctx = new C(1, 128, 44100);
      respF = BANDS.map(([f, type]) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = 1.1; return b; });
    }
    const mag = new Float32Array(n), ph = new Float32Array(n);
    respF.forEach((b, i) => {
      b.gain.value = FX.bands[i];
      b.getFrequencyResponse(fr, mag, ph);
      for (let k = 0; k < n; k++) tot[k] += 20 * Math.log10(Math.max(1e-4, mag[k]));
    });
  } catch {
    // Cadangan: bukit lembut per band
    for (let k = 0; k < n; k++) BANDS.forEach(([f], i) => { const d = Math.log2(fr[k] / f); tot[k] += FX.bands[i] * Math.exp(-d * d / 1.4); });
  }
  return { fr, tot };
}
// Sumbu-x kurva disesuaikan biar tiap band pas di bawah slider-nya
const EQ_KX = [[20, 0], [60, 0.1], [230, 0.3], [910, 0.5], [3600, 0.7], [14000, 0.9], [20000, 1]];
function eqX(f) {
  const k = EQ_KX.findIndex(([q]) => q >= f);
  if (k <= 0) return 0;
  const [f0, x0] = EQ_KX[k - 1], [f1, x1] = EQ_KX[k];
  return x0 + ((x1 - x0) * Math.log(f / f0)) / Math.log(f1 / f0);
}
function xfPaths(sec) {
  const w = (sec / 12) * 190, a = 150 - w / 2, b = 150 + w / 2, top = 10, bot = 50;
  if (!sec) return [`M0 ${top}H150V${bot}`, `M150 ${bot}V${top}H300`];
  return [`M0 ${top}H${a}C${a + w * 0.55} ${top} ${b - w * 0.25} ${bot} ${b} ${bot}`, `M${a} ${bot}C${a + w * 0.25} ${bot} ${b - w * 0.55} ${top} ${b} ${top}H300`];
}
function drawFx() {
  const d = $('#fx');
  if (!d?.open) return;
  const [pa, pb] = xfPaths(FX.xf);
  $('.xf-a', d).setAttribute('d', pa);
  $('.xf-b', d).setAttribute('d', pb);
  $('.xf-out', d).textContent = FX.xf ? `${FX.xf} detik` : 'Mati';
  $('.xf-desc', d).textContent = FX.xf ? `Lagu berikutnya masuk pelan-pelan selama ${FX.xf} detik` : 'Lagu langsung nyambung tanpa jeda (gapless)';
  const xr = $('#xfR', d);
  xr.value = FX.xf;
  xr.parentElement.style.setProperty('--p', (FX.xf / 12) * 100 + '%');
  const { fr, tot } = eqResponse();
  // Skala sama kayak jangkauan slider (±12 dB), jadi kurvanya ngelewatin jempol slider
  const y = (db) => 70 - (Math.max(-13, Math.min(13, db)) / 12) * 61;
  const pts = [...tot].map((db, i) => `${(eqX(fr[i]) * 400).toFixed(1)} ${y(db).toFixed(1)}`);
  $('.eq-line', d).setAttribute('d', 'M' + pts.join('L'));
  $('.eq-fill', d).setAttribute('d', `M0 70L${pts.join('L')}L400 70Z`);
  $$('.eq-bands input', d).forEach((inp, i) => {
    inp.value = FX.bands[i];
    inp.style.setProperty('--p', ((FX.bands[i] + 12) / 24) * 100 + '%');
    inp.previousElementSibling.textContent = (FX.bands[i] > 0 ? '+' : '') + FX.bands[i];
  });
  $$('.eq-pre button[data-p]', d).forEach((b) => b.classList.toggle('on', b.dataset.p === FX.eq));
  $$('[data-do=lite]', d).forEach((b) => b.classList.toggle('on', (b.dataset.v === 'on') === LITE));
}
function showFx() {
  const d = $('#fx');
  if (d.open) return d.close();
  d.innerHTML = `<div class="keys-h"><b>${I.sliders} Suara</b><button class="ib" data-close aria-label="Tutup">${I.x}</button></div>
    <section class="fx-sec">
      <div class="fx-row"><span><b>Crossfade</b><small class="xf-desc"></small></span><output class="xf-out"></output></div>
      <svg class="xf-vis" viewBox="0 0 300 60" aria-hidden="true"><path class="xf-a"/><path class="xf-b"/></svg>
      <div class="rng"><input type="range" id="xfR" min="0" max="12" step="1" aria-label="Lama crossfade (detik)"${DUAL ? '' : ' disabled'}></div>
      ${DUAL ? '' : '<p class="fx-note">Crossfade belum didukung di perangkat ini.</p>'}
    </section>
    <section class="fx-sec">
      <div class="fx-row"><span><b>Equalizer</b><small>Atur warna suara sesuai selera</small></span><button class="link" data-do="eqp" data-p="flat">Reset</button></div>
      <div class="eq-pre">${Object.entries(EQ_PRESETS).map(([k, [l]]) => `<button data-do="eqp" data-p="${k}">${l}</button>`).join('')}</div>
      <div class="eq-box">
        <svg class="eq-curve" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="eqg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--amber)" stop-opacity=".55"/><stop offset="1" stop-color="var(--amber)" stop-opacity="0"/></linearGradient></defs><path class="eq-mid" d="M0 70H400"/><path class="eq-fill"/><path class="eq-line"/></svg>
        <div class="eq-bands">${BANDS.map(([, , l], i) => `<label><output></output><input type="range" min="-12" max="12" step="1" data-band="${i}" aria-label="${l} Hz"><span>${l}</span></label>`).join('')}</div>
      </div>
    </section>
    <section class="fx-sec">
      <div class="fx-row"><span><b>Mode ringan</b><small>Matiin blur, animasi, dan visualizer biar hemat baterai &amp; nggak patah-patah${liteAuto ? '. Otomatis nyala di perangkat ini' : ''}</small></span></div>
      <div class="eq-pre"><button data-do="lite" data-v="on">Nyala</button><button data-do="lite" data-v="off">Mati</button></div>
    </section>`;
  $('#xfR', d).addEventListener('input', (e) => { FX.xf = +e.target.value; saveFx(); renderFxBtn(); drawFx(); });
  $$('.eq-bands input', d).forEach((inp) => inp.addEventListener('input', () => {
    const b = [...FX.bands];
    b[+inp.dataset.band] = +inp.value;
    setEq(b, Object.entries(EQ_PRESETS).find(([, [, v]]) => v.every((x, i) => x === b[i]))?.[0] || 'custom');
  }));
  d.showModal();
  drawFx();
}
$('#fx').addEventListener('click', (e) => { if (e.target === e.currentTarget || e.target.closest('[data-close]')) e.currentTarget.close(); });

/* ---------- Svara Recap ---------- */

const mainArtist = (a) => (a || '').split(/\s*(?:,|&| x | feat\.?| ft\.?)\s*/i)[0].trim();
const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
function recapData(days) {
  const from = days ? Date.now() - days * 864e5 : 0;
  const songs = new Map(), hours = Array(24).fill(0), week = Array(7).fill(0), daySet = new Set();
  let secs = 0, est = false;
  const firstSeen = new Map();
  for (const [ts, id] of S.log) if (!firstSeen.has(id)) firstSeen.set(id, ts);
  for (const [ts, id, sec] of S.log) {
    if (ts < from || !T(id)) continue;
    const x = songs.get(id) || { id, n: 0, s: 0 };
    x.n++; x.s += sec; songs.set(id, x);
    secs += sec;
    const d = new Date(ts);
    hours[d.getHours()] += sec || 30;
    week[d.getDay()] += sec || 30;
    daySet.add(dayKey(ts));
  }
  // "Sepanjang masa" ikut ngitung riwayat lama sebelum Recap ada (menitnya perkiraan)
  if (!days) for (const [id, p] of Object.entries(S.plays)) {
    const t = T(id);
    if (!t) continue;
    const x = songs.get(id) || { id, n: 0, s: 0 };
    if (p.n > x.n) {
      const add = (p.n - x.n) * Math.min(t.duration || 200, 300) * 0.7;
      x.s += add; secs += add; x.n = p.n; est = true;
    }
    songs.set(id, x);
  }
  const top = [...songs.values()].filter((x) => T(x.id).kind === 'song').sort((a, b) => b.n - a.n || b.s - a.s);
  const arts = new Map();
  for (const x of top) {
    const t = T(x.id), name = mainArtist(t.artist);
    if (!name) continue;
    const a = arts.get(name) || { name, id: t.artistId, n: 0, s: 0, art: t.art, songs: 0 };
    a.n += x.n; a.s += x.s; a.songs++; a.id ||= t.artistId;
    arts.set(name, a);
  }
  let streak = 0;
  for (let d = new Date(); ; d.setDate(d.getDate() - 1)) {
    if (daySet.has(dayKey(+d))) streak++;
    else if (streak || dayKey(+d) !== dayKey(Date.now())) break;
  }
  const peak = hours.indexOf(Math.max(...hours));
  const fresh = days ? top.filter((x) => firstSeen.get(x.id) >= from).length : top.length;
  return { secs, est, top, artists: [...arts.values()].sort((a, b) => b.n - a.n || b.s - a.s), hours, week, peak, streak, days: daySet.size, fresh, empty: !songs.size };
}
const PERSONA = (h) => h < 5 ? ['🦉', 'Begadang Squad', 'Musik nemenin kamu sampai dini hari']
  : h < 10 ? ['☀️', 'Si Pagi Cerah', 'Hari kamu dibuka pakai lagu']
  : h < 15 ? ['💼', 'Teman Kerja', 'Lagu jadi bensin pas lagi produktif']
  : h < 19 ? ['🌇', 'Pemburu Senja', 'Paling sering muter pas sore']
  : ['🌙', 'Burung Malam', 'Malam hari adalah jam konser kamu'];
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const RECAP_P = [['7', '7 hari'], ['30', '30 hari'], ['all', 'Sepanjang masa']];

VIEWS.recap = (arg) => {
  const per = RECAP_P.some(([k]) => k === arg) ? arg : '7';
  const R = recapData(per === 'all' ? 0 : +per);
  const tabs = `<div class="hchips rc-tabs">${RECAP_P.map(([k, l]) => `<a class="${k === per ? 'on' : ''}" href="#/recap/${k}">${l}</a>`).join('')}</div>`;
  if (R.empty) {
    return tabs + `<section class="rc-hero rc-empty"><span class="rc-k">Svara Recap</span><h1>Belum ada cerita di sini</h1><p>Dengerin beberapa lagu dulu, nanti Recap kamu muncul: lagu & artis favorit, jam paling sering muter, sampai kepribadian musik kamu.</p><a class="btn ink" href="#/home">${I.play} Mulai dengerin</a></section>`;
  }
  const t1 = T(R.top[0]?.id);
  const mins = Math.round(R.secs / 60);
  const [pe, pn, pd] = PERSONA(R.peak);
  const top = R.top.slice(0, 10);
  const ids = top.map((x) => x.id);
  const key = listKey(ids);
  const maxN = top[0]?.n || 1;
  const label = { 7: '7 hari terakhir', 30: '30 hari terakhir', all: 'Sepanjang masa' }[per];
  const maxH = Math.max(...R.hours, 1), maxW = Math.max(...R.week, 1);
  const tiles = [
    [I.fire, R.streak, 'hari beruntun', 'Dengerin tiap hari tanpa bolong'],
    [I.clock, Math.round(mins / Math.max(1, per === 'all' ? R.days || 1 : +per)), 'menit / hari', 'Rata-rata waktu dengerin'],
    [I.note, R.fresh, per === 'all' ? 'lagu diputar' : 'lagu baru', per === 'all' ? 'Semua lagu yang pernah kamu puter' : 'Pertama kali kamu dengerin'],
    [I.user, R.artists.length, 'artis', 'Beda artis yang kamu dengerin'],
  ];
  return tabs
    + `<section class="rc-hero" data-art="${esc(t1?.art || '')}">${heroBg(t1?.art)}
        <div class="rc-hi"><span class="rc-k">${I.stats} Svara Recap · ${label}</span>
        <h1><b class="rc-num" data-n="${mins}">${nf.format(mins)}</b> menit</h1>
        <button class="btn sm rc-share" data-do="recapshare" data-p="${per}">${I.share} Bagikan Recap</button>
        <p class="rc-sub">kamu habisin buat dengerin <b>${nf.format(R.top.length)} lagu</b> dari <b>${nf.format(R.artists.length)} artis</b>${R.est ? ' <small>(sebagian perkiraan dari riwayat lama)</small>' : ''}</p>
        <div class="rc-persona"><span>${pe}</span><span><b>${pn}</b><small>${pd} · paling rame jam ${String(R.peak).padStart(2, '0')}.00</small></span></div></div>
        ${t1 ? `<div class="rc-one" data-id="${esc(t1.id)}" data-ml="${key}" data-i="0">${cover(bigArt(t1.art), 'rc-art', t1.id)}<span class="rc-badge">#1</span><div><small>Lagu nomor satu kamu</small><b>${esc(t1.title)}</b><span>${esc(t1.artist)} · ${top[0].n}× diputar</span></div><span class="rc-go">${I.play}</span></div>` : ''}
      </section>`
    + `<div class="rc-tiles">${tiles.map(([ic, n, l, d], i) => `<div class="rc-tile" style="--i:${i}">${ic}<b class="rc-num" data-n="${n}">${nf.format(n)}</b><span>${l}</span><small>${d}</small></div>`).join('')}</div>`
    + shelf('Top lagu', `<ol class="rc-list">${top.map((x, i) => {
        const t = T(x.id);
        return `<li class="rc-row" data-id="${esc(x.id)}" data-ml="${key}" data-i="${i}" style="--w:${Math.max(8, (x.n / maxN) * 100)}%"><span class="rc-n">${i + 1}</span>${cover(t.art, 'sm', x.id)}<span class="ch-t"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span>${EQ}<span class="rc-c"><b>${x.n}×</b><small>${fmtLong(x.s)}</small></span></li>`;
      }).join('')}</ol>`, `<span class="rc-btns"><button class="btn ink sm" data-do="playall" data-ml="${key}">${I.play} Putar</button><button class="btn sm" data-do="recapsave" data-ml="${key}" data-name="Top lagu · ${label}">${I.plus} Jadiin playlist</button></span>`)
    + (R.artists.length ? shelf('Top artis', `<div class="rc-artists">${R.artists.slice(0, 6).map((a, i) => {
        const inner = `${cover(a.art, 'round', a.name)}<span class="rc-rank">${i + 1}</span><b>${esc(a.name)}</b><small>${a.n}× · ${a.songs} lagu</small>`;
        return a.id ? `<a class="rc-artist" href="#/c/${enc(a.id)}">${inner}</a>` : `<div class="rc-artist">${inner}</div>`;
      }).join('')}</div>`) : '')
    + shelf('Kapan kamu dengerin', `<div class="rc-when"><div class="rc-card"><div class="rc-ch-h"><b>Per jam</b><small>Paling rame jam ${String(R.peak).padStart(2, '0')}.00</small></div><div class="rc-bars h24">${R.hours.map((v, h) => `<i class="${h === R.peak ? 'pk' : ''}" style="--v:${(v / maxH) * 100}%" title="${String(h).padStart(2, '0')}.00"></i>`).join('')}</div><div class="rc-ax"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div></div>
        <div class="rc-card"><div class="rc-ch-h"><b>Per hari</b><small>Paling rame hari ${HARI[R.week.indexOf(maxW)]}</small></div><div class="rc-bars wk">${R.week.map((v, i) => `<i class="${v === maxW ? 'pk' : ''}" style="--v:${(v / maxW) * 100}%"><span>${HARI[i]}</span></i>`).join('')}</div></div></div>`);
};
// Angka Recap "ngitung" naik pas halaman kebuka
function countUp(root) {
  if (reduceMotion.matches) return;
  for (const el of $$('.rc-num[data-n]', root)) {
    const n = +el.dataset.n, t0 = performance.now(), dur = 1100;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = nf.format(Math.round(n * (1 - (1 - p) ** 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

/* ---------- kartu share (story 1080×1920) ---------- */

const loadImg = (u) => new Promise((res) => { if (!u) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = u; });
function wrapText(x, text, maxW, maxLines) {
  const words = String(text).split(/\s+/), lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (x.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; let l = lines[maxLines - 1]; while (x.measureText(l + '…').width > maxW && l) l = l.slice(0, -1); lines[maxLines - 1] = l + '…'; }
  return lines;
}
// Latar blur: ctx.filter belum ada di WebKit, jadi fallback-nya kecilin dulu terus gedein (hasilnya lembut juga)
const canvasFilter = 'filter' in CanvasRenderingContext2D.prototype;
function blurBg(x, im, X, Y, W, H) {
  if (canvasFilter) { x.filter = 'blur(90px) saturate(1.5)'; coverFill(x, im, X, Y, W, H); x.filter = 'none'; return; }
  let src = im;
  for (const s of [18, 72, 288]) {
    const c = document.createElement('canvas');
    c.width = s; c.height = Math.round((s * H) / W);
    const cx = c.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    if (src === im) coverFill(cx, im, 0, 0, c.width, c.height); else cx.drawImage(src, 0, 0, c.width, c.height);
    src = c;
  }
  x.imageSmoothingQuality = 'high';
  x.drawImage(src, X, Y, W, H);
}
function coverFill(x, im, X, Y, W, H) {
  const r = Math.max(W / im.width, H / im.height), w = im.width * r, h = im.height * r;
  x.drawImage(im, X + (W - w) / 2, Y + (H - h) / 2, w, h);
}
function drawVinyl(x, cx, cy, r, label) {
  x.save();
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = '#121216'; x.fill();
  for (let k = r * 0.42; k < r; k += 7) { x.beginPath(); x.arc(cx, cy, k, 0, Math.PI * 2); x.strokeStyle = 'rgba(255,255,255,.045)'; x.lineWidth = 2; x.stroke(); }
  const g = x.createConicGradient(0.6, cx, cy);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.08, 'rgba(255,255,255,.12)'); g.addColorStop(0.16, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0)'); g.addColorStop(0.62, 'rgba(255,255,255,.08)'); g.addColorStop(0.7, 'rgba(255,255,255,0)');
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = g; x.fill();
  if (label) { x.save(); x.beginPath(); x.arc(cx, cy, r * 0.38, 0, Math.PI * 2); x.clip(); coverFill(x, label, cx - r * 0.38, cy - r * 0.38, r * 0.76, r * 0.76); x.restore(); }
  x.beginPath(); x.arc(cx, cy, r * 0.04, 0, Math.PI * 2); x.fillStyle = '#16161a'; x.fill();
  x.restore();
}
function shareFooter(x, logo, W, H) {
  x.save();
  x.font = '800 38px "Plus Jakarta Sans"';
  const tw = x.measureText('Svara').width, lw = logo ? 52 : 0, gap = logo ? 16 : 0, X = (W - lw - gap - tw) / 2, Y = H - 120;
  x.globalAlpha = 0.85;
  if (logo) x.drawImage(logo, X, Y - 26, lw, lw);
  x.fillStyle = '#fff'; x.textBaseline = 'middle';
  x.fillText('Svara', X + lw + gap, Y + 1);
  x.restore();
}
let shareBusy = false;
async function shareCard(kind, arg) {
  if (shareBusy) return;
  if (kind === 'song' && !T(arg)) return toast('Putar lagu dulu ya');
  shareBusy = true;
  toast('Lagi bikin kartu story…');
  try { await drawShareCard(kind, arg); } catch (err) { console.error('share card', err); toast('Kartu gagal dibikin, coba lagi'); } finally { shareBusy = false; }
}
async function drawShareCard(kind, arg) {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  await Promise.all(['800 80px "Plus Jakarta Sans"', '600 40px "Plus Jakarta Sans"', '700 40px "Plus Jakarta Sans"'].map((f) => document.fonts.load(f).catch(() => {})));
  const logo = await loadImg('assets/logo.png');
  let name;
  if (kind === 'song') {
    const t = T(arg);
    if (!t) return;
    const [art, pal] = await Promise.all([loadImg(bigArt(t.art)), t.art ? palette(t.art) : null]);
    const [c1, c2, c3] = pal || ['hsl(42 100% 62%)', 'hsl(0 100% 72%)', 'hsl(256 100% 78%)'];
    x.fillStyle = '#0b0b0f'; x.fillRect(0, 0, W, H);
    if (art) { x.save(); x.globalAlpha = 0.75; blurBg(x, art, -200, -200, W + 400, H + 400); x.restore(); }
    let g = x.createRadialGradient(W * 0.6, 640, 0, W * 0.6, 640, 760); g.addColorStop(0, c1); g.addColorStop(1, 'transparent');
    x.globalAlpha = 0.45; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
    g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,.15)'); g.addColorStop(0.55, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,.82)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // ukur dulu isi teksnya biar seluruh susunan bisa ditaruh pas di tengah
    const CV = 660, CX = 96;
    x.font = '800 84px "Plus Jakarta Sans"';
    const tl = wrapText(x, t.title, W - 192, 2);
    x.font = '600 44px "Plus Jakarta Sans"';
    const al = wrapText(x, [t.artist, t.album && t.album !== t.title ? t.album : ''].filter(Boolean).join(' · '), W - 192, 1)[0] || '';
    const playing = S.queue[S.idx] === t.id;
    const k = playing && S.lyr?.synced ? sideLyrK0() : -1;
    const lyr = k >= 0 ? S.lyr.lines[k].text : (playing && S.lyr?.lines?.[0]?.text) || '';
    x.font = 'italic 700 46px "Plus Jakarta Sans"';
    const ls = lyr ? wrapText(x, `“${lyr}”`, W - 250, 3) : [];
    const dur = t.duration || (playing && audio.duration) || 0;
    const lyrH = ls.length ? ls.length * 60 + 64 : 0;
    const total = CV + 96 + tl.length * 94 + 62 + (lyrH ? 56 + lyrH : 0) + 84 + 70 + (dur ? 64 : 0);
    let y = Math.max(110, (H - 200 - total) / 2 + 20);
    // sampul + piringan nyembul di kanan (masih di dalam kartu)
    drawVinyl(x, CX + CV - 30, y + CV / 2, CV * 0.46, art);
    x.save();
    x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 80; x.shadowOffsetY = 34;
    x.beginPath(); x.roundRect(CX, y, CV, CV, 28); x.fillStyle = '#1c1c22'; x.fill();
    x.restore();
    x.save(); x.beginPath(); x.roundRect(CX, y, CV, CV, 28); x.clip(); if (art) coverFill(x, art, CX, y, CV, CV);
    x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 3; x.stroke(); x.restore();
    y += CV + 96;
    // judul & artis
    x.fillStyle = '#fff'; x.font = '800 84px "Plus Jakarta Sans"';
    for (const l of tl) { y += 76; x.fillText(l, CX, y); y += 18; }
    x.globalAlpha = 0.7; x.font = '600 44px "Plus Jakarta Sans"';
    x.fillText(al, CX, y + 46); x.globalAlpha = 1;
    y += 62;
    // potongan lirik (kalau lagi diputar & ada liriknya)
    if (ls.length) {
      y += 56;
      x.fillStyle = 'rgba(255,255,255,.09)'; x.beginPath(); x.roundRect(CX, y, W - CX * 2, lyrH, 30); x.fill();
      x.fillStyle = c1; x.beginPath(); x.roundRect(CX, y + 24, 8, lyrH - 48, 4); x.fill();
      x.fillStyle = '#fff'; x.font = 'italic 700 46px "Plus Jakarta Sans"';
      ls.forEach((l, i) => x.fillText(l, CX + 50, y + 74 + i * 60));
      y += lyrH;
    }
    // gelombang warna lagu
    y += 84;
    const n = 48, bw = 10, gap = (W - CX * 2 - n * bw) / (n - 1), mid = y + 35;
    g = x.createLinearGradient(CX, 0, W - CX, 0); g.addColorStop(0, c1); g.addColorStop(0.5, c2); g.addColorStop(1, c3);
    x.fillStyle = g;
    const seed = hue(t.id), pr = dur && playing ? Math.min(1, audio.currentTime / dur) : 0.38;
    for (let i = 0; i < n; i++) {
      const v = 0.22 + 0.78 * Math.abs(Math.sin(i * 0.55 + seed) * Math.sin(i * 0.21 + seed * 0.3)), h = 10 + v * 60;
      x.globalAlpha = (i + 0.5) / n <= pr ? 1 : 0.3;
      x.beginPath(); x.roundRect(CX + i * (bw + gap), mid - h / 2, bw, h, 5); x.fill();
    }
    x.globalAlpha = 1;
    y += 70;
    // waktu jalan / durasi
    if (dur) {
      x.fillStyle = '#fff'; x.globalAlpha = 0.6; x.font = '600 32px "Plus Jakarta Sans"';
      if (playing) x.fillText(fmt(pr * dur), CX, y + 52);
      x.textAlign = 'right'; x.fillText(fmt(dur), W - CX, y + 52); x.textAlign = 'left'; x.globalAlpha = 1;
    }
    shareFooter(x, logo, W, H);
    name = `svara-${t.title}`;
  } else {
    const per = arg || '7';
    const R = recapData(per === 'all' ? 0 : +per);
    const t1 = T(R.top[0]?.id);
    const pal = t1?.art ? await palette(t1.art) : null;
    const [c1, c2, c3] = pal || ['hsl(42 100% 62%)', 'hsl(0 100% 72%)', 'hsl(256 100% 78%)'];
    x.fillStyle = '#0b0b0f'; x.fillRect(0, 0, W, H);
    for (const [cx, cy, r, col] of [[200, 250, 700, c1], [950, 900, 650, c2], [300, 1650, 700, c3]]) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, col); g.addColorStop(1, 'transparent'); x.globalAlpha = 0.42; x.fillStyle = g; x.fillRect(0, 0, W, H); }
    x.globalAlpha = 1;
    x.fillStyle = '#fff';
    x.font = '700 34px "Plus Jakarta Sans"'; x.globalAlpha = 0.8;
    x.fillText(`SVARA RECAP · ${{ 7: '7 HARI TERAKHIR', 30: '30 HARI TERAKHIR', all: 'SEPANJANG MASA' }[per]}`, 80, 200);
    x.globalAlpha = 1;
    const mins = nf.format(Math.round(R.secs / 60));
    x.font = '800 250px "Plus Jakarta Sans"';
    const g = x.createLinearGradient(80, 0, 80 + x.measureText(mins).width, 0); g.addColorStop(0, c1); g.addColorStop(0.5, c2); g.addColorStop(1, c3);
    x.fillStyle = g; x.fillText(mins, 70, 460);
    x.fillStyle = '#fff'; x.font = '800 64px "Plus Jakarta Sans"'; x.fillText('menit dengerin musik', 80, 560);
    x.globalAlpha = 0.7; x.font = '600 38px "Plus Jakarta Sans"';
    x.fillText(`${nf.format(R.top.length)} lagu · ${nf.format(R.artists.length)} artis · ${R.streak} hari beruntun`, 80, 630); x.globalAlpha = 1;
    const [pe, pn] = PERSONA(R.peak);
    x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.roundRect(80, 690, 640, 120, 60); x.fill();
    x.fillStyle = '#fff'; x.font = '64px sans-serif'; x.fillText(pe, 110, 772);
    x.fillStyle = '#fff'; x.font = '800 48px "Plus Jakarta Sans"'; x.fillText(pn, 210, 768);
    x.font = '800 44px "Plus Jakarta Sans"'; x.fillText('Top lagu', 80, 920);
    const covers = await Promise.all(R.top.slice(0, 5).map((s2) => loadImg(T(s2.id).art)));
    R.top.slice(0, 5).forEach((s2, i) => {
      const tt = T(s2.id), yy = 960 + i * 150;
      x.globalAlpha = 1; x.fillStyle = i < 3 ? c1 : 'rgba(255,255,255,.55)'; x.font = '800 54px "Plus Jakarta Sans"'; x.fillText(String(i + 1), 84, yy + 82);
      x.save(); x.beginPath(); x.roundRect(160, yy, 120, 120, 18); x.clip(); x.fillStyle = '#333'; x.fillRect(160, yy, 120, 120); if (covers[i]) coverFill(x, covers[i], 160, yy, 120, 120); x.restore();
      x.fillStyle = '#fff'; x.font = '800 42px "Plus Jakarta Sans"'; x.fillText(wrapText(x, tt.title, 560, 1)[0], 310, yy + 52);
      x.globalAlpha = 0.65; x.font = '600 32px "Plus Jakarta Sans"'; x.fillText(wrapText(x, tt.artist, 560, 1)[0], 310, yy + 98);
      x.textAlign = 'right'; x.globalAlpha = 1; x.font = '800 40px "Plus Jakarta Sans"'; x.fillText(`${s2.n}×`, W - 80, yy + 72); x.textAlign = 'left';
    });
    x.globalAlpha = 1;
    shareFooter(x, logo, W, H);
    name = `svara-recap-${per}`;
  }
  let blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  if (!blob) blob = await (await fetch(c.toDataURL('image/png'))).blob();
  showShare(blob, name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '.png');
}
let shareUrl = null;
const nativeShare = window.webkit?.messageHandlers?.svaraShare;
const blobB64 = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
function showShare(blob, fname) {
  const d = $('#share');
  if (shareUrl) URL.revokeObjectURL(shareUrl);
  shareUrl = URL.createObjectURL(blob);
  const file = new File([blob], fname, { type: 'image/png' });
  let canShare = false;
  try { canShare = !nativeShare && !!navigator.canShare?.({ files: [file] }); } catch {}
  const canCopy = !!nativeShare || (!!window.ClipboardItem && !!navigator.clipboard?.write);
  const btns = [
    nativeShare || canShare ? `<button class="btn ink" data-sh="share">${I.share} Bagikan</button>` : '',
    `<button class="btn ${nativeShare || canShare ? '' : 'ink'}" data-sh="save">${I.save} Simpan gambar</button>`,
    canCopy ? `<button class="btn" data-sh="copy">${I.copy} Salin</button>` : '',
  ].join('');
  d.innerHTML = `<div class="keys-h"><b>${I.share} Bagikan</b><button class="ib" data-close aria-label="Tutup">${I.x}</button></div>
    <div class="share-prev"><img src="${shareUrl}" alt="Pratinjau kartu share"></div>
    <div class="share-btns">${btns}</div>
    <p class="share-hint">${nativeShare ? 'Buat story IG: Bagikan → AirDrop ke HP, atau Salin terus tempel.' : 'Ukuran 1080×1920, pas buat story.'}</p>`;
  let b64 = null;
  const native = async (action, b) => {
    b64 ??= await blobB64(blob);
    const r = b.getBoundingClientRect();
    return nativeShare.postMessage({ action, name: fname, data: b64, rect: { x: r.left, y: r.top, w: r.width, h: r.height } });
  };
  d.onclick = async (e) => {
    if (e.target === d || e.target.closest('[data-close]')) return d.close();
    const b = e.target.closest('[data-sh]');
    if (!b || b.disabled) return;
    const act = b.dataset.sh;
    b.disabled = true;
    try {
      if (nativeShare) {
        const res = await native(act, b);
        if (res === 'copied') toast('Gambar disalin, tinggal tempel');
        else if (res === 'saved') toast('Gambar tersimpan');
      } else if (act === 'share') {
        await navigator.share({ files: [file], title: 'Svara' });
      } else if (act === 'copy') {
        // Safari mau ClipboardItem dikasih Promise biar izin gesture-nya nggak keburu habis
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': Promise.resolve(blob) })]);
        toast('Gambar disalin, tinggal tempel');
      } else {
        const a = document.createElement('a');
        a.href = shareUrl; a.download = fname;
        document.body.append(a); a.click(); a.remove();
        toast('Gambar diunduh');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') { console.error('share', err); toast(act === 'save' ? 'Gagal nyimpen gambar' : 'Gagal, coba "Simpan gambar" aja'); }
    } finally { b.disabled = false; }
  };
  if (!d.open) d.showModal();
}

/* ---------- mini player melayang (Picture-in-Picture) ---------- */

let pipWin = null, pipKey = '', pipVid = null, pipCvs = null, pipT = 0;
async function openPip() {
  if (pipWin) { pipWin.close(); return; }
  if (document.pictureInPictureElement) { document.exitPictureInPicture(); return; }
  if (!cur()) return toast('Putar lagu dulu ya');
  if ('documentPictureInPicture' in window) {
    try { pipWin = await documentPictureInPicture.requestWindow({ width: 340, height: 420 }); } catch { pipWin = null; return videoPip(); }
    const d = pipWin.document;
    d.head.innerHTML = `<base href="${esc(location.href.split('#')[0])}"><meta charset="utf-8"><link rel="stylesheet" href="style.css">`;
    if (document.documentElement.dataset.theme) d.documentElement.dataset.theme = document.documentElement.dataset.theme;
    d.documentElement.style.colorScheme = document.documentElement.style.colorScheme;
    d.body.className = 'pip-body';
    d.body.innerHTML = `<div class="pip"><div class="pip-bg"><img alt=""></div>
      <div class="pip-deck"><div class="pip-vinyl vinyl"><span class="vinyl-lbl"></span></div><div class="pip-cover"></div></div>
      <div class="pip-meta"><b class="pip-t"></b><span class="pip-a"></span></div>
      <canvas class="spec pip-spec"></canvas>
      <div class="pip-ctl"><button class="ib" data-pip="love" aria-label="Suka"></button><button class="ib" data-pip="prev" aria-label="Sebelumnya">${I.prev}</button><button class="ib pip-play" data-pip="play" aria-label="Putar atau jeda"></button><button class="ib" data-pip="next" aria-label="Berikutnya">${I.next}</button><button class="ib" data-pip="back" aria-label="Balik ke Svara">${I.full}</button></div></div>`;
    d.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pip]');
      if (b) return ({ play: togglePlay, prev, next: () => next(), love: () => toggleLove(S.queue[S.idx]), back: () => { window.focus(); pipWin?.close(); } })[b.dataset.pip]?.();
      const sp = e.target.closest('.pip-spec');
      if (sp) { const r = sp.getBoundingClientRect(); seekTo(((e.clientX - r.left) / r.width) * durNow()); }
    });
    pipWin.addEventListener('pagehide', () => { pipWin = null; pipKey = ''; renderPipBtn(); });
    pipKey = '';
    renderPip();
    renderPipBtn();
    vizStart();
    return;
  }
  videoPip();
}
function renderPip() {
  if (pipVid && document.pictureInPictureElement === pipVid) drawPipFrame();
  if (!pipWin) return;
  const d = pipWin.document, t = cur();
  if (!t) return;
  const playing = !audio.paused;
  $('.pip', d)?.classList.toggle('playing', playing);
  const pb = $('.pip-play', d);
  if (pb) pb.innerHTML = playing ? I.pause : I.play;
  const lb = $('[data-pip=love]', d);
  if (lb) { lb.innerHTML = S.loved.has(t.id) ? I.heartF : I.heart; lb.classList.toggle('on', S.loved.has(t.id)); }
  if (pipKey === t.id) return;
  pipKey = t.id;
  $('.pip-t', d).textContent = t.title;
  $('.pip-a', d).textContent = t.artist;
  $('.pip-bg img', d).src = bigArt(t.art) || '';
  $('.pip-cover', d).innerHTML = cover(bigArt(t.art), '', t.id);
  $('.vinyl-lbl', d).innerHTML = cover(t.art, '', t.id);
  d.title = `${t.title} · Svara`;
}
const renderPipBtn = () => $$('[data-act=pip]').forEach((b) => { b.innerHTML = I.pip; b.classList.toggle('on', !!pipWin || !!document.pictureInPictureElement); });
// Cadangan buat browser tanpa Document PiP (Safari, app Mac): video PiP dari canvas, kontrolnya lewat Media Session
async function videoPip() {
  if (!document.pictureInPictureEnabled) return toast('Mini player belum didukung di sini');
  pipCvs ||= Object.assign(document.createElement('canvas'), { width: 480, height: 480 });
  pipVid ||= Object.assign(document.createElement('video'), { muted: true, playsInline: true });
  drawPipFrame();
  pipVid.srcObject ||= pipCvs.captureStream(4);
  try {
    await pipVid.play();
    await pipVid.requestPictureInPicture();
    pipT = setInterval(drawPipFrame, 500);
    pipVid.onleavepictureinpicture = () => { clearInterval(pipT); renderPipBtn(); };
    renderPipBtn();
  } catch { toast('Mini player gagal dibuka'); }
}
let pipImg = null, pipImgU = '';
function drawPipFrame() {
  const t = cur();
  if (!pipCvs || !t) return;
  const x = pipCvs.getContext('2d'), W = 480;
  const u = bigArt(t.art);
  if (u !== pipImgU) { pipImgU = u; pipImg = null; loadImg(u).then((im) => { if (pipImgU === u) { pipImg = im; drawPipFrame(); } }); }
  x.fillStyle = '#0b0b0f'; x.fillRect(0, 0, W, W);
  if (pipImg) coverFill(x, pipImg, 0, 0, W, W);
  const g = x.createLinearGradient(0, W * 0.45, 0, W); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.85)');
  x.fillStyle = g; x.fillRect(0, 0, W, W);
  x.fillStyle = '#fff'; x.font = '800 34px "Plus Jakarta Sans", sans-serif'; x.fillText(wrapText(x, t.title, W - 48, 1)[0], 24, W - 74);
  x.globalAlpha = 0.75; x.font = '600 22px "Plus Jakarta Sans", sans-serif'; x.fillText(wrapText(x, t.artist, W - 48, 1)[0], 24, W - 42); x.globalAlpha = 1;
  const d = durNow(), p = d ? posNow() / d : 0;
  x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(24, W - 22, W - 48, 5);
  x.fillStyle = '#ffc94a'; x.fillRect(24, W - 22, (W - 48) * p, 5);
}

/* ---------- tema ---------- */

const darkMq = matchMedia('(prefers-color-scheme: dark)');
const themePref = () => { try { return localStorage.getItem('putar-theme') || 'auto'; } catch { return 'auto'; } };
function setTheme(pref) {
  try { pref === 'auto' ? localStorage.removeItem('putar-theme') : localStorage.setItem('putar-theme', pref); } catch {}
  applyTheme();
}
function applyTheme() {
  const pref = themePref();
  const dark = pref === 'dark' || (pref === 'auto' && darkMq.matches);
  const root = document.documentElement;
  if (pref === 'auto') delete root.dataset.theme; else root.dataset.theme = pref;
  root.style.colorScheme = dark ? 'dark' : 'light';
  $('meta[name=theme-color]')?.setAttribute('content', dark ? '#0b0b0f' : '#f6f5f2');
  $$('[data-act=theme]').forEach((b) => {
    b.innerHTML = I[{ auto: 'contrast', light: 'sun', dark: 'moon' }[pref]];
    b.title = { auto: 'Tema: ikut sistem', light: 'Tema: terang', dark: 'Tema: gelap' }[pref];
  });
}
darkMq.addEventListener('change', applyTheme);

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  el.classList.remove('out');
  clearTimeout(toastT);
  toastT = setTimeout(() => { el.classList.add('out'); setTimeout(() => (el.hidden = true), 250); }, 2400);
}

/* ================= simpan & mulai ================= */

const stateObj = () => ({ queue: S.queue, base: S.base, idx: S.idx, shuffle: S.shuffle, repeat: S.repeat, volume: S.volume, muted: audio.muted, pos: audio.currentTime || S.restorePos, panel: S.panel === 'queue' ? 'queue' : null, src: S.src ? { mix: S.src.mix, name: S.src.name, chip: S.src.chip } : null });
const saveState = debounce(() => { kv.set('state', stateObj()); pushRemote(); }, 400);

/* ---------- remote: Nusa (notch) bisa lihat antrean & milih lagu ---------- */
const remoteHeaders = { 'Content-Type': 'application/json', 'X-Senandung-Remote': '1' };
const pushRemote = debounce(() => {
  const from = Math.max(0, S.idx - 1);
  const queue = S.queue.slice(from, S.idx + 40).map((id, k) => {
    const t = T(id);
    return t && { i: from + k, vid: t.vid, title: t.title, artist: t.artist, art: t.art, duration: t.duration || 0 };
  }).filter(Boolean);
  fetch('/api/remote/state', { method: 'POST', headers: remoteHeaders, body: JSON.stringify({ idx: S.idx, playing: !audio.paused, queue, at: Date.now() }) }).catch(() => {});
}, 250);
async function pollRemote() {
  try {
    const cmds = await (await fetch('/api/remote/poll', { cache: 'no-store' })).json();
    for (const c of cmds) {
      if (c.cmd === 'jump' && Number.isInteger(c.index)) load(c.index);
      else if ((c.cmd === 'play' || c.cmd === 'queue') && c.item?.vid && /^[A-Za-z0-9_-]{11}$/.test(c.item.vid)) {
        const id = song(c.item).id;
        saveTracks();
        if (c.cmd === 'queue') playNext([id]);
        else if (S.idx < 0) playFrom([id]);
        else { S.queue.splice(S.idx + 1, 0, id); load(S.idx + 1); }
      }
    }
  } catch {}
  setTimeout(pollRemote, 800);
}
for (const ev of ['play', 'pause']) onAudio(ev, () => pushRemote());
window.addEventListener('pagehide', () => kv.set('state', stateObj()));

async function init() {
  const keys = ['state', 'playlists', 'loved', 'plays', 'tracks', 'yt', 'subs', 'podmeta', 'podpos', 'podDone', 'rate', 'savedColl', 'recentQ', 'feed', 'autoplay', 'radio', 'log', 'fx', 'skips'];
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
  S.skips = v.skips || {};
  S.log = (v.log || []).filter((e) => Array.isArray(e) && e.length === 3);
  if (v.fx) Object.assign(FX, v.fx, { xf: DUAL ? v.fx.xf || 0 : 0 });
  renderFxBtn();
  renderPipBtn();
  $$('[data-act=share]').forEach((b) => (b.innerHTML = I.share));
  if (localStorage.getItem('putar-side') === 'off') document.body.classList.add('side-off');
  if (localStorage.getItem('putar-lib') === 'mini') document.body.classList.add('lib-mini');
  if (v.feed?.data) {
    S.feed = v.feed.data;
    S.feed.forEach((s) => s.items.forEach((x) => x.type !== 'song' && rememberColl(x)));
  }
  const st = v.state;
  if (st) {
    Object.assign(S, { queue: (st.queue || []).filter((id) => T(id)), base: (st.base || []).filter((id) => T(id)), shuffle: st.shuffle === 'smart' ? 'smart' : !!st.shuffle, repeat: st.repeat || 'off', volume: st.volume ?? 80, restorePos: st.pos || 0, panel: st.panel || null, src: st.src || null });
    S.idx = Math.min(st.idx ?? -1, S.queue.length - 1);
    audio.muted = !!st.muted;
  }
  $$('[data-ic]').forEach((e) => (e.outerHTML = I[e.dataset.ic] || ''));
  $$('[data-act=sleep]').forEach((b) => (b.innerHTML = I.moon));
  applyTheme();
  renderSleep();
  setVolume(S.volume);
  renderPanels();
  if (S.idx >= 0) loadLyrics();
  route();
  // Intro minimal tampil sebentar biar animasinya kelihatan utuh, lalu app masuk
  setTimeout(endIntro, Math.max(0, 1500 - performance.now()));
  loadChips();
  // Beranda disegerin di belakang
  if (!v.feed || Date.now() - v.feed.at > 20 * 60 * 1000) loadFeed();
  loadRegion();
  try {
    const ping = await api('/api/yt/ping');
    S.serverOk = !!ping.ok;
  } catch {
    S.serverOk = false;
    toast('Server Svara belum nyala. Jalanin ./senandung di Terminal');
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  pushRemote();
  pollRemote();
}

init();
