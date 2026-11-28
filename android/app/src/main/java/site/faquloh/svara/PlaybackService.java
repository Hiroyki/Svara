package site.faquloh.svara;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.support.v4.media.MediaBrowserCompat;
import android.support.v4.media.MediaDescriptionCompat;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import androidx.media.MediaBrowserServiceCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Foreground service: jaga proses (dan server.py) tetap hidup pas app di belakang/layar mati,
 * plus notifikasi pemutar + kontrol dari lock screen, headset, dan Bluetooth.
 * Audionya sendiri diputar WebView; tombol di sini cuma diteruskan ke handler mediaSession di app.js.
 *
 * Juga MediaBrowserService buat Android Auto: antrean diambil dari /api/remote/state (dikirim app.js),
 * dan milih lagu dari layar mobil dikirim balik lewat /api/remote/cmd (dibaca pollRemote di app.js).
 */
public class PlaybackService extends MediaBrowserServiceCompat {
    private static final String CHANNEL = "playback";
    private static final int NOTIF_ID = 1;
    private static final int ART_PX = 512;
    static final String ACTION_MEDIA = "site.faquloh.svara.MEDIA";
    private static final String ROOT = "root";
    private static final String OPEN = "open";

    /** Penerus aksi ke WebView (play, pause, nexttrack, previoustrack, seekto:&lt;detik&gt;); diisi MainActivity. */
    static volatile Consumer<String> sink;
    private static PlaybackService instance;

    private MediaSessionCompat session;
    private final Handler main = new Handler(Looper.getMainLooper());
    private String title = "Svara", artist = "", art = "";
    private boolean playing;
    private Bitmap artBitmap;
    private String artLoaded = "";
    private long durationMs, positionMs;
    private float rate = 1f;
    private long positionAt = SystemClock.elapsedRealtime();
    /** Isi notifikasi terakhir yang dipasang, biar nggak dibikin ulang kalau nggak ada yang berubah. */
    private String shown = "";
    /** Antrean versi mobil (Android Auto); diambil dari server lokal di thread io. */
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private long activeQi = MediaSessionCompat.QueueItem.UNKNOWN_ID;
    private final Runnable carRefresh = this::refreshCarQueue;

