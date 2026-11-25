/**
 * Platform abstraction.
 *
 * The same app runs in two environments:
 *   1. Android (Capacitor)  – real GPS, sensors, camera, mic, notifications.
 *   2. Browser demo/preview – simulated sensors, in-memory media, no permissions.
 *
 * Everything that touches hardware goes through this file so the UI never needs
 * `if (isNative)` checks sprinkled around, and so the demo build stays usable in
 * a desktop browser and inside an iframe.
 */
import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position } from '@capacitor/geolocation';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import type { GeoFix, SensorAvailability } from '@wai/shared';

export const isNative = Capacitor.isNativePlatform();
export const platformName = Capacitor.getPlatform();

const isEmbedded = (() => {
  try {
    return new URLSearchParams(window.location.search).has('embed');
  } catch {
    return false;
  }
})();
export const isDemo = !isNative || isEmbedded;

/* ------------------------------------------------------------------ */
/* Geolocation                                                          */
/* ------------------------------------------------------------------ */

export interface PermissionState {
  location: 'granted' | 'denied' | 'prompt' | 'unavailable';
  camera: 'granted' | 'denied' | 'prompt' | 'unavailable';
  microphone: 'granted' | 'denied' | 'prompt' | 'unavailable';
  notifications: 'granted' | 'denied' | 'prompt' | 'unavailable';
}

const toFix = (position: Position, source: GeoFix['source'] = 'gps'): GeoFix => ({
  lat: position.coords.latitude,
  lng: position.coords.longitude,
  altitude: Number.isFinite(position.coords.altitude ?? NaN) ? position.coords.altitude! : undefined,
  accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : undefined,
  source,
  timestamp: position.timestamp || Date.now(),
});

export interface LocationWatchOptions {
  onUpdate: (fix: GeoFix) => void;
  onError: (error: Error) => void;
  /** Desired accuracy in metres; the OS picks the closest available mode. */
  accuracy?: 'high' | 'balanced' | 'low';
  timeoutMs?: number;
}

/**
 * Watch position. Falls back to the browser Geolocation API (works in the web
 * demo and in browsers), and reports a clear error when nothing is available so
 * the UI can switch to sensor-only (dead reckoning) mode.
 */
export async function watchLocation({
  onUpdate,
  onError,
  accuracy = 'high',
  timeoutMs = 20000,
}: LocationWatchOptions): Promise<() => void> {
  if (isDemo) {
    const timer = startSimulatedFix(onUpdate);
    return () => window.clearInterval(timer);
  }

  try {
    const permissions = await Geolocation.checkPermissions();
    if (permissions.location === 'denied') {
      onError(new Error('location-denied'));
      return () => {};
    }
    if (permissions.location !== 'granted') {
      const requested = await Geolocation.requestPermissions();
      if (requested.location !== 'granted') {
        onError(new Error('location-denied'));
        return () => {};
      }
    }

    const id = await Geolocation.watchPosition(
      {
        enableHighAccuracy: accuracy === 'high',
        timeout: timeoutMs,
        maximumAge: 2000,
      },
      (position, err) => {
        if (err || !position) {
          onError(new Error(err?.message ?? 'location-unavailable'));
          return;
        }
        onUpdate(toFix(position));
      },
    );
    return () => {
      void Geolocation.clearWatch({ id });
    };
  } catch (error) {
    onError(error as Error);
    return () => {};
  }
}

export async function getCurrentFix(): Promise<GeoFix | null> {
  if (isDemo) return simulatedFix();
  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 12000,
    });
    return toFix(position);
  } catch {
    return null;
  }
}

/* Simulated movement for the browser demo – small walk around a fixed anchor. */
let demoOrigin: GeoFix | null = null;

async function simulatedFix(): Promise<GeoFix> {
  if (!demoOrigin) {
    demoOrigin = {
      lat: 48.1351 + 0.0004,
      lng: 11.582 + 0.0006,
      altitude: 411,
      accuracy: 6,
      source: 'demo',
      timestamp: Date.now(),
    };
  }
  return { ...demoOrigin, timestamp: Date.now() };
}

