/** Domain model shared by the Android app (Capacitor/React) and the tooling. */

export type AnchorCategory =
  | 'car'
  | 'tent'
  | 'meeting'
  | 'tool'
  | 'entrance'
  | 'nature'
  | 'other';

export interface GeoFix {
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  /** Which source produced the fix – matters for trust messaging in the UI. */
  source: 'gps' | 'network' | 'dead-reckoning' | 'manual' | 'demo' | 'import';
  timestamp: number;
}

export interface PhotoRef {
  id: string;
  /** Relative file name inside the app's media folder (never an absolute path). */
  file: string;
  /** True-north heading of the camera when the photo was taken, 0–360. */
  heading?: number;
  takenAt: number;
  width?: number;
  height?: number;
}

export interface VoiceRef {
  id: string;
  file: string;
  durationMs: number;
  recordedAt: number;
  mime: string;
}

export type ParkingReminderState = 'idle' | 'scheduled' | 'fired' | 'dismissed';

export interface PastePoint {
  lat: number;
  lng: number;
  t: number;
  /** Sensor-only uncertainty estimate in metres, grows with distance walked. */
  accuracy: number;
}

export interface Anchor {
  id: string;
  name: string;
  category: AnchorCategory;
  lat: number;
  lng: number;
  altitude?: number;
  accuracy?: number;
  /** Source of the original fix. */
  source: GeoFix['source'];
  createdAt: number;
  updatedAt: number;
  note?: string;
  zone?: string;
  photos: PhotoRef[];
  voices: VoiceRef[];
  favorite: boolean;
  archived: boolean;
  /** Optional user-defined floor label (car park level), shown in the elevation beam. */
  floorLabel?: string;
  /** Breadcrumb trail recorded from the anchor away (Pro). */
  trail?: PastePoint[];
  parking?: {
    startedAt: number;
    limitMinutes?: number;
    remindAt?: number;
    reminderState: ParkingReminderState;
  };
}

export interface SharePayload {
  v: 1;
  a: {
    n?: string;
    cat?: AnchorCategory;
    lat: number;
    lng: number;
    alt?: number;
    t?: number;
    note?: string;
    zone?: string;
  };
}

export interface LicenseState {
  plan: 'free' | 'pro';
  token?: string;
  fingerprint?: string;
  activatedAt?: number;
  via?: string;
}

export type ThemeMode = 'system' | 'light' | 'dark' | 'night';

export interface AppSettings {
  locale: 'de' | 'en' | 'auto';
  units: 'metric' | 'imperial';
  theme: ThemeMode;
  onboardingDone: boolean;
  proximityFeedback: boolean;
  hapticsOnly: boolean;
  voiceGuidance: boolean;
}

export type SensorKind = 'gps' | 'magnetometer' | 'accelerometer' | 'gyroscope' | 'barometer';

export interface SensorAvailability {
  kind: SensorKind;
  available: boolean;
}
