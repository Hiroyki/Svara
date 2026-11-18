package app.svara.music;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;
import java.util.Collections;

public class MainActivity extends BridgeActivity {

    /**
     * Runs at document start in every frame, including the hidden embed player.
     * The player stops itself when the page reports it is hidden (screen off, app in
     * the background). A music app has to keep going there, so the page always
     * reports "visible" and the visibilitychange event never reaches the player.
     */
    private static final String KEEP_VISIBLE =
        "(function(){try{" +
        "var d=Document.prototype;" +
        "Object.defineProperty(d,'hidden',{get:function(){return false},configurable:true});" +
        "Object.defineProperty(d,'webkitHidden',{get:function(){return false},configurable:true});" +
        "Object.defineProperty(d,'visibilityState',{get:function(){return 'visible'},configurable:true});" +
        "Object.defineProperty(d,'webkitVisibilityState',{get:function(){return 'visible'},configurable:true});" +
        "var stop=function(e){e.stopImmediatePropagation();};" +
        "window.addEventListener('visibilitychange',stop,true);" +
        "window.addEventListener('webkitvisibilitychange',stop,true);" +
        "}catch(e){}})();";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SvaraMediaPlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        // The player is a hidden embed: let it start a song as soon as one is picked.
        settings.setMediaPlaybackRequiresUserGesture(false);

        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(webView, KEEP_VISIBLE, Collections.singleton("*"));
        }
    }

    /** Keep JS timers and the player running while another app is in front or the screen is off. */
    @Override
    public void onPause() {
        super.onPause();
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
        }
    }
}
