package dev.andrexthedev.wai;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * wAI main activity.
 *
 * <p>Besides registering the torch plugin we configure the WebView for a fully
 * offline app: DOM storage enabled (anchors live in localStorage), no file or
 * mixed-content access, media capture allowed so photo and voice notes work.
 *
 * <p>Capacitor already installs its own {@code BridgeWebChromeClient} on the
 * WebView, which is what grants camera/microphone capture inside the WebView.
 * We must not replace it, because doing so would break the bridge.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register before super.onCreate(): the bridge is created there.
        registerPlugin(TorchPlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) {
            return;
        }

        WebSettings settings = webView.getSettings();
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setGeolocationEnabled(true);
        // MediaRecorder needs a secure origin; Capacitor serves the app from
        // https://localhost, so getUserMedia keeps working without extra flags.
        settings.setJavaScriptEnabled(true);
    }
}
