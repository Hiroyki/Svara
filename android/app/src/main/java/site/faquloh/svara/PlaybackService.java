package site.faquloh.svara;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Objects;
import java.util.function.Consumer;

/**
 * Foreground service: jaga proses (dan server.py) tetap hidup pas app di belakang/layar mati,
 * plus notifikasi pemutar + kontrol dari lock screen, headset, dan Bluetooth.
 * Audionya sendiri diputar WebView; tombol di sini cuma diteruskan ke handler mediaSession di app.js.
 */
public class PlaybackService extends Service {
    private static final String CHANNEL = "playback";
    private static final int NOTIF_ID = 1;
    private static final int ART_PX = 512;
    static final String ACTION_MEDIA = "site.faquloh.svara.MEDIA";

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
            @Override public void onPlay() { send("play"); }
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
        session.setActive(true);
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
                | PlaybackStateCompat.ACTION_SKIP_TO_NEXT | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS;
        if (durationMs > 0) actions |= PlaybackStateCompat.ACTION_SEEK_TO;
        session.setPlaybackState(new PlaybackStateCompat.Builder()
                .setActions(actions)
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
        try {
            unregisterReceiver(noisy);
        } catch (Exception ignored) {
        }
        session.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
