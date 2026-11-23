package site.faquloh.svara;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.Collections;

public class MainActivity extends Activity {
    private static final String BG = "#0b0b0f";
    private WebView web;
    private FrameLayout root;
    private String barColor = BG;
    private boolean clearHistory = true;
    private java.util.function.Consumer<String> sink;
    private final Handler main = new Handler(Looper.getMainLooper());

    /** Disuntik sebelum app.js jalan: Media Session + jembatan share versi Android. */
    private static final String SHIM = "(function(){\n" +
            "if (window.__svaraAndroid || !window.SvaraAndroid) return; window.__svaraAndroid = 1;\n" +
            "const B = window.SvaraAndroid, H = {};\n" +
            "let md = null, st = 'none', lp = null;\n" +
            "const push = () => { try { const a = md && md.artwork && md.artwork[0] ? md.artwork[0].src : '';\n" +
            "  B.media(md ? String(md.title || '') : '', md ? String(md.artist || '') : '', a, st === 'playing'); } catch (e) {} };\n" +
            "if (!window.MediaMetadata) window.MediaMetadata = class { constructor(i) { Object.assign(this, { title: '', artist: '', album: '', artwork: [] }, i || {}); } };\n" +
            "let ms = navigator.mediaSession;\n" +
            "if (!ms) { ms = {}; Object.defineProperty(navigator, 'mediaSession', { value: ms, configurable: true }); }\n" +
            "const set0 = ms.setActionHandler ? ms.setActionHandler.bind(ms) : null;\n" +
            "const pos0 = ms.setPositionState ? ms.setPositionState.bind(ms) : null;\n" +
            "ms.setActionHandler = (a, f) => { H[a] = f; try { set0 && set0(a, f); } catch (e) {} };\n" +
            // Posisi dikirim ke notifikasi cuma kalau berubah beneran (seek, ganti lagu, play/pause),
            // bukan tiap timeupdate: sistem udah ngitung majunya sendiri dari kecepatan putar
            "ms.setPositionState = (s) => { try { pos0 && pos0(s); } catch (e) {}\n" +
            "  try { if (!s || !(s.duration > 0)) return; const now = Date.now(), r = s.playbackRate || 1;\n" +
            "    const exp = lp ? lp.p + (lp.st === 'playing' ? (now - lp.at) / 1000 * lp.r : 0) : -9;\n" +
            "    if (lp && lp.d === s.duration && lp.r === r && lp.st === st && Math.abs(exp - s.position) < 1.5) return;\n" +
            "    lp = { d: s.duration, p: s.position, r: r, at: now, st: st }; B.position(s.duration, s.position, r); } catch (e) {} };\n" +
            "Object.defineProperty(ms, 'metadata', { get: () => md, set: (v) => { md = v; push(); }, configurable: true });\n" +
            "Object.defineProperty(ms, 'playbackState', { get: () => st, set: (v) => { st = v; push(); }, configurable: true });\n" +
            "window.__svaraMedia = (a, t) => { const f = H[a] || (a === 'pause' && H.play); if (f) f({ action: a, seekTime: t }); };\n" +
            "window.webkit = window.webkit || {}; window.webkit.messageHandlers = window.webkit.messageHandlers || {};\n" +
            "window.webkit.messageHandlers.svaraShare = { postMessage: (m) => new Promise((res, rej) => {\n" +
            "  const r = B.share(JSON.stringify(m)); if (String(r).startsWith('error:')) rej(new Error(r.slice(6))); else res(r); }) };\n" +
            "const tc = () => { const m = document.querySelector('meta[name=theme-color]'); if (m) try { B.theme(m.content); } catch (e) {} };\n" +
            "document.addEventListener('DOMContentLoaded', () => { tc(); const m = document.querySelector('meta[name=theme-color]');\n" +
            "  if (m) new MutationObserver(tc).observe(m, { attributes: true }); });\n" +
            "})();";

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);

        root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets i = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                    | WindowInsetsCompat.Type.ime());
            v.setPadding(i.left, i.top, i.right, i.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
        applyBarColors();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + " SvaraAndroid/" + BuildConfig.VERSION_NAME);
        if (Build.VERSION.SDK_INT >= 29 && WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            androidx.webkit.WebSettingsCompat.setAlgorithmicDarkeningAllowed(s, false);
        }
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);

        web.addJavascriptInterface(new Bridge(), "SvaraAndroid");
        boolean docStart = WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT);
        if (docStart) {
            WebViewCompat.addDocumentStartJavaScript(web, SHIM, Collections.singleton("http://127.0.0.1:" + Server.PORT));
        }
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("127.0.0.1".equals(u.getHost()) || "localhost".equals(u.getHost())) return false;
                // Link keluar (artis, sumber lirik, dll.) dibuka di browser
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                if (!docStart && url.startsWith(Server.HOME)) view.evaluateJavascript(SHIM, null);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                // Halaman "Lagi nyiapin Svara…" jangan ada di riwayat, biar back nggak balik ke situ
                if (clearHistory && url.startsWith(Server.HOME)) {
                    clearHistory = false;
                    view.clearHistory();
                }
            }

            @Override
            public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
                // Renderer WebView mati (kehabisan RAM dll.): jangan ikut force close, bikin ulang aja
                if (view == web) {
                    root.removeView(web);
                    web.destroy();
                    web = null;
                    main.post(MainActivity.this::recreate);
                }
                return true;
            }
        });

        PlaybackService.sink = sink = (a) -> main.post(() -> {
            if (web == null) return;
            String js;
            if (a.startsWith("seekto:")) {
                js = "window.__svaraMedia && window.__svaraMedia('seekto', " + Double.parseDouble(a.substring(7)) + ")";
            } else {
                js = "window.__svaraMedia && window.__svaraMedia(" + JSONObject.quote(a) + ")";
            }
            web.evaluateJavascript(js, null);
        });
        registerBack();

        askPermissions();
        PlaybackService.start(this);
        Server.start(this);

        web.loadDataWithBaseURL(null, page("<div style=\"text-align:center\"><div style=\"width:22px;height:22px;margin:0 auto 14px;" +
                "border-radius:50%;border:3px solid #26262f;border-top-color:#ffc94a;animation:b .8s linear infinite\"></div>" +
                "Lagi nyiapin Svara…</div><style>@keyframes b{to{transform:rotate(360deg)}}</style>"), "text/html", "utf-8", null);
        waitForServer();
    }

    private void waitForServer() {
        long end = System.currentTimeMillis() + 120_000;
        new Thread(() -> {
            while (System.currentTimeMillis() < end) {
                if (Server.ready()) {
                    main.post(() -> {
                        web.loadUrl(Server.HOME);
                    });
                    return;
                }
                if (Server.error != null) break;
                try {
                    Thread.sleep(250);
                } catch (InterruptedException e) {
                    return;
                }
            }
            String err = Server.error != null ? Server.error : "server nggak jawab";
            main.post(() -> web.loadDataWithBaseURL(null, page("<div style=\"max-width:440px;padding:24px;text-align:center;line-height:1.5\">" +
                    "<b style=\"font-size:18px;color:#efedf5\">Svara gagal nyala</b><p>" + android.text.Html.escapeHtml(err) +
                    "</p></div>"), "text/html", "utf-8", null));
        }, "svara-wait").start();
    }

    private static String page(String body) {
        return "<!doctype html><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\">" +
                "<body style=\"margin:0;height:100vh;display:grid;place-items:center;background:" + BG +
                ";color:#a29fb2;font:16px system-ui,sans-serif\">" + body;
    }

    private void askPermissions() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        } else if (Build.VERSION.SDK_INT >= 23 && Build.VERSION.SDK_INT <= 29
                && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 2);
        }
    }

    /** Warna latar di balik status bar/nav bar ngikutin tema app (meta theme-color dari app.js). */
    private void applyBarColors() {
        int c = Color.parseColor(barColor);
        root.setBackgroundColor(c);
        web.setBackgroundColor(c);
        boolean light = (Color.red(c) * 299 + Color.green(c) * 587 + Color.blue(c) * 114) / 1000 > 140;
        View decor = getWindow().getDecorView();
        WindowCompat.getInsetsController(getWindow(), decor).setAppearanceLightStatusBars(light);
        WindowCompat.getInsetsController(getWindow(), decor).setAppearanceLightNavigationBars(light);
    }

    /**
     * Android 13+ pakai OnBackInvokedCallback; app yang target API 36 nggak dapet onBackPressed lagi
     * di Android 16, jadi tanpa ini tombol back langsung keluar dari app.
     */
    private void registerBack() {
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBack);
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        goBack();
    }

    /** Urutan: tutup dialog/menu/layar penuh di app.js → halaman sebelumnya → pindah ke belakang. */
    private void goBack() {
        if (web == null) {
            moveTaskToBack(true);
            return;
        }
        web.evaluateJavascript("window.__svaraBack ? window.__svaraBack() : false", (r) -> {
            if ("true".equals(r) || web == null) return;
            if (web.canGoBack()) web.goBack();
            // Jangan matiin musik: cukup pindah ke belakang kayak app musik lain
            else moveTaskToBack(true);
        });
    }

    @Override
    protected void onDestroy() {
        // Activity baru (habis recreate) bisa udah masang sink-nya duluan: jangan dihapus
        if (PlaybackService.sink == sink) PlaybackService.sink = null;
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    /** Dipanggil dari JS lewat window.SvaraAndroid. */
    private final class Bridge {
        @JavascriptInterface
        public void media(String title, String artist, String art, boolean playing) {
            PlaybackService.update(title, artist, art, playing);
        }

        @JavascriptInterface
        public void position(double duration, double position, double rate) {
            PlaybackService.position(duration, position, rate);
        }

        @JavascriptInterface
        public void theme(String color) {
            if (color == null || !color.matches("#[0-9a-fA-F]{6}")) return;
            main.post(() -> {
                barColor = color;
                if (web != null) applyBarColors();
            });
        }

        /** Kartu share: {action: share|save|copy, name, data: base64 PNG}. Balikannya status atau "error:...". */
        @JavascriptInterface
        public String share(String json) {
            try {
                JSONObject m = new JSONObject(json);
                String action = m.optString("action");
                String name = m.optString("name", "svara.png").replace('/', '-');
                if (!name.toLowerCase().endsWith(".png")) name += ".png";
                byte[] png = Base64.decode(m.getString("data"), Base64.DEFAULT);
                switch (action) {
                    case "save":
                        savePicture(name, png);
                        return "saved";
                    case "copy": {
                        Uri uri = shareFile(name, png);
                        ClipboardManager cb = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                        main.post(() -> cb.setPrimaryClip(ClipData.newUri(getContentResolver(), "Svara", uri)));
                        return "copied";
                    }
                    case "share": {
                        Uri uri = shareFile(name, png);
                        Intent send = new Intent(Intent.ACTION_SEND).setType("image/png")
                                .putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        send.setClipData(ClipData.newRawUri("Svara", uri));
                        main.post(() -> startActivity(Intent.createChooser(send, "Bagikan")));
                        return "shown";
                    }
                    default:
                        return "error:aksi nggak dikenal";
                }
            } catch (Exception e) {
                return "error:" + e.getMessage();
            }
        }
    }

    private Uri shareFile(String name, byte[] png) throws Exception {
        File dir = new File(getCacheDir(), "share");
        dir.mkdirs();
        File f = new File(dir, name);
        try (OutputStream out = new FileOutputStream(f)) {
            out.write(png);
        }
        return FileProvider.getUriForFile(this, getPackageName() + ".files", f);
    }

    private void savePicture(String name, byte[] png) throws Exception {
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Images.Media.DISPLAY_NAME, name);
            v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Svara");
            Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new Exception("galeri nggak bisa ditulis");
            try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                out.write(png);
            }
        } else {
            File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "Svara");
            dir.mkdirs();
            File f = new File(dir, name);
            try (OutputStream out = new FileOutputStream(f)) {
                out.write(png);
            }
            sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, Uri.fromFile(f)));
        }
    }
}
