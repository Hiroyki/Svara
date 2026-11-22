<div align="center">

<img src="assets/logo.png" width="104" alt="Svara logo">

<pre>
███████╗██╗   ██╗ █████╗ ██████╗  █████╗
██╔════╝██║   ██║██╔══██╗██╔══██╗██╔══██╗
███████╗██║   ██║███████║██████╔╝███████║
╚════██║╚██╗ ██╔╝██╔══██║██╔══██╗██╔══██║
███████║ ╚████╔╝ ██║  ██║██║  ██║██║  ██║
╚══════╝  ╚═══╝  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝
</pre>

### *Feel every note.*

**An ad-free desktop music player for the YouTube Music catalogue.**
<br>
Synced lyrics · crossfade · 5-band EQ · offline songs · podcasts · listening Recap

<br>

[![Release](https://img.shields.io/github/v/release/Hiroyki/Svara?style=for-the-badge&color=ffc94a&label=release)](https://github.com/Hiroyki/Svara/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/Hiroyki/Svara/total?style=for-the-badge&color=ff7a6b)](https://github.com/Hiroyki/Svara/releases)
[![Platform](https://img.shields.io/badge/platform-Windows_·_macOS-b69cff.svg?style=for-the-badge)](#-download)
[![License: MIT](https://img.shields.io/badge/License-MIT-3ddc6b.svg?style=for-the-badge)](LICENSE)

<br>

<a href="https://github.com/Hiroyki/Svara/releases/latest/download/Svara-Setup-2.0.0.exe"><img src="https://img.shields.io/badge/Download_for-Windows-0078d4?style=for-the-badge&logo=windows11&logoColor=white" height="42" alt="Download for Windows"></a>
&nbsp;&nbsp;
<a href="https://github.com/Hiroyki/Svara/releases/latest/download/Svara-2.0.0.dmg"><img src="https://img.shields.io/badge/Download_for-macOS-111111?style=for-the-badge&logo=apple&logoColor=white" height="42" alt="Download for macOS"></a>

<sub>Windows 10/11 64-bit · macOS 13+ (Apple Silicon & Intel) · nothing else to install</sub>

<br><br>

<img src="docs/screenshot.png" width="900" alt="Svara: home, queue and player">

<br>

| 🚫 **No ads** | 📝 **Karaoke lyrics** | 🎛️ **EQ + crossfade** | 💾 **Offline songs** | 🔒 **No account** |
| :---: | :---: | :---: | :---: | :---: |
| Just the music | Synced line by line | Gapless, 5-band | Saved to your disk | Everything stays local |

</div>

---

## 🎧 What is Svara?

**Svara** is a music player for your computer that plays the whole YouTube Music catalogue without ads. Charts, moods, albums, artists, playlists and endless radio mixes, with lyrics that light up as the song plays, a proper equalizer, crossfade between songs, podcasts, and songs you can save to listen offline.

There's no sign-up and no cloud: your library, playlists and listening history live on your own computer.

## 📥 Download

| | Platform | File | Size |
| :---: | --- | --- | --- |
| 🪟 | **Windows 10 / 11** (64-bit) | [**Svara-Setup-2.0.0.exe**](https://github.com/Hiroyki/Svara/releases/latest/download/Svara-Setup-2.0.0.exe) | ~100 MB |
| 🍎 | **macOS 13 Ventura or newer** (Apple Silicon & Intel) | [**Svara-2.0.0.dmg**](https://github.com/Hiroyki/Svara/releases/latest/download/Svara-2.0.0.dmg) | ~250 MB |

Both downloads are **all-in-one**: everything Svara needs (Python, yt-dlp, Deno and ffmpeg) is already inside. No Homebrew, no Terminal, no extra installs.

<details open>
<summary><b>🪟 Installing on Windows</b></summary>

<br>

1. Run **`Svara-Setup-2.0.0.exe`**.
2. Click **Next → Next → Install → Finish**. That's it.
3. Svara opens on its own (leave *Run Svara* ticked) and appears in the Start menu, plus a desktop shortcut if you want one.

- No admin rights needed: it installs for your user only.
- If SmartScreen shows *"Windows protected your PC"*, click **More info → Run anyway**. The installer just isn't code-signed yet.
- Uninstall from **Settings → Apps → Svara**. It asks whether to keep your library for a later reinstall.

</details>

<details open>
<summary><b>🍎 Installing on macOS</b></summary>

<br>

1. Open **`Svara-2.0.0.dmg`** and drag **Svara** onto **Applications**.
2. Open Svara from Applications.
3. The first time, macOS may say it can't verify the developer (Svara isn't notarised by Apple yet). Go to **System Settings → Privacy & Security**, scroll down and click **Open Anyway**. You only do this once.

- Closing the window keeps the music playing. Quit with **⌘Q**.
- Still blocked? Run this once in Terminal: `xattr -dr com.apple.quarantine /Applications/Svara.app`

</details>

## ✨ Features

<table>
<tr>
<td width="33%" valign="top">

### 🎧 Listen
- **Endless Up Next**: radio mixes from any song, with mood chips
- **Smart shuffle** slips in similar songs
- **Gapless crossfade** between tracks
- **5-band equalizer** and live spectrum visualizer
- **Karaoke lyrics**, synced line by line
- **Mini player** that floats over other windows
- **Sleep timer**

</td>
<td width="33%" valign="top">

### 🔍 Discover
- **Adaptive home**: daily mix, "continue listening", recommendations for your country
- **Mood cards**: Galau, Santai sore, Indie Indonesia, Lo-fi, Dangdut koplo, K-pop…
- **Search** songs, albums, artists, playlists and podcasts
- **Album, artist and playlist pages**
- **Podcasts**: subscribe and play episodes

</td>
<td width="33%" valign="top">

### 💛 Yours
- **Library**: liked songs, playlists, albums, artists
- **Save the queue** as a playlist in one click
- **Offline songs** saved to your Music folder
- **Svara Recap**: minutes listened, top songs and artists, streaks
- **Story cards** to share what you're playing
- **Light & dark** themes that follow your system

</td>
</tr>
</table>

## 📸 Story cards

Share what you're listening to as a 1080×1920 card, ready for Instagram or WhatsApp stories. The card takes its colours from the album art, adds the lyric line you're on, and shows how far into the song you are. On macOS it opens the native share sheet (AirDrop, Messages, Photos…); you can also save or copy the image.

<div align="center">
<img src="docs/story-1.jpg" width="260" alt="Story card example">
&nbsp;&nbsp;&nbsp;
<img src="docs/story-2.jpg" width="260" alt="Story card example">
</div>

## ⌨️ Keyboard shortcuts

| Key | Action | Key | Action |
| --- | --- | --- | --- |
| <kbd>Space</kbd> | Play / pause | <kbd>L</kbd> | Lyrics |
| <kbd>→</kbd> <kbd>←</kbd> | Seek ±10 s | <kbd>M</kbd> | Mute |
| <kbd>⇧</kbd> <kbd>→</kbd> <kbd>←</kbd> | Next / previous song | <kbd>E</kbd> | Sound & equalizer |
| <kbd>↑</kbd> <kbd>↓</kbd> | Volume | <kbd>P</kbd> | Mini player |
| <kbd>⌘K</kbd> / <kbd>/</kbd> | Search | <kbd>?</kbd> | All shortcuts |

## 🔒 Privacy

- **No account, no sign-in.** Svara never asks for your Google login.
- **No ads, no tracking, no analytics.**
- Your library, playlists, history and Recap are stored **only on your computer**.
- The app talks to a small server that runs **on your own machine**, which fetches the catalogue, lyrics and audio for you.

## ❓ FAQ

<details>
<summary><b>Is it free?</b></summary>
<br>
Yes. Svara is free and open source under the MIT license.
</details>

<details>
<summary><b>Do I need a YouTube or YouTube Music account?</b></summary>
<br>
No. Svara works without signing in to anything.
</details>

<details>
<summary><b>Where do saved (offline) songs go?</b></summary>
<br>
Into <code>Music/Senandung</code> in your home folder, as normal audio files you can also play elsewhere.
</details>

<details>
<summary><b>How do I update?</b></summary>
<br>
Download the newest installer from <a href="https://github.com/Hiroyki/Svara/releases">Releases</a> and install over the old one. Your library stays.
</details>

<details>
<summary><b>A song won't play. What now?</b></summary>
<br>
YouTube changes things from time to time; a newer Svara release usually fixes it. On macOS the log lives at <code>~/Library/Logs/Svara.log</code>, on Windows at <code>%LOCALAPPDATA%\Senandung\senandung.log</code>. Please attach it when you open an issue.
</details>

## 🔧 How it works

```
┌──────────────────── Svara app window ────────────────────┐
│   macOS: Swift + WKWebView     Windows: Go + WebView2    │
│   ┌──────────── interface (HTML · CSS · JS) ───────────┐ │
│   │  index.html · app.js · style.css · db.js (library) │ │
│   └─────────────────────────┬──────────────────────────┘ │
└─────────────────────────────┼────────────────────────────┘
                              │  127.0.0.1:5560 (your machine only)
              ┌───────────────┴───────────────┐
              │  server.py (bundled Python)   │──► yt-dlp + Deno  → catalogue & audio
              │  lyrics · images · podcasts   │──► ffmpeg         → offline songs
              └───────────────────────────────┘──► RSS            → podcasts
```

<details>
<summary><b>🛠️ Build it yourself</b></summary>

<br>

Both apps are built from a Mac:

```sh
./build-mac.sh       # → dist/Svara.app + dist/Svara-<version>.dmg
./build-windows.sh   # → dist-windows/Svara.exe + dist-windows/Svara-Setup-<version>.exe
```

You'll need the Xcode command line tools and `brew install uv go makensis`, plus Pillow (`pip3 install pillow`). The scripts download Python, yt-dlp, Deno and ffmpeg for each platform and pack them into the app.

| Path | What |
| --- | --- |
| `index.html` · `app.js` · `style.css` · `db.js` | The interface (no framework, no build step) |
| `server.py` · `ytworker.py` | Local server and always-warm yt-dlp workers |
| `mac/main.swift` | macOS app: window, menus, server lifecycle, native share sheet |
| `windows/` | Windows app (Go + WebView2) and the NSIS installer |

</details>

---

<div align="center">

<img src="assets/logo.png" width="40" alt="">

**Svara** · MIT License

<sub>Svara is not affiliated with YouTube or Google. For personal use.</sub>

</div>
