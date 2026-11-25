import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Open external URIs (wallet deep links, explorers, mailto) in the proper place:
 * the system browser/app on Android, a new tab in the web demo.
 */
export function openExternal(url: string): void {
  try {
    if (Capacitor.isNativePlatform() && /^https?:/i.test(url)) {
      void Browser.open({ url, presentationStyle: 'popover' });
      return;
    }
    if (/^(mailto|tel|geo|solana|bitcoin|ethereum):/i.test(url)) {
      window.location.href = url;
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    window.location.href = url;
  }
}
