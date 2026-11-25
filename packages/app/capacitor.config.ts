import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the wAI Android build.
 *
 * Design notes
 * ------------
 * - `androidScheme: 'https'` keeps the WebView on a secure origin so WebCrypto,
 *   MediaRecorder and getUserMedia all work.
 * - No server block: the app is fully bundled, zero network access required.
 * - `android.allowMixedContent: false` and `webContentsDebuggingEnabled` in debug
 *   only, keeping release builds locked down.
 */
const config: CapacitorConfig = {
  appId: 'dev.andrexthedev.wai',
  appName: 'wAI',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    captureInput: false,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#070b14',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#070b14',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_anchor',
      iconColor: '#6ee7b7',
    },
  },
};

export default config;
