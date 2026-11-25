package dev.andrexthedev.wai;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * wAI main activity.
 *
 * Besides registering the torch plugin we make sure the WebView is configured for
 * a fully offline app: no mixed content, no file access from file:// URLs, DOM
 * storage enabled (anchors live in localStorage) and hardware acceleration kept
 * on for smooth compass rendering.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TorchPlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        WebSettings settings = webView.getSettings();
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setGeolocationEnabled(true);
        // Keep media capture working inside the WebView (photo/voice notes).
        webView.setWebChromeClient(getBridge().getWebChromeClient());
    }
}
