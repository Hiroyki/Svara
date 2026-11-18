package app.svara.music;

import android.annotation.SuppressLint;
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
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.media.session.MediaButtonReceiver;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Foreground media service. Audio itself plays inside the WebView; this service
 * keeps the process at foreground priority (so playback survives the screen
 * turning off) and owns the MediaSession behind the notification, lock screen,
 * headset buttons and Bluetooth controls.
 */
public class PlaybackService extends Service {

    static final class State {
        String title = "";
        String artist = "";
        String album = "";
        String artwork = "";
        boolean playing;
        double position;
        double duration;
    }

    private static final String CHANNEL = "playback";
    private static final int NOTIFICATION_ID = 1;
    private static final String ACTION_DISMISS = "app.svara.music.DISMISS";
    private static final long LOCK_MS = 15 * 60 * 1000L;

    /** State handed over by the plugin before the service was running. */
    static State pending;
    private static PlaybackService running;

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private MediaSessionCompat session;
    private State state = new State();
    private String artUrl = "";
    private Bitmap art;
    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;

    static boolean isRunning() {
        return running != null;
    }

    static void apply(State s) {
        if (running != null) running.render(s);
    }

    static void stop(Context ctx) {
        if (running != null) running.shutdown();
        else ctx.stopService(new Intent(ctx, PlaybackService.class));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        running = this;
        createChannel();

        session = new MediaSessionCompat(this, "Svara");
        session.setCallback(
            new MediaSessionCompat.Callback() {
                @Override
                public void onPlay() {
                    SvaraMediaPlugin.emit("play", -1);
                }

                @Override
                public void onPause() {
                    SvaraMediaPlugin.emit("pause", -1);
                }

                @Override
                public void onSkipToNext() {
                    SvaraMediaPlugin.emit("next", -1);
                }

                @Override
                public void onSkipToPrevious() {
                    SvaraMediaPlugin.emit("prev", -1);
                }

                @Override
                public void onSeekTo(long pos) {
                    SvaraMediaPlugin.emit("seek", pos / 1000.0);
                }

                @Override
                public void onStop() {
                    SvaraMediaPlugin.emit("pause", -1);
                    shutdown();
                }
            }
        );
        session.setSessionActivity(openAppIntent());
        session.setActive(true);

        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Svara:playback");
        wakeLock.setReferenceCounted(false);
        WifiManager wm = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
        if (wm != null) {
            wifiLock = wm.createWifiLock(wifiMode(), "Svara:playback");
            wifiLock.setReferenceCounted(false);
        }
    }

    @SuppressWarnings("deprecation")
    private static int wifiMode() {
        return WifiManager.WIFI_MODE_FULL_HIGH_PERF;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (pending != null) {
            state = pending;
            pending = null;
        }
        // must go foreground promptly after startForegroundService()
        goForeground();
        if (intent != null && ACTION_DISMISS.equals(intent.getAction())) {
            SvaraMediaPlugin.emit("pause", -1);
            shutdown();
            return START_NOT_STICKY;
        }
        MediaButtonReceiver.handleIntent(session, intent);
        render(state);
        return START_NOT_STICKY;
    }

    /** Swiping Svara out of recents destroys the WebView, so the music is gone: drop the notification too. */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        shutdown();
    }

    @Override
    public void onDestroy() {
        if (running == this) running = null;
        releaseLocks();
        session.setActive(false);
        session.release();
        io.shutdownNow();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /* --------------------------------------------------------------- state */

    private void render(State s) {
        state = s;
        if (!s.artwork.equals(artUrl)) {
            artUrl = s.artwork;
            art = null;
            loadArt(s.artwork);
        }

        MediaMetadataCompat.Builder meta = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, s.title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, s.artist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, s.album)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, (long) (s.duration * 1000));
        if (art != null) meta.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, art);
        session.setMetadata(meta.build());

        session.setPlaybackState(
            new PlaybackStateCompat.Builder()
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY |
                        PlaybackStateCompat.ACTION_PAUSE |
                        PlaybackStateCompat.ACTION_PLAY_PAUSE |
                        PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                        PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                        PlaybackStateCompat.ACTION_SEEK_TO |
                        PlaybackStateCompat.ACTION_STOP
                )
                .setState(
                    s.playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                    (long) (s.position * 1000),
                    s.playing ? 1f : 0f
                )
                .build()
        );

        if (s.playing) holdLocks();
        else releaseLocks();

        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        nm.notify(NOTIFICATION_ID, buildNotification());
    }

    private void goForeground() {
        try {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                buildNotification(),
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0
            );
        } catch (Exception e) {
            // Android refused a background start; the notification still updates via render()
        }
    }

    private void shutdown() {
        releaseLocks();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @SuppressLint("WakelockTimeout")
    private void holdLocks() {
        // refreshed on every state change (each new track), so a long session never lapses
        wakeLock.acquire(LOCK_MS);
        if (wifiLock != null && !wifiLock.isHeld()) wifiLock.acquire();
    }

    private void releaseLocks() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        if (wifiLock != null && wifiLock.isHeld()) wifiLock.release();
    }

    /* -------------------------------------------------------- notification */

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, getString(R.string.channel_playback), NotificationManager.IMPORTANCE_LOW);
        ch.setShowBadge(false);
        ch.setSound(null, null);
        ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(ch);
    }

    private PendingIntent openAppIntent() {
        Intent i = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        return PendingIntent.getActivity(this, 0, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private PendingIntent dismissIntent() {
        Intent i = new Intent(this, PlaybackService.class).setAction(ACTION_DISMISS);
        return PendingIntent.getService(this, 1, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private NotificationCompat.Action action(int icon, int label, long action) {
        return new NotificationCompat.Action(icon, getString(label), MediaButtonReceiver.buildMediaButtonPendingIntent(this, action));
    }

    private Notification buildNotification() {
        State s = state;
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_svara)
            .setContentTitle(s.title.isEmpty() ? getString(R.string.app_name) : s.title)
            .setContentText(s.artist)
            .setSubText(s.album.isEmpty() ? null : s.album)
            .setLargeIcon(art)
            .setContentIntent(openAppIntent())
            .setDeleteIntent(dismissIntent())
            .setOngoing(s.playing)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(action(R.drawable.ic_skip_previous, R.string.action_previous, PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS))
            .addAction(
                s.playing
                    ? action(R.drawable.ic_pause, R.string.action_pause, PlaybackStateCompat.ACTION_PAUSE)
                    : action(R.drawable.ic_play, R.string.action_play, PlaybackStateCompat.ACTION_PLAY)
            )
            .addAction(action(R.drawable.ic_skip_next, R.string.action_next, PlaybackStateCompat.ACTION_SKIP_TO_NEXT))
            .setStyle(
                new androidx.media.app.NotificationCompat.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0, 1, 2)
            )
            .build();
    }

    private void loadArt(String url) {
        if (url == null || !url.startsWith("http")) return;
        io.execute(() -> {
            Bitmap bmp = null;
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(8000);
                c.setReadTimeout(8000);
                try (InputStream in = c.getInputStream()) {
                    bmp = BitmapFactory.decodeStream(in);
                }
            } catch (Exception ignored) {
                // artwork is optional
            } finally {
                if (c != null) c.disconnect();
            }
            Bitmap result = bmp;
            main.post(() -> {
                if (result == null || !url.equals(artUrl) || running != this) return;
                art = result;
                render(state);
            });
        });
    }
}