function startSimulatedFix(onUpdate: (fix: GeoFix) => void): number {
  let angle = 0;
  const tick = async () => {
    const base = await simulatedFix();
    angle += 0.14;
    const drift = 0.00016;
    onUpdate({
      lat: base.lat + Math.sin(angle) * drift,
      lng: base.lng + Math.cos(angle * 0.8) * drift,
      altitude: 411 + Math.sin(angle) * 2,
      accuracy: 6 + Math.sin(angle * 3) * 2,
      source: 'demo',
      timestamp: Date.now(),
    });
  };
  void tick();
  return window.setInterval(tick, 1600);
}

/* ------------------------------------------------------------------ */
/* Sensors (compass, motion, barometer)                                */
/* ------------------------------------------------------------------ */

export interface SensorReadings {
  heading: number | null;
  magneticAccuracy: 'high' | 'medium' | 'low' | 'unreliable' | null;
  /**
   * True when the device motion event exposes `webkitCompassHeading` (iOS) or we
   * derived heading from absolute orientation (Android).
   */
  hasAbsoluteHeading: boolean;
  pressure: number | null;
  steps: number | null;
}

type SensorCallback = (readings: SensorReadings) => void;

const readings: SensorReadings = {
  heading: null,
  magneticAccuracy: null,
  hasAbsoluteHeading: false,
  pressure: null,
  steps: null,
};

/**
 * Subscribe to the device orientation stream.
 *
 * On Android the `deviceorientationabsolute` event gives a magnetometer-referenced
 * heading; we low-pass filter it to remove jitter, and expose the reported
 * accuracy so the UI can prompt for a figure-eight calibration.
 */
