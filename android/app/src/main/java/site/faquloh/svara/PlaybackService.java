package site.faquloh.svara;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.function.Consumer;

/**
 * Foreground service: jaga proses (dan server.py) tetap hidup pas app di belakang/layar mati,
 * plus notifikasi pemutar + kontrol dari lock screen, headset, dan Bluetooth.
 * Audionya sendiri diputar WebView; tombol di sini cuma diteruskan ke handler mediaSession di app.js.
 */
public class PlaybackService extends Service {
    private static final String CHANNEL = "playback";
    private static final int NOTIF_ID = 1;
    static final String ACTION_MEDIA = "site.faquloh.svara.MEDIA";

    /** Penerus aksi ke WebView (play, pause, nexttrack, previoustrack); diisi MainActivity. */
    static volatile Consumer<String> sink;
    private static PlaybackService instance;

    private MediaSessionCompat session;
    private final Handler main = new Handler(Looper.getMainLooper());
    private String title = "Svara", artist = "", art = "";
    private boolean playing;
    private Bitmap artBitmap;
    private String artLoaded = "";

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
            s.title = t == null || t.isEmpty() ? "Svara" : t;
            s.artist = a == null ? "" : a;
            s.art = artUrl == null ? "" : artUrl;
            s.playing = isPlaying;
            s.refresh();
        });
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
        });
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        session.setSessionActivity(PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE));
        session.setActive(true);
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

    private void refresh() {
        MediaMetadataCompat.Builder m = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist);
        if (artBitmap != null && art.equals(artLoaded)) m.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artBitmap);
        session.setMetadata(m.build());
        session.setPlaybackState(new PlaybackStateCompat.Builder()
                .setActions(PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE | PlaybackStateCompat.ACTION_PLAY_PAUSE
                        | PlaybackStateCompat.ACTION_SKIP_TO_NEXT | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS)
                .setState(playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                        PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1f)
                .build());
        getSystemService(NotificationManager.class).notify(NOTIF_ID, build());
        if (!art.equals(artLoaded)) loadArt(art);
    }

    private void loadArt(String url) {
        artLoaded = url;
        artBitmap = null;
        if (url.isEmpty() || !url.startsWith("http")) return;
        new Thread(() -> {
            Bitmap bmp = null;
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                try (InputStream in = c.getInputStream()) {
                    bmp = BitmapFactory.decodeStream(in);
                }
            } catch (Exception ignored) {
            }
            Bitmap done = bmp;
            main.post(() -> {
                if (url.equals(artLoaded) && done != null) {
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
        session.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
