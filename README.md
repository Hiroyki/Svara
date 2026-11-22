<div align="center">

<img src="assets/logo.png" width="96" alt="Svara logo">

<pre>
███████╗██╗   ██╗ █████╗ ██████╗  █████╗
██╔════╝██║   ██║██╔══██╗██╔══██╗██╔══██╗
███████╗██║   ██║███████║██████╔╝███████║
╚════██║╚██╗ ██╔╝██╔══██║██╔══██╗██╔══██║
███████║ ╚████╔╝ ██║  ██║██║  ██║██║  ██║
╚══════╝  ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
</pre>

### *Feel every note.*

An ad-free music player for the YouTube Music catalogue: lyrics, crossfade, EQ, podcasts and offline saving.

[![License: MIT](https://img.shields.io/badge/License-MIT-ffc94a.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/github/v/release/Hiroyki/Svara?style=for-the-badge&color=ff7a6b&label=version)](https://github.com/Hiroyki/Svara/releases/latest)
[![Platform](https://img.shields.io/badge/platform-windows_·_macOS_·_web-b69cff.svg?style=for-the-badge)](#-download)

<br>

[![Download for Windows](https://img.shields.io/badge/Download-Windows_installer-0078d4.svg?style=for-the-badge&logo=windows)](https://github.com/Hiroyki/Svara/releases/latest/download/Svara-Setup-2.0.0.exe)
&nbsp;
[![Download for macOS](https://img.shields.io/badge/Download-macOS_.dmg-111111.svg?style=for-the-badge&logo=apple)](https://github.com/Hiroyki/Svara/releases/latest/download/Svara-2.0.0.dmg)

<br>

**[🇺🇸 English](#-english)** &nbsp;·&nbsp; **[🇮🇩 Bahasa Indonesia](#-bahasa-indonesia)**

<br>

<img src="docs/screenshot.png" width="860" alt="Svara home screen">

</div>

---

## 🇺🇸 English

### What is Svara?

**Svara** is a personal music player that plays the YouTube Music catalogue without ads. You get the real catalogue (charts, moods, albums, artists, playlists, radio mixes), synced karaoke lyrics, a 5-band equalizer, crossfade, podcasts, and songs you can save for offline listening.

It runs as a small local server (Python + [yt-dlp](https://github.com/yt-dlp/yt-dlp)) with a hand-built web interface on top. On Windows and macOS that interface lives in a native app window, so it behaves like any other music app.

### 📥 Download

| Platform | File | Notes |
| --- | --- | --- |
| 🪟 **Windows 10/11** (64-bit) | [`Svara-Setup-2.0.0.exe`](https://github.com/Hiroyki/Svara/releases/latest/download/Svara-Setup-2.0.0.exe) | Click through the setup wizard. Everything is bundled. |
| 🍎 **macOS 13+** (Apple Silicon & Intel) | [`Svara-2.0.0.dmg`](https://github.com/Hiroyki/Svara/releases/latest/download/Svara-2.0.0.dmg) | Drag to Applications. Needs `yt-dlp` and `ffmpeg` (see below). |

All releases: **[github.com/Hiroyki/Svara/releases](https://github.com/Hiroyki/Svara/releases)**

#### Windows

1. Run `Svara-Setup-2.0.0.exe` and click **Next → Next → Install → Finish**.
2. No admin rights needed: Svara installs for your user only and adds a Start menu entry (plus a desktop shortcut if you leave the box ticked).
3. Python, yt-dlp, Deno and ffmpeg ship inside the app, so there's nothing else to install.

> The installer isn't code-signed yet. If SmartScreen says *"Windows protected your PC"*, click **More info → Run anyway**.
>
> To uninstall: **Settings → Apps → Svara → Uninstall**. It asks whether to keep your library for a later reinstall.

#### macOS

1. Install the helpers once with [Homebrew](https://brew.sh):
   ```sh
   brew install yt-dlp ffmpeg deno
   ```
2. Open `Svara-2.0.0.dmg` and drag **Svara** into **Applications**.
3. The app isn't notarised yet, so the first launch needs one extra step: **right-click Svara → Open → Open**.
   If macOS still blocks it, go to **System Settings → Privacy & Security → Open Anyway**, or run:
   ```sh
   xattr -dr com.apple.quarantine /Applications/Svara.app
   ```

Closing the window keeps the music playing; quit with **⌘Q**.

### ✨ Features

| | Feature | What it does |
| --- | --- | --- |
| 🏠 | **Adaptive home** | Daily mix, "continue listening", mood cards and recommendations for your country. |
| 🔍 | **Search** | Songs, albums, artists, playlists and podcasts. |
| ⏭️ | **Up Next** | Endless radio mix with mood chips, smart shuffle, and saving the queue as a playlist. |
| 📝 | **Lyrics** | Time-synced karaoke lyrics in a side panel or full screen. |
| 🎛️ | **Sound** | Gapless crossfade, 5-band equalizer and a live spectrum visualizer. |
| 💾 | **Offline** | Save songs to disk (via ffmpeg) and play them without a connection. |
| 🎙️ | **Podcasts** | Subscribe to RSS feeds and play episodes. |
| 📊 | **Svara Recap** | Listening stats for 7 days, 30 days or all time: minutes, top songs, artists, streaks. |
| 📸 | **Story cards** | Share a 1080×1920 card of the current song (with a lyric line) or your Recap. Uses the native share sheet on macOS. |
| 🪟 | **Mini player** | Floating picture-in-picture player, plus a sleep timer. |
| 🌗 | **Themes** | Light and dark themes that follow your system. |
| ⌨️ | **Keyboard-first** | Full shortcut set (press <kbd>?</kbd> in the app). |

### ⌨️ Shortcuts

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> | Play / pause |
| <kbd>→</kbd> / <kbd>←</kbd> | Seek ±10 s |
| <kbd>⇧</kbd>+<kbd>→</kbd> / <kbd>⇧</kbd>+<kbd>←</kbd> | Next / previous song |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume |
| <kbd>L</kbd> | Lyrics |
| <kbd>M</kbd> | Mute |
| <kbd>E</kbd> | Sound & equalizer |
| <kbd>P</kbd> | Mini player |
| <kbd>⌘K</kbd> or <kbd>/</kbd> | Search |
| <kbd>?</kbd> | Show all shortcuts |

### 🔧 How it works

```
┌──────────────── native window ────────────────┐
│  macOS: Swift + WKWebView                     │
│  Windows: Go + WebView2                       │
│  ┌──────────── web UI (vanilla JS) ─────────┐ │
│  │ index.html · app.js · style.css · db.js │ │
│  └──────────────────┬───────────────────────┘ │
└─────────────────────┼─────────────────────────┘
                      │ http://127.0.0.1:5560
          ┌───────────┴───────────┐
          │ server.py (Python)    │──► yt-dlp workers (ytworker.py)
          │ catalogue · streams   │──► ffmpeg (offline saving)
          │ lyrics · podcasts     │──► RSS feeds
          └───────────────────────┘
```

| Piece | What |
| --- | --- |
| `index.html`, `app.js`, `style.css` | The whole interface: no framework, no build step. |
| `db.js` | IndexedDB storage for your library, history and queue. |
| `server.py` | Local server: serves the UI and bridges the catalogue, audio streams, lyrics, images and podcasts. |
| `ytworker.py` | Long-running yt-dlp workers, so the next song resolves in about a second. |
| `mac/main.swift` | macOS app: window, menu, server lifecycle and the native share bridge. |
| `windows/` | Windows app (Go + WebView2) with Python, yt-dlp, Deno and ffmpeg embedded, plus the NSIS installer. |

### 🛠️ Build from source

Run it in the browser (any OS with Python 3.9+, `yt-dlp` and `ffmpeg`):

```sh
python3 server.py          # then open http://localhost:5560
```

Build the apps (on a Mac):

```sh
./build-mac.sh             # → dist/Svara.app + dist/Svara-<version>.dmg (also installs to ~/Applications)
./build-windows.sh         # → dist-windows/Svara.exe + dist-windows/Svara-Setup-<version>.exe
```

`build-mac.sh` needs the Xcode command line tools and Pillow (`pip3 install pillow`).
`build-windows.sh` cross-compiles from macOS and needs `go`, `uv`, `makensis` and Pillow (`brew install go uv makensis`).

---

## 🇮🇩 Bahasa Indonesia

### Svara itu apa?

**Svara** itu pemutar musik pribadi buat katalog YouTube Music, tanpa iklan. Isinya katalog beneran (chart, mood, album, artis, playlist, mix radio), lirik karaoke yang jalan bareng lagu, equalizer 5 band, crossfade, podcast, dan lagu yang bisa disimpan buat didengerin offline.

Di baliknya ada server lokal kecil (Python + [yt-dlp](https://github.com/yt-dlp/yt-dlp)), di atasnya tampilan web yang dibikin sendiri. Di Windows dan macOS tampilannya dibungkus jendela app native, jadi rasanya kayak app musik biasa.

### 📥 Download

| Platform | File | Catatan |
| --- | --- | --- |
| 🪟 **Windows 10/11** (64-bit) | [`Svara-Setup-2.0.0.exe`](https://github.com/Hiroyki/Svara/releases/latest/download/Svara-Setup-2.0.0.exe) | Tinggal Next-Next. Semua udah dibundel. |
| 🍎 **macOS 13+** (Apple Silicon & Intel) | [`Svara-2.0.0.dmg`](https://github.com/Hiroyki/Svara/releases/latest/download/Svara-2.0.0.dmg) | Seret ke Applications. Butuh `yt-dlp` dan `ffmpeg` (lihat di bawah). |

#### Windows

1. Jalanin `Svara-Setup-2.0.0.exe`, klik **Next → Next → Install → Finish**.
2. Nggak perlu admin: Svara dipasang buat user kamu aja, muncul di Start menu (plus shortcut desktop kalau centangnya dibiarin).
3. Python, yt-dlp, Deno, dan ffmpeg udah ikut di dalam app, jadi nggak ada yang perlu dipasang lagi.

> Installer-nya belum ditandatangani (code-sign). Kalau SmartScreen bilang *"Windows protected your PC"*, klik **More info → Run anyway**.
>
> Buat uninstall: **Settings → Apps → Svara → Uninstall**. Nanti ditanya mau nyimpen koleksi kamu atau nggak.

#### macOS

1. Pasang pembantunya sekali lewat [Homebrew](https://brew.sh):
   ```sh
   brew install yt-dlp ffmpeg deno
   ```
2. Buka `Svara-2.0.0.dmg`, seret **Svara** ke **Applications**.
3. App-nya belum dinotarisasi Apple, jadi pas pertama dibuka: **klik kanan Svara → Open → Open**.
   Kalau masih diblokir, buka **System Settings → Privacy & Security → Open Anyway**, atau jalanin:
   ```sh
   xattr -dr com.apple.quarantine /Applications/Svara.app
   ```

Nutup jendela nggak bikin musik berhenti; keluar beneran pakai **⌘Q**.

### ✨ Fitur

| | Fitur | Gunanya |
| --- | --- | --- |
| 🏠 | **Beranda adaptif** | Mix harian, lanjutin dengerin, kartu mood, rekomendasi sesuai negara. |
| 🔍 | **Cari** | Lagu, album, artis, playlist, dan podcast. |
| ⏭️ | **Berikutnya** | Mix radio tanpa ujung, chip suasana, smart shuffle, simpan antrean jadi playlist. |
| 📝 | **Lirik** | Lirik karaoke yang jalan bareng lagu, di panel samping atau layar penuh. |
| 🎛️ | **Suara** | Crossfade tanpa jeda, equalizer 5 band, visualizer spektrum. |
| 💾 | **Offline** | Simpan lagu ke disk (pakai ffmpeg), putar tanpa internet. |
| 🎙️ | **Podcast** | Langganan feed RSS dan putar episodenya. |
| 📊 | **Svara Recap** | Statistik dengerin 7 hari, 30 hari, atau sepanjang masa: menit, top lagu, artis, hari beruntun. |
| 📸 | **Kartu story** | Bagikan kartu 1080×1920 lagu yang lagi diputar (plus potongan lirik) atau Recap kamu. Di macOS pakai share sheet bawaan. |
| 🪟 | **Mini player** | Player melayang (picture-in-picture) dan timer tidur. |
| 🌗 | **Tema** | Terang dan gelap, ngikutin sistem. |
| ⌨️ | **Keyboard** | Shortcut lengkap (tekan <kbd>?</kbd> di app). |

### 🛠️ Build sendiri

Jalanin di browser (OS apa aja yang ada Python 3.9+, `yt-dlp`, dan `ffmpeg`):

```sh
python3 server.py          # terus buka http://localhost:5560
```

Bikin app-nya (dari Mac):

```sh
./build-mac.sh             # → dist/Svara.app + dist/Svara-<versi>.dmg (sekalian dipasang ke ~/Applications)
./build-windows.sh         # → dist-windows/Svara.exe + dist-windows/Svara-Setup-<versi>.exe
```

`build-mac.sh` butuh Xcode command line tools dan Pillow (`pip3 install pillow`).
`build-windows.sh` di-cross-compile dari macOS, butuh `go`, `uv`, `makensis`, dan Pillow (`brew install go uv makensis`).

---

<div align="center">

**MIT License** · Svara is not affiliated with YouTube or Google. For personal use.
<br>
*Svara nggak ada hubungannya sama YouTube atau Google. Buat dipakai pribadi.*

</div>