    /** Headset dicabut / Bluetooth putus: jeda, jangan tiba-tiba bunyi dari speaker HP. */
    private final BroadcastReceiver noisy = new BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent i) {
            if (playing) send("pause");
        }
    };

    static void start(Context ctx) {
        Intent i = new Intent(ctx, PlaybackService.class);
        if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i);
        else ctx.startService(i);
    }

    /** Dipanggil dari JS (thread JavaBridge) tiap metadata / status putar berubah. */
    static void update(String t, String a, String artUrl, boolean isPlaying) {
        PlaybackService s = instance;
        if (s == null) return;
        s.main.post(() -> {
            String nt = t == null || t.isEmpty() ? "Svara" : t;
            if (!nt.equals(s.title)) s.durationMs = 0; // lagu baru: durasi lama jangan kebawa
            s.title = nt;
            s.artist = a == null ? "" : a;
            s.art = absolute(artUrl);
            if (s.playing != isPlaying) {
                s.positionMs = s.currentPosition();
                s.positionAt = SystemClock.elapsedRealtime();
            }
            s.playing = isPlaying;
            s.refresh();
            // app.js ngirim antrean ke server ~0,7 detik habis berubah (debounce saveState + pushRemote)
            s.main.removeCallbacks(s.carRefresh);
            s.main.postDelayed(s.carRefresh, 1200);
        });
    }

    /** Posisi + durasi buat seek bar di notifikasi / lock screen (detik). */
    static void position(double dur, double pos, double r) {
        PlaybackService s = instance;
        if (s == null) return;
        s.main.post(() -> {
            long d = (long) (dur * 1000);
            boolean durChanged = d != s.durationMs;
            s.durationMs = d;
            s.positionMs = (long) (pos * 1000);
            s.positionAt = SystemClock.elapsedRealtime();
            s.rate = r > 0 ? (float) r : 1f;
            if (durChanged) s.pushMetadata();
            s.pushState();
        });
    }

    /** Cover dari app.js biasanya path relatif (/api/yt/img?u=...), lewat server lokal. */
    private static String absolute(String u) {
        if (u == null || u.isEmpty()) return "";
        if (u.startsWith("http://") || u.startsWith("https://")) return u;
        if (u.startsWith("/")) return Server.HOME + u.substring(1);
        return "";
    }

    private long currentPosition() {
        if (!playing) return positionMs;
        long p = positionMs + (long) ((SystemClock.elapsedRealtime() - positionAt) * rate);
        return durationMs > 0 ? Math.min(p, durationMs) : p;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Pemutar", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
        session = new MediaSessionCompat(this, "Svara");
        session.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay() {
                if (sink == null) openApp();
                else send("play");
            }
            @Override public void onPlayFromMediaId(String id, Bundle extras) {
                if (id != null && id.startsWith("qi:")) {
                    try {
                        jump(Integer.parseInt(id.substring(3)));
                        return;
                    } catch (NumberFormatException ignored) {
                    }
                }
                openApp();
            }
            @Override public void onSkipToQueueItem(long id) { jump((int) id); }
            @Override public void onPause() { send("pause"); }
            @Override public void onSkipToNext() { send("nexttrack"); }
            @Override public void onSkipToPrevious() { send("previoustrack"); }
            @Override public void onStop() { send("pause"); }
            @Override public void onSeekTo(long ms) {
                positionMs = ms;
                positionAt = SystemClock.elapsedRealtime();
                pushState();
                send("seekto:" + (ms / 1000.0));
            }
        });
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        session.setSessionActivity(PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE));
        session.setQueueTitle("Antrean");
        session.setActive(true);
        setSessionToken(session.getSessionToken());
        ContextCompat.registerReceiver(this, noisy, new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),
                ContextCompat.RECEIVER_NOT_EXPORTED);
        Server.start(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_MEDIA.equals(intent.getAction())) {
            send(intent.getStringExtra("a"));
        }
        int type = Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        ServiceCompat.startForeground(this, NOTIF_ID, build(), type);
        return START_STICKY;
    }

    // ---------- Android Auto ----------

    @Override
    public BrowserRoot onGetRoot(String clientPackageName, int clientUid, Bundle rootHints) {
        return new BrowserRoot(ROOT, null);
    }

    @Override
    public void onLoadChildren(String parentId, Result<List<MediaBrowserCompat.MediaItem>> result) {
        if (!ROOT.equals(parentId)) {
            result.sendResult(new ArrayList<>());
            return;
        }
        result.detach();
        io.execute(() -> {
            CarQueue q = fetchCarQueue();
            main.post(() -> {
                applyCarQueue(q);
                result.sendResult(q.items);
            });
        });
    }

    private static final class CarQueue {
        final List<MediaBrowserCompat.MediaItem> items = new ArrayList<>();
        final List<MediaSessionCompat.QueueItem> queue = new ArrayList<>();
        long active = MediaSessionCompat.QueueItem.UNKNOWN_ID;
    }

    /** Jalan di thread io: baca antrean yang dilaporin app.js ke server lokal. */
    private CarQueue fetchCarQueue() {
        CarQueue q = new CarQueue();
        if (sink != null) {
            try {
                JSONObject st = new JSONObject(http("GET", "api/remote/state", null));
                int idx = st.optInt("idx", -1);
                JSONArray arr = st.optJSONArray("queue");
                for (int k = 0; arr != null && k < arr.length(); k++) {
                    JSONObject t = arr.getJSONObject(k);
                    int i = t.getInt("i");
                    String artist = t.optString("artist");
                    MediaDescriptionCompat d = new MediaDescriptionCompat.Builder()
                            .setMediaId("qi:" + i)
                            .setTitle(t.optString("title", "Tanpa judul"))
                            .setSubtitle(i == idx ? "Sedang diputar · " + artist : artist)
                            .build();
                    q.items.add(new MediaBrowserCompat.MediaItem(d, MediaBrowserCompat.MediaItem.FLAG_PLAYABLE));
                    q.queue.add(new MediaSessionCompat.QueueItem(d, i));
                    if (i == idx) q.active = i;
                }
            } catch (Exception ignored) {
            }
        }
        if (q.items.isEmpty()) {
            MediaDescriptionCompat d = new MediaDescriptionCompat.Builder()
                    .setMediaId(OPEN)
                    .setTitle(sink == null ? "Buka Svara di HP dulu" : "Antrean masih kosong")
                    .setSubtitle(sink == null ? "Habis itu antrean lagunya muncul di sini" : "Putar lagu dari HP, nanti antreannya muncul di sini")
                    .build();
            q.items.add(new MediaBrowserCompat.MediaItem(d, MediaBrowserCompat.MediaItem.FLAG_PLAYABLE));
        }
        return q;
    }

    private void applyCarQueue(CarQueue q) {
        session.setQueue(q.queue.isEmpty() ? null : q.queue);
        activeQi = q.active;
        pushState();
    }

    private void refreshCarQueue() {
        io.execute(() -> {
            CarQueue q = fetchCarQueue();
            main.post(() -> {
                if (instance != this) return;
                applyCarQueue(q);
                notifyChildrenChanged(ROOT);
            });
        });
    }

    /** Lagu dipilih dari layar mobil: suruh app.js muter nomor antrean itu (lewat pollRemote). */
    private void jump(int i) {
        if (sink == null) {
            openApp();
            return;
        }
        io.execute(() -> {
            try {
                http("POST", "api/remote/cmd", new JSONObject().put("cmd", "jump").put("index", i).toString());
            } catch (Exception ignored) {
            }
        });
    }

    /**
     * Audionya diputar WebView di MainActivity, jadi tanpa app kebuka nggak ada yang bisa bunyi.
     * Coba buka app-nya (Android 10+ sering nolak dari belakang), dan kasih tahu di layar mobil.
     */
    private void openApp() {
        try {
            startActivity(new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        } catch (Exception ignored) {
        }
        if (sink == null) {
            session.setPlaybackState(new PlaybackStateCompat.Builder()
                    .setActions(PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PLAY_FROM_MEDIA_ID)
                    .setState(PlaybackStateCompat.STATE_ERROR, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 0f)
                    .setErrorMessage(PlaybackStateCompat.ERROR_CODE_APP_ERROR, "Buka Svara di HP dulu, terus putar lagi")
                    .build());
        }
    }

    private static String http(String method, String path, String body) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(Server.HOME + path).openConnection();
        c.setConnectTimeout(3000);
        c.setReadTimeout(5000);
        c.setRequestMethod(method);
        if (body != null) {
            byte[] b = body.getBytes(StandardCharsets.UTF_8);
            c.setDoOutput(true);
            c.setRequestProperty("Content-Type", "application/json");
            c.setRequestProperty("X-Senandung-Remote", "1");
            try (OutputStream out = c.getOutputStream()) {
                out.write(b);
            }
        }
        try (InputStream in = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } finally {
            c.disconnect();
        }
    }

    private void send(String action) {
        Consumer<String> s = sink;
        if (s != null && action != null) s.accept(action);
    }

    private PendingIntent act(String a, int req) {
        Intent i = new Intent(this, PlaybackService.class).setAction(ACTION_MEDIA).putExtra("a", a);
        return PendingIntent.getService(this, req, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private Notification build() {
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat)
                .setContentTitle(title)
                .setContentText(artist)
                .setLargeIcon(artBitmap)
                .setContentIntent(PendingIntent.getActivity(this, 1, open, PendingIntent.FLAG_IMMUTABLE))
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOnlyAlertOnce(true)
                .setOngoing(playing)
                .setSilent(true)
                .addAction(android.R.drawable.ic_media_previous, "Sebelumnya", act("previoustrack", 10))
                .addAction(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                        playing ? "Jeda" : "Putar", act(playing ? "pause" : "play", 11))
                .addAction(android.R.drawable.ic_media_next, "Berikutnya", act("nexttrack", 12))
                .setStyle(new MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0, 1, 2));
        return b.build();
    }

    private void pushMetadata() {
        MediaMetadataCompat.Builder m = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist);
        if (durationMs > 0) m.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs);
        if (artBitmap != null && art.equals(artLoaded)) m.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artBitmap);
        session.setMetadata(m.build());
    }

    private void pushState() {
        long actions = PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE | PlaybackStateCompat.ACTION_PLAY_PAUSE
                | PlaybackStateCompat.ACTION_SKIP_TO_NEXT | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                | PlaybackStateCompat.ACTION_SKIP_TO_QUEUE_ITEM | PlaybackStateCompat.ACTION_PLAY_FROM_MEDIA_ID;
        if (durationMs > 0) actions |= PlaybackStateCompat.ACTION_SEEK_TO;
        session.setPlaybackState(new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setActiveQueueItemId(activeQi)
                .setState(playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                        durationMs > 0 ? positionMs : PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN,
                        playing ? rate : 0f, positionAt)
                .build());
    }

    private void refresh() {
        String key = title + "\n" + artist + "\n" + playing + "\n" + (artBitmap != null && art.equals(artLoaded) ? art : "");
        boolean changed = !key.equals(shown);
        if (changed) {
            shown = key;
            pushMetadata();
        }
        pushState();
        if (changed) getSystemService(NotificationManager.class).notify(NOTIF_ID, build());
        if (!art.equals(artLoaded)) loadArt(art);
    }

    private void loadArt(String url) {
        artLoaded = url;
        artBitmap = null;
        if (url.isEmpty()) return;
        new Thread(() -> {
            Bitmap bmp = null;
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                byte[] data;
                try (InputStream in = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    byte[] buf = new byte[16 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                    data = out.toByteArray();
                }
                // Cover bisa 1000px+; notifikasi cukup ~512px, sisanya cuma buang RAM
                BitmapFactory.Options o = new BitmapFactory.Options();
                o.inJustDecodeBounds = true;
                BitmapFactory.decodeByteArray(data, 0, data.length, o);
                int sample = 1;
                while (o.outWidth / (sample * 2) >= ART_PX && o.outHeight / (sample * 2) >= ART_PX) sample *= 2;
                o = new BitmapFactory.Options();
                o.inSampleSize = sample;
                bmp = BitmapFactory.decodeByteArray(data, 0, data.length, o);
            } catch (Exception ignored) {
            }
            Bitmap done = bmp;
            main.post(() -> {
                if (Objects.equals(url, artLoaded) && done != null) {
                    artBitmap = done;
                    refresh();
                }
            });
        }, "svara-art").start();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // App diusir dari recent = keluar (audionya ada di WebView activity, ikut mati): berhenti total
        stopForeground(true);
        stopSelf();
        android.os.Process.killProcess(android.os.Process.myPid());
    }

    @Override
    public void onDestroy() {
        instance = null;
        main.removeCallbacks(carRefresh);
        io.shutdownNow();
        try {
            unregisterReceiver(noisy);
        } catch (Exception ignored) {
        }
        session.release();
        super.onDestroy();
    }
}
