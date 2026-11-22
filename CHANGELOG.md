# Changelog

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
