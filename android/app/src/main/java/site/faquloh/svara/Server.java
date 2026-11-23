package site.faquloh.svara;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.res.AssetManager;
import android.os.Environment;
import android.util.Log;

import com.chaquo.python.PyException;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** server.py Svara, jalan di thread sendiri di dalam proses app (satu kali per proses). */
final class Server {
    static final int PORT = 5560;
    static final String HOME = "http://127.0.0.1:" + PORT + "/";
    private static final String TAG = "Svara";

    private static Thread thread;
    static volatile String error;
    static String saveDir = "";

    private Server() {}

    static synchronized void start(Context ctx) {
        if (thread != null) return;
        Context app = ctx.getApplicationContext();
        thread = new Thread(() -> run(app), "svara-server");
        thread.setDaemon(true);
        thread.start();
    }

    private static void run(Context ctx) {
        try {
            File web = new File(ctx.getFilesDir(), "web");
            syncAssets(ctx, web);
            File cache = new File(ctx.getCacheDir(), "svara");
            File save = musicDir(ctx);
            saveDir = save.getAbsolutePath();
            File index = new File(ctx.getFilesDir(), "saved.json");
            if (!Python.isStarted()) Python.start(new AndroidPlatform(ctx));
            Python.getInstance().getModule("svara_android").callAttr("start",
                    web.getAbsolutePath(), cache.getAbsolutePath(), save.getAbsolutePath(), index.getAbsolutePath(), PORT);
            error = "server berhenti";
        } catch (PyException e) {
            Log.e(TAG, "server.py error", e);
            error = e.getMessage();
        } catch (Throwable e) {
            Log.e(TAG, "server gagal nyala", e);
            error = String.valueOf(e);
        }
    }

    /** Folder Musik publik (keliatan di app musik lain); kalau nggak bisa ditulis, folder musik milik app. */
    private static File musicDir(Context ctx) {
        File pub = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC), "Svara");
        // Android 11+: file audio boleh ditulis langsung ke Music/; Android 10 ke bawah butuh izin penyimpanan
        try {
            pub.mkdirs();
            File probe = new File(pub, ".svara-probe.m4a");
            if (probe.exists() || probe.createNewFile()) {
                probe.delete();
                return pub;
            }
        } catch (Exception ignored) {
        }
        File priv = new File(ctx.getExternalFilesDir(Environment.DIRECTORY_MUSIC), "Svara");
        priv.mkdirs();
        return priv;
    }

    /** Salin assets/web ke penyimpanan app, cuma kalau app-nya baru dipasang/diupdate. */
    private static void syncAssets(Context ctx, File web) throws Exception {
        PackageInfo pi = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
        String stamp = pi.versionName + "/" + pi.lastUpdateTime;
        SharedPreferences prefs = ctx.getSharedPreferences("svara", Context.MODE_PRIVATE);
        if (stamp.equals(prefs.getString("web", null)) && new File(web, "server.py").exists()) return;
        deleteTree(web);
        copyAssetDir(ctx.getAssets(), "web", web);
        prefs.edit().putString("web", stamp).apply();
    }

    private static void copyAssetDir(AssetManager am, String path, File dest) throws IOException {
        String[] kids = am.list(path);
        if (kids == null || kids.length == 0) {
            dest.getParentFile().mkdirs();
            try (InputStream in = am.open(path); OutputStream out = new FileOutputStream(dest)) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            return;
        }
        dest.mkdirs();
        for (String k : kids) copyAssetDir(am, path + "/" + k, new File(dest, k));
    }

    private static void deleteTree(File f) {
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteTree(k);
        f.delete();
    }

    /** true kalau server udah jawab /api/yt/ping. */
    static boolean ready() {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(HOME + "api/yt/ping").openConnection();
            c.setConnectTimeout(800);
            c.setReadTimeout(3000);
            int code = c.getResponseCode();
            c.disconnect();
            return code == 200;
        } catch (IOException e) {
            return false;
        }
    }
}
