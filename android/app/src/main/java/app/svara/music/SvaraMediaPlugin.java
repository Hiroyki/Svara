package app.svara.music;

import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import androidx.activity.OnBackPressedCallback;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridge between the web player (src/components/NativeBridge.tsx) and Android.
 *
 * JS → native: update() mirrors the current track and play state into PlaybackService,
 *              which owns the media notification, lock-screen controls and the
 *              foreground service that keeps the app alive with the screen off.
 * native → JS: "action" events (play, pause, next, prev, seek, stop) from the
 *              notification or headset, and "back" when the system back button is pressed.
 */
@CapacitorPlugin(name = "SvaraMedia")
public class SvaraMediaPlugin extends Plugin {

    private static SvaraMediaPlugin instance;
    private final Handler main = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        instance = this;
        // Back is decided in JS: close an overlay, go back a page, or leave the app running in the background.
        getActivity()
            .getOnBackPressedDispatcher()
            .addCallback(
                getActivity(),
                new OnBackPressedCallback(true) {
                    @Override
                    public void handleOnBackPressed() {
                        notifyListeners("back", new JSObject());
                    }
                }
            );
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
        PlaybackService.stop(getContext());
    }

    /** Called by PlaybackService on any thread. */
    static void emit(String action, double position) {
        SvaraMediaPlugin p = instance;
        if (p == null) return;
        JSObject data = new JSObject();
        data.put("action", action);
        if (position >= 0) data.put("position", position);
        p.main.post(() -> p.notifyListeners("action", data));
    }

    @PluginMethod
    public void update(PluginCall call) {
        PlaybackService.State s = new PlaybackService.State();
        s.title = call.getString("title", "");
        s.artist = call.getString("artist", "");
        s.album = call.getString("album", "");
        s.artwork = call.getString("artwork", "");
        s.playing = Boolean.TRUE.equals(call.getBoolean("playing", false));
        s.position = call.getDouble("position", 0.0);
        s.duration = call.getDouble("duration", 0.0);
        main.post(() -> {
            if (PlaybackService.isRunning()) {
                PlaybackService.apply(s);
            } else if (s.playing) {
                // only start the foreground service while the user is actively playing
                PlaybackService.pending = s;
                try {
                    ContextCompat.startForegroundService(getContext(), new Intent(getContext(), PlaybackService.class));
                } catch (Exception e) {
                    PlaybackService.pending = null;
                }
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        main.post(() -> PlaybackService.stop(getContext()));
        call.resolve();
    }

    /** Back from the home screen: keep playing, just leave the app like a launcher press would. */
    @PluginMethod
    public void minimize(PluginCall call) {
        main.post(() -> getActivity().moveTaskToBack(true));
        call.resolve();
    }
}
