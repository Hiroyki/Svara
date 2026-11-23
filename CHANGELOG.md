# Changelog

## Unreleased

### Added
- Android app (Android 7.0+, arm64): the same interface in a WebView with the Python server running inside the app (Chaquopy). Background playback with a media notification and lock-screen, headset and Bluetooth controls; offline songs saved to Music/Svara; story cards through the Android share sheet.
- Linux packages for x86_64 and arm64: `.deb` and a portable `.tar.gz` with a no-sudo installer. Python, yt-dlp, Deno and ffmpeg are bundled; Svara opens in a WebKitGTK window, a Chromium app window, or your browser.
- `build-android.sh` and `build-linux.py`.
- Lite mode: turns off blur, backdrop filters, endless background animations and the spectrum analyser. On by default in the Android app and on devices with ≤4 GB RAM or ≤4 CPU cores; toggle it in the Sound panel.
- Android: seek bar in the media notification and on the lock screen; playback pauses when headphones are unplugged or Bluetooth disconnects.

### Changed
- `server.py` can run yt-dlp in-process (`PUTAR_INPROC=1`) and save offline songs without ffmpeg, writing tags and cover art with mutagen.
- The Linux cache lives in `~/.cache/svara`.
- Lighter server: 3 yt-dlp workers instead of 5 (2 on Android, one warmed a few seconds after startup), a search fully downloads only the top result (none on Android), a smaller in-memory song-start cache, and the old-cache duration fix runs once instead of on every launch. The Android audio cache is capped at 300 MB (`PUTAR_CACHE_MB`).
- The Android APK is arm64-only and shrunk with R8 (~20 MB instead of ~29 MB); the unused `yt-dlp-ejs` and `websockets` are no longer bundled. Pass `-Psvara.abis=arm64-v8a,x86_64` for an emulator build.

### Fixed
- Android: the back button closes dialogs, menus and the full-screen player first, and works on Android 16 (apps targeting API 36 no longer receive `onBackPressed`).
- Android: back no longer returns to the "Lagi nyiapin Svara…" loading screen.
- Android: cover art shows in the notification and on the lock screen (relative image URLs were ignored) and is downscaled to save memory.
- Android: the notification is rebuilt only when the song, cover or play state changes.
- Android: a crashed WebView renderer reloads the app instead of force-closing it.

## [2.0.0](https://github.com/Hiroyki/Svara/releases/tag/v2.0.0) · 2026-11-22

A complete rewrite: a lighter, faster desktop player with native apps for Windows and macOS.

### Added
- All-in-one installers: a Windows setup wizard (no admin needed) and a universal macOS DMG (Apple Silicon & Intel). Python, yt-dlp, Deno and ffmpeg are bundled.
- Adaptive home: daily mix, continue listening, mood cards and recommendations for your country.
- Endless Up Next radio mixes with mood chips, smart shuffle and saving the queue as a playlist.
- Gapless crossfade, a 5-band equalizer with presets and a spectrum visualizer.
- Karaoke lyrics, synced line by line, in a side panel or full screen.
- Svara Recap: minutes listened, top songs and artists, streaks.
- Story cards (1080×1920) for the current song or your Recap, with the native share sheet on macOS.
- Offline songs, podcasts, a floating mini player, a sleep timer, and light and dark themes.

### Changed
- New interface and new codebase: a vanilla JS interface on a local Python server, wrapped in Swift (macOS) and Go + WebView2 (Windows) apps.

## [1.0.0](https://github.com/Hiroyki/Svara/releases/tag/v1.0.0) · 2026-11-18

- First release (Next.js, Electron and Android).
