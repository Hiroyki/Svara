# Contributing to Svara

Thanks for wanting to make Svara better! Bug reports, ideas and pull requests are all welcome.

## 🐛 Reporting a bug

Open a [bug report](https://github.com/Hiroyki/Svara/issues/new?template=bug_report.yml) and include:

- your platform (Windows 10/11, macOS Apple Silicon or Intel) and Svara version
- what you did, what you expected, and what happened
- the end of the log if you can:
  - macOS: `~/Library/Logs/Svara.log`
  - Windows: `%LOCALAPPDATA%\Senandung\senandung.log`

## 💡 Suggesting a feature

Open a [feature request](https://github.com/Hiroyki/Svara/issues/new?template=feature_request.yml) and tell us how you'd use it.

## 🛠️ Working on the code

The interface is plain HTML, CSS and JavaScript (no framework, no build step), served by a small Python server that talks to yt-dlp.

For quick iteration, run the server directly. You need Python 3.9+, plus `yt-dlp`, `ffmpeg` and `deno` on your `PATH`:

```sh
python3 server.py
# then open http://localhost:5560 in a browser
```

Edit `app.js`, `style.css` or `index.html` and reload the page.

| Path | What |
| --- | --- |
| `index.html` · `app.js` · `style.css` | The interface |
| `db.js` | IndexedDB storage for the library, history and queue |
| `server.py` · `ytworker.py` | Local server and always-warm yt-dlp workers |
| `mac/main.swift` | macOS app (Swift + WKWebView) |
| `windows/` | Windows app (Go + WebView2) and the NSIS installer |

To build the installers (from a Mac):

```sh
./build-mac.sh       # → dist/Svara-<version>.dmg
./build-windows.sh   # → dist-windows/Svara-Setup-<version>.exe
```

You'll need the Xcode command line tools, `brew install uv go makensis` and Pillow (`pip3 install pillow`).

## ✅ Pull requests

- Keep each PR focused on one thing, and describe what changed and why.
- Check both light and dark themes if you touch the interface.
- The [Build](https://github.com/Hiroyki/Svara/actions/workflows/ci.yml) workflow must pass.