export function subscribeSensors(callback: SensorCallback): () => void {
  if (isDemo) {
    let angle = 24;
    const timer = window.setInterval(() => {
      angle = (angle + 2.2) % 360;
      readings.heading = angle;
      readings.magneticAccuracy = 'high';
      readings.hasAbsoluteHeading = true;
      callback({ ...readings });
    }, 120);
    return () => window.clearInterval(timer);
  }

  let smoothed: number | null = null;
  const emit = () => callback({ ...readings });

  const onOrientation = (event: DeviceOrientationEvent) => {
    // Prefer the absolute (magnetometer) event; fall back to alpha for devices
    // that only expose the relative event.
    const headingSource =
      (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading ??
      (typeof event.alpha === 'number' ? 360 - event.alpha : null);
    if (headingSource == null) return;
    const heading = ((headingSource % 360) + 360) % 360;
    if (smoothed == null) smoothed = heading;
    // Shortest-path low-pass filter (alpha 0.18 ≈ 250 ms settle time).
    let delta = heading - smoothed;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    smoothed = (smoothed + delta * 0.18 + 360) % 360;
    readings.heading = Math.round(smoothed * 10) / 10;
    readings.hasAbsoluteHeading = true;
    readings.magneticAccuracy = Math.abs(delta) > 40 ? 'low' : readings.hasAbsoluteHeading ? 'high' : 'medium';
    emit();
  };

  const absoluteSupported = 'ondeviceorientationabsolute' in window;
  const eventName = absoluteSupported ? 'deviceorientationabsolute' : 'deviceorientation';
  window.addEventListener(eventName as 'deviceorientation', onOrientation, true);

  const onPressure = (event: Event) => {
    const pressure = (event as Event & { value?: number }).value;
    if (typeof pressure === 'number') {
      readings.pressure = pressure;
      emit();
    }
  };

  // Generic Sensor API where available (Chrome/Android).
  let barometer: { start: () => void; stop: () => void } | null = null;
  const BarometerCtor = (
    window as unknown as { Barometer?: new (opts?: { frequency?: number }) => EventTarget & { start: () => void; stop: () => void } }
  ).Barometer;
  if (BarometerCtor) {
    try {
      const instance = new BarometerCtor({ frequency: 1 });
      instance.addEventListener('reading', onPressure);
      instance.start();
      barometer = instance;
    } catch {
      barometer = null;
    }
  }

  return () => {
    window.removeEventListener(eventName as 'deviceorientation', onOrientation, true);
    barometer?.stop();
  };
}

/** Ask for motion permission (required on iOS Safari based browsers). */
export async function requestMotionPermission(): Promise<boolean> {
  const anyWindow = window as unknown as {
    DeviceOrientationEvent?: { requestPermission?: () => Promise<string> };
  };
  try {
    const request = anyWindow.DeviceOrientationEvent?.requestPermission;
    if (request) return (await request()) === 'granted';
    return true;
  } catch {
    return false;
  }
}

export function sensorAvailability(): SensorAvailability[] {
  const hasOrientation = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  return [
    { kind: 'gps', available: !isNative || 'geolocation' in navigator },
    { kind: 'magnetometer', available: hasOrientation },
    { kind: 'accelerometer', available: typeof DeviceMotionEvent !== 'undefined' },
    { kind: 'gyroscope', available: hasOrientation },
    {
      kind: 'barometer',
      available: Boolean((window as unknown as { Barometer?: unknown }).Barometer),
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Haptics, audio, torch                                               */
/* ------------------------------------------------------------------ */

export async function vibrate(pattern: 'tap' | 'soft' | 'medium' | 'strong' | 'arrived'): Promise<void> {
  const map: Record<typeof pattern, number | number[]> = {
    tap: 12,
    soft: 20,
    medium: 40,
    strong: 90,
    arrived: [40, 60, 40, 60, 120],
  };
  try {
    if (isNative) {
      if (pattern === 'tap' || pattern === 'soft') {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (pattern === 'medium') {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (pattern === 'strong' || pattern === 'arrived') {
        await Haptics.notification({ type: NotificationType.Success });
      }
      return;
    }
    navigator.vibrate?.(map[pattern]);
  } catch {
    /* haptics are a nicety – never break the flow */
  }
}

let audioContext: AudioContext | null = null;

/** Short synthesised beep – avoids shipping audio assets and works offline. */
export function beep(frequency = 880, durationMs = 70, volume = 0.06): void {
  if (isDemo && !('AudioContext' in window)) return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + durationMs / 1000);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + durationMs / 1000);
  } catch {
    /* audio not available */
  }
}

/**
 * Torch control. Capacitor has no first-party torch plugin, so on Android we use
 * a tiny JS bridge registered by the native shell (see android/app/src/main/java
 * .../TorchPlugin.java). Falls back to the torch constraint of getUserMedia in
 * the browser.
 */
export async function setTorch(on: boolean): Promise<boolean> {
  try {
    const bridge = (window as unknown as {
      Capacitor?: { Plugins?: { Torch?: { setTorch?: (opts: { on: boolean }) => Promise<void> } } };
    }).Capacitor?.Plugins?.Torch;
    if (bridge?.setTorch) {
      await bridge.setTorch({ on });
      return true;
    }
    const stream: MediaStream | null = (window as unknown as { __waiTorchStream?: MediaStream }).__waiTorchStream ?? null;
    if (!on) {
      stream?.getTracks().forEach((track) => track.stop());
      (window as unknown as { __waiTorchStream?: MediaStream | null }).__waiTorchStream = null;
      return true;
    }
    if (!navigator.mediaDevices?.getUserMedia) return false;
    const next = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } } as MediaTrackConstraints,
    });
    const track = next.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.() as { torch?: boolean } | undefined;
    if (capabilities?.torch) {
      await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
      (window as unknown as { __waiTorchStream?: MediaStream }).__waiTorchStream = next;
      return true;
    }
    next.getTracks().forEach((t) => t.stop());
    return false;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Camera & microphone                                                 */
/* ------------------------------------------------------------------ */

export interface CapturedPhoto {
  /** `data:` URL for the browser, `file://` URI on Android. */
  dataUrl: string;
  /** Persisted path inside app storage (native) or a data URL (web). */
  stored: string;
}

export async function capturePhoto(source: 'camera' | 'gallery'): Promise<CapturedPhoto | null> {
  try {
    if (isNative) {
      const photo = await Camera.getPhoto({
        quality: 82,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        width: 1600,
        correctOrientation: true,
        saveToGallery: false,
      });
      if (!photo.dataUrl) return null;
      const stored = await persistPhoto(photo.dataUrl, photo.format);
      return { dataUrl: photo.dataUrl, stored };
    }

    // Web fallback: file picker for gallery, getUserMedia snapshot for camera.
    if (source === 'gallery') {
      const dataUrl = await pickFile('image/*');
      return dataUrl ? { dataUrl, stored: dataUrl } : null;
    }
    const dataUrl = await snapshotFromCamera();
    return dataUrl ? { dataUrl, stored: dataUrl } : null;
  } catch {
    return null;
  }
}

async function persistPhoto(dataUrl: string, format = 'jpeg'): Promise<string> {
  const base64 = dataUrl.split(',')[1] ?? '';
  const filename = `photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${format}`;
  try {
    await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Data,
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Data });
    return uri;
  } catch {
    return dataUrl;
  }
}

function pickFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

async function snapshotFromCamera(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    stream.getTracks().forEach((track) => track.stop());
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}

export interface Recording {
  stop: () => Promise<{ dataUrl: string; stored: string; durationMs: number; mime: string } | null>;
  cancel: () => void;
}

/** Start a voice recording (MediaRecorder – works in the WebView and browsers). */
export async function startVoiceRecording(): Promise<Recording | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: BlobPart[] = [];
    const startedAt = Date.now();
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.start(250);

    const cleanup = () => stream.getTracks().forEach((track) => track.stop());

    return {
      stop: () =>
        new Promise((resolve) => {
          recorder.onstop = async () => {
            cleanup();
            const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
            const dataUrl = await blobToDataUrl(blob);
            const stored = await persistAudio(dataUrl, recorder.mimeType || 'audio/webm');
            resolve({
              dataUrl,
              stored,
              durationMs: Date.now() - startedAt,
              mime: recorder.mimeType || 'audio/webm',
            });
          };
          recorder.stop();
        }),
      cancel: () => {
        try {
          recorder.stop();
        } catch {
          /* already stopped */
        }
        cleanup();
      },
    };
  } catch {
    return null;
  }
}

async function persistAudio(dataUrl: string, mime: string): Promise<string> {
  const extension = mime.includes('mp4') ? 'm4a' : 'webm';
  const base64 = dataUrl.split(',')[1] ?? '';
  const filename = `voice/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  if (!isNative) return dataUrl;
  try {
    await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Data, recursive: true });
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Data });
    return uri;
  } catch {
    return dataUrl;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(blob);
  });
}

/* ------------------------------------------------------------------ */
/* Notifications & sharing                                             */
/* ------------------------------------------------------------------ */

export async function scheduleParkingReminder(
  anchorId: string,
  title: string,
  body: string,
  at: Date,
): Promise<boolean> {
  const id = notificationId(anchorId);
  try {
    if (isNative) {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        const requested = await LocalNotifications.requestPermissions();
        if (requested.display !== 'granted') return false;
      }
      await LocalNotifications.cancel({ notifications: [{ id }] }).catch(() => {});
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            schedule: { at, allowWhileIdle: true },
            smallIcon: 'ic_stat_anchor',
            iconColor: '#6ee7b7',
            channelId: 'wai-parking',
          },
        ],
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function cancelParkingReminder(anchorId: string): Promise<void> {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId(anchorId) }] });
  } catch {
    /* ignore */
  }
}

/** Stable 31-bit notification id derived from an anchor id. */
function notificationId(anchorId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < anchorId.length; i++) {
    hash ^= anchorId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 1) % 2147483647;
}

export async function shareText(text: string, title: string): Promise<'native' | 'copied' | 'failed'> {
  try {
    if (isNative) {
      await Share.share({ title, text, dialogTitle: title });
      return 'native';
    }
    if (navigator.share) {
      await navigator.share({ title, text });
      return 'native';
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Save an export package to the device (Downloads on Android, download in web). */
export async function saveExportFile(filename: string, content: string): Promise<string | null> {
  try {
    if (isNative) {
      const result = await Filesystem.writeFile({
        path: `exports/${filename}`,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      return result.uri;
    }
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return filename;
  } catch {
    return null;
  }
}

export async function getPermissions(): Promise<PermissionState> {
  if (isDemo) {
    return { location: 'granted', camera: 'granted', microphone: 'granted', notifications: 'granted' };
  }
  const result: PermissionState = {
    location: 'prompt',
    camera: 'prompt',
    microphone: 'prompt',
    notifications: 'prompt',
  };
  try {
    const geo = await Geolocation.checkPermissions();
    result.location = geo.location === 'granted' ? 'granted' : geo.location === 'denied' ? 'denied' : 'prompt';
  } catch {
    result.location = 'unavailable';
  }
  try {
    const camera = await Camera.checkPermissions();
    result.camera = camera.camera === 'granted' ? 'granted' : camera.camera === 'denied' ? 'denied' : 'prompt';
  } catch {
    result.camera = 'prompt';
  }
  try {
    const notifications = await LocalNotifications.checkPermissions();
    result.notifications =
      notifications.display === 'granted' ? 'granted' : notifications.display === 'denied' ? 'denied' : 'prompt';
  } catch {
    result.notifications = 'unavailable';
  }
  result.microphone = 'prompt';
  return result;
}
