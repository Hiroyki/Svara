<div align="center">

<pre>
███████╗██╗   ██╗ █████╗ ██████╗  █████╗ 
██╔════╝██║   ██║██╔══██╗██╔══██╗██╔══██╗
███████╗██║   ██║███████║██████╔╝███████║
╚════██║╚██╗ ██╔╝██╔══██║██╔══██╗██╔══██║
███████║ ╚████╔╝ ██║  ██║██║  ██║██║  ██║
╚══════╝  ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
</pre>

### *A music player for the* **catalogue**

<pre>
┌─────────────────────────────────────────────────────────────────────┐
│   Dark bento interface.  Real catalog data.  No clutter.            │
│   Browse · Search · Albums · Artists · Playlists · Radio · Lyrics   │
└─────────────────────────────────────────────────────────────────────┘
</pre>

[![License: MIT](https://img.shields.io/badge/License-MIT-3ddc6b.svg?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-c2f25c.svg?style=for-the-badge)]()
[![Platform](https://img.shields.io/badge/platform-web_·_windows_·_android-3ddc6b.svg?style=for-the-badge)]()
[![Next.js](https://img.shields.io/badge/Next.js-16-000000.svg?style=for-the-badge&logo=nextdotjs)]()
[![Electron](https://img.shields.io/badge/Electron-45-2b2e3a.svg?style=for-the-badge&logo=electron)]()
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119eff.svg?style=for-the-badge&logo=capacitor)]()

<br>

**[🇺🇸 English](#-english)** &nbsp;·&nbsp; **[🇮🇩 Bahasa Indonesia](#-bahasa-indonesia)**

<br>

<pre>
EVERY SURFACE, ONE CODEBASE                               
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    
 Web            ·  npm run dev                            
 Windows        ·  Electron shell + Next standalone server
 Android        ·  Capacitor shell + static export        
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    
</pre>

</div>

---

<br>

## 🇺🇸 English

### What is Svara?

**Svara** is an ad-light music player for the **catalogue**. It browses the real catalogue — charts, new releases, genres and moods, albums, artists, playlists, radio and synced lyrics — inside a hand-built dark **bento** interface where the artwork carries the colour and green means "this is on".

It is not a downloader and not a store. It is a player: one Zustand store owns the queue, playback talks to a hidden embed player, and the UI never touches either directly.

> **Svara is one codebase that ships to the browser, Windows, and Android.**

<br>

### ✨ Features

| | Feature | What it does |
| --- | --- | --- |
| 🏠 | **Explore** | Hero carousel (5 slides, 7s each), charts, new releases, moods and genres. |
| 🔍 | **Search** | Instant suggestions while typing, then songs, albums, artists and playlists. |
| 💿 | **Collections** | Album, artist and playlist pages with full track tables and playback. |
| 📻 | **Radio / Autoplay** | "Next" queue built from the catalogue's radio endpoint; keeps playing when the queue ends. |
| 📝 | **Lyrics** | Timed lyrics synced to the player clock. |
| ❤️ | **Library** | Likes, recents and your own local playlists, persisted to `localStorage`. |
| 🎛️ | **Player** | Queue, shuffle, repeat, seek, volume, marquee titles, Now Playing overlay. |
| ⌨️ | **Keyboard-first** | Full shortcut set, no mouse required. |
| 🪟 | **Desktop shell** | Electron window with a splash intro, dark title bar and a bundled local server. |
| 🤖 | **Android app** | Capacitor app with native HTTP, keeps playing with the screen off, media notification and lock-screen / headset controls, back button that never kills the music. |

<br>

### 🔧 How it works

| Layer | Where | What |
| --- | --- | --- |
| **Data** | `src/lib/yt.ts` | An in-house client talks to the catalogue's internal API. Responses are normalised into small `Track` / `Card` / `Section` types and cached in memory. |
| **API** | `src/app/api/*` | `home`, `search`, `suggest`, `album/[id]`, `playlist/[id]`, `artist/[id]`, `next/[id]` (radio), `lyrics/[id]`, `img`. |
| **State** | `src/lib/player.ts` | Zustand store: queue, shuffle, repeat, autoplay radio, likes, recents and local playlists. Likes, recents and playlists are saved to `localStorage`. |
| **Playback** | `src/components/Engine.tsx` | A hidden embed player. The UI talks only to the store, so this engine can be replaced without touching the UI. |
| **Design** | `docs/design-system.md` | Tokens, type scale, shape, motion and component rules. |

The three build targets are chosen by `SVARA_TARGET` in `next.config.ts`:

| Target | Output | Used by |
| --- | --- | --- |
| `web` *(default)* | Normal Next.js server | Browser / hosting |
| `desktop` | `output: "standalone"` server | Electron bundles it and starts it on a free port |
| `android` | `output: "export"` static site | Capacitor; `fetch` goes through native HTTP |

<br>

### 🚀 Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

The catalogue's API often blocks requests from datacenter IPs, so run Svara locally — a hosted deploy may stop returning data.

<br>

### 📦 Build for Windows

```bash
npm run desktop:build
```

This builds the desktop Next standalone server, stages the Electron shell in `.desktop-app/`, and runs `electron-builder`. The installer lands at:

```
dist/Svara-Setup-1.0.0.exe
```

An NSIS-assisted installer: per-user, allows a custom install directory, creates desktop and Start Menu shortcuts, and launches Svara when finished.

```bash
npm run desktop:dev   # build + run the Electron app without packaging
```

<br>

### 🤖 Build for Android

Requires JDK 21 and the Android SDK with platform 36 (`JAVA_HOME` and `ANDROID_HOME` set). Then:

```bash
npm run android:sync                 # static export + cap sync
cd android && ./gradlew assembleDebug
# APK → android/app/build/outputs/apk/debug/app-debug.apk
```

For a release build, add a signing config in `android/app/build.gradle`, then:

```bash
cd android && ./gradlew assembleRelease   # or bundleRelease for an .aab
```

<br>

### ⌨️ Keyboard

| Key | Action | Key | Action |
| --- | --- | --- | --- |
| `Space` | Play / pause | `M` | Mute |
| `←` / `→` | Seek 5s | `L` | Like |
| `Shift+←` / `Shift+→` | Previous / next | `S` | Shuffle |
| `↑` / `↓` | Volume | `R` | Repeat |
| `F` | Open Now Playing | `/` | Search |
| `Esc` | Close | | |

<br>

### 🧱 Tech stack

| | |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 (tokens in `src/app/globals.css`) |
| Motion | `motion` (Framer Motion) |
| State | Zustand 5 |
| Data | In-house catalogue client |
| Desktop | Electron 45 + electron-builder 26 |
| Mobile | Capacitor 8 (Android) |
| Icons | lucide-react |

<br>

### 🗂️ Repository structure

```
Svara/
├── src/
│   ├── app/                 Next.js App Router
│   │   ├── api/             home · search · suggest · album · playlist · artist · next · lyrics · img
│   │   └── ...              album · artist · charts · library · liked · playlist · recent · search
│   ├── components/          Shell, Sidebar, TopBar, PlayerBar, NowPlaying, Lyrics, Engine, …
│   └── lib/                 yt (data) · player (store) · format · art · color · localApi · http · runtime
│
├── electron/                main.cjs (window + server) · splash.html
├── scripts/                 prepare-desktop.mjs · after-pack.cjs
├── build/                   icon.ico · installer art · installer.nsh
├── android/                 Capacitor Android project
├── docs/                    design-system.md
├── capacitor.config.ts      Android shell config
├── next.config.ts           SVARA_TARGET: web · desktop · android
└── package.json             scripts + electron-builder config
```

<br>

### 📄 License

MIT © 2026 MrColdZs. See [LICENSE](LICENSE).

---

<br>

## 🇮🇩 Bahasa Indonesia

### Apa itu Svara?

**Svara** adalah pemutar musik minim iklan untuk **katalog musik**. Aplikasi ini menjelajah katalog aslinya — tangga lagu, rilis baru, genre dan mood, album, artis, playlist, radio, hingga lirik — di dalam antarmuka **bento** gelap yang dibuat khusus, tempat sampul lagu yang membawa warna dan hijau berarti "sedang aktif".

Ini bukan pengunduh dan bukan toko. Ini pemutar: satu store Zustand memegang antrean, pemutaran bicara ke embed player tersembunyi, dan UI tidak pernah menyentuh keduanya secara langsung.

> **Svara adalah satu basis kode yang dikirim ke browser, Windows, dan Android.**

<br>

### ✨ Fitur

| | Fitur | Kegunaan |
| --- | --- | --- |
| 🏠 | **Explore** | Carousel hero (5 slide, 7 detik), tangga lagu, rilis baru, mood dan genre. |
| 🔍 | **Pencarian** | Saran instan saat mengetik, lalu lagu, album, artis, dan playlist. |
| 💿 | **Koleksi** | Halaman album, artis, dan playlist dengan tabel lagu lengkap dan pemutaran. |
| 📻 | **Radio / Autoplay** | Antrean "Berikutnya" dari endpoint radio katalog; terus berputar saat antrean habis. |
| 📝 | **Lirik** | Lirik berwaktu yang tersinkron dengan jam pemutar. |
| ❤️ | **Pustaka** | Suka, riwayat, dan playlist lokal, disimpan di `localStorage`. |
| 🎛️ | **Pemutar** | Antrean, acak, ulang, geser, volume, judul berjalan, overlay Now Playing. |
| ⌨️ | **Utamakan keyboard** | Set pintasan lengkap, tanpa perlu mouse. |
| 🪟 | **Shell desktop** | Jendela Electron dengan intro splash, title bar gelap, dan server lokal yang dibundel. |
| 🤖 | **Aplikasi Android** | Aplikasi Capacitor dengan HTTP native, tetap berputar saat layar mati, notifikasi media dan kontrol lock screen / headset, tombol Back yang tidak mematikan musik. |

<br>

### 🔧 Cara kerjanya

| Lapisan | Lokasi | Peran |
| --- | --- | --- |
| **Data** | `src/lib/yt.ts` | Klien internal berbicara ke API internal katalog. Respons dinormalkan menjadi tipe `Track` / `Card` / `Section` yang ringkas dan di-cache di memori. |
| **API** | `src/app/api/*` | `home`, `search`, `suggest`, `album/[id]`, `playlist/[id]`, `artist/[id]`, `next/[id]` (radio), `lyrics/[id]`, `img`. |
| **State** | `src/lib/player.ts` | Store Zustand: antrean, acak, ulang, radio autoplay, suka, riwayat, dan playlist lokal. Suka, riwayat, dan playlist disimpan di `localStorage`. |
| **Pemutaran** | `src/components/Engine.tsx` | Embed player tersembunyi. UI hanya bicara ke store, jadi mesin ini bisa diganti tanpa menyentuh UI. |
| **Desain** | `docs/design-system.md` | Token, skala tipografi, bentuk, gerak, dan aturan komponen. |

Tiga target build dipilih lewat `SVARA_TARGET` di `next.config.ts`:

| Target | Output | Dipakai oleh |
| --- | --- | --- |
| `web` *(default)* | Server Next.js biasa | Browser / hosting |
| `desktop` | Server `output: "standalone"` | Electron membundel lalu menjalankannya di port bebas |
| `android` | Situs statis `output: "export"` | Capacitor; `fetch` lewat HTTP native |

<br>

### 🚀 Menjalankan

```bash
npm install
npm run dev          # http://localhost:3000
```

API katalog sering memblokir permintaan dari IP pusat data, jadi jalankan Svara secara lokal — deploy yang di-hosting bisa berhenti mengembalikan data.

<br>

### 📦 Build untuk Windows

```bash
npm run desktop:build
```

Perintah ini membangun server standalone Next desktop, menyiapkan shell Electron di `.desktop-app/`, lalu menjalankan `electron-builder`. Installer muncul di:

```
dist/Svara-Setup-1.0.0.exe
```

Installer berbantuan NSIS: per-pengguna, boleh memilih folder instalasi, membuat pintasan Desktop dan Start Menu, dan menjalankan Svara setelah selesai.

```bash
npm run desktop:dev   # build + jalankan aplikasi Electron tanpa dipaketkan
```

<br>

### 🤖 Build untuk Android

Butuh JDK 21 dan Android SDK dengan platform 36 (`JAVA_HOME` dan `ANDROID_HOME` diatur). Lalu:

```bash
npm run android:sync                 # static export + cap sync
cd android && ./gradlew assembleDebug
# APK → android/app/build/outputs/apk/debug/app-debug.apk
```

Untuk build rilis, tambahkan konfigurasi signing di `android/app/build.gradle`, lalu:

```bash
cd android && ./gradlew assembleRelease   # atau bundleRelease untuk .aab
```

<br>

### ⌨️ Pintasan keyboard

| Tombol | Aksi | Tombol | Aksi |
| --- | --- | --- | --- |
| `Space` | Putar / jeda | `M` | Bisukan |
| `←` / `→` | Geser 5s | `L` | Suka |
| `Shift+←` / `Shift+→` | Sebelumnya / berikutnya | `S` | Acak |
| `↑` / `↓` | Volume | `R` | Ulang |
| `F` | Buka Now Playing | `/` | Cari |
| `Esc` | Tutup | | |

<br>

### 🧱 Teknologi

| | |
| --- | --- |
| Kerangka | Next.js 16 (App Router, Turbopack), React 19 |
| Bahasa | TypeScript |
| Styling | Tailwind CSS 4 (token di `src/app/globals.css`) |
| Gerak | `motion` (Framer Motion) |
| State | Zustand 5 |
| Data | Klien katalog internal |
| Desktop | Electron 45 + electron-builder 26 |
| Mobile | Capacitor 8 (Android) |
| Ikon | lucide-react |

<br>

### 🗂️ Struktur repositori

```
Svara/
├── src/
│   ├── app/                 Next.js App Router
│   │   ├── api/             home · search · suggest · album · playlist · artist · next · lyrics · img
│   │   └── ...              album · artist · charts · library · liked · playlist · recent · search
│   ├── components/          Shell, Sidebar, TopBar, PlayerBar, NowPlaying, Lyrics, Engine, …
│   └── lib/                 yt (data) · player (store) · format · art · color · localApi · http · runtime
│
├── electron/                main.cjs (jendela + server) · splash.html
├── scripts/                 prepare-desktop.mjs · after-pack.cjs
├── build/                   icon.ico · art installer · installer.nsh
├── android/                 Proyek Capacitor Android
├── docs/                    design-system.md
├── capacitor.config.ts      Konfigurasi shell Android
├── next.config.ts           SVARA_TARGET: web · desktop · android
└── package.json             skrip + konfigurasi electron-builder
```

<br>

### 📄 Lisensi

MIT © 2026 MrColdZs. Lihat [LICENSE](LICENSE).

<br>

---

<div align="center">

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   Music should play. Not autoplay, not track you across the web,    │
│   not bury itself under ads.                                        │
│                                                                     │
│   Svara keeps the catalogue and drops the noise.                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Svara** · MIT License © 2026 MrColdZs

[github.com/Hiroyki/Svara](https://github.com/Hiroyki/Svara)

*The artwork carries the colour. Green just means it's on.*

</div>
