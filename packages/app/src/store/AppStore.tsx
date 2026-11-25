/**
 * Central app state: anchors, settings, licence, live position/sensors.
 *
 * Deliberately built on useReducer + localStorage instead of a third-party store
 * so the bundle stays small, the offline behaviour is predictable and every
 * mutation is easy to audit for storage side effects.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  appendTrailPoint,
  canAddAnchor,
  createAnchor,
  detectLocale,
  DEFAULT_ISSUER_PUBLIC_KEY,
  licenseFingerprint,
  limitsFor,
  newId,
  mergeImported,
  queryAnchors,
  verifyLicense,
  type Anchor,
  type AnchorCategory,
  type AppSettings,
  type GeoFix,
  type LicensePayload,
  type LicenseState,
  type PastePoint,
  type PhotoRef,
  type VoiceRef,
} from '@wai/shared';
import { storage, STORAGE_KEYS } from './storage';
import {
  getCurrentFix,
  isDemo,
  requestMotionPermission,
  subscribeSensors,
  watchLocation,
  type SensorReadings,
} from '../platform/native';

const DEFAULT_SETTINGS: AppSettings = {
  locale: 'auto',
  units: 'metric',
  theme: 'system',
  onboardingDone: false,
  proximityFeedback: true,
  hapticsOnly: true,
  voiceGuidance: false,
};

interface State {
  anchors: Anchor[];
  settings: AppSettings;
  license: LicenseState;
  order: string[];
}

type Action =
  | { type: 'hydrate'; payload: Partial<State> }
  | { type: 'add-anchor'; anchor: Anchor }
  | { type: 'update-anchor'; id: string; patch: Partial<Anchor> }
  | { type: 'delete-anchor'; id: string }
  | { type: 'archive-anchor'; id: string; archived: boolean }
  | { type: 'toggle-favorite'; id: string }
  | { type: 'add-photo'; id: string; photo: PhotoRef }
  | { type: 'remove-photo'; id: string; photoId: string }
  | { type: 'add-voice'; id: string; voice: VoiceRef }
  | { type: 'remove-voice'; id: string; voiceId: string }
  | { type: 'append-trail'; id: string; point: PastePoint }
  | { type: 'clear-trail'; id: string }
  | { type: 'set-parking'; id: string; parking: Anchor['parking'] }
  | { type: 'import-anchors'; anchors: Anchor[] }
  | { type: 'update-settings'; patch: Partial<AppSettings> }
  | { type: 'set-license'; license: LicenseState }
  | { type: 'clear-all' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.payload };
    case 'add-anchor':
      return { ...state, anchors: [action.anchor, ...state.anchors] };
    case 'update-anchor':
      return {
        ...state,
        anchors: state.anchors.map((anchor) =>
          anchor.id === action.id ? { ...anchor, ...action.patch, updatedAt: Date.now() } : anchor,
        ),
      };
    case 'delete-anchor':
      return { ...state, anchors: state.anchors.filter((anchor) => anchor.id !== action.id) };
    case 'archive-anchor':
      return {
        ...state,
        anchors: state.anchors.map((anchor) =>
          anchor.id === action.id
            ? { ...anchor, archived: action.archived, updatedAt: Date.now() }
            : anchor,
        ),
      };
    case 'toggle-favorite':
      return {
        ...state,
        anchors: state.anchors.map((anchor) =>
          anchor.id === action.id
            ? { ...anchor, favorite: !anchor.favorite, updatedAt: Date.now() }
            : anchor,
        ),
      };
    case 'add-photo':
      return {
        ...state,
        anchors: state.anchors.map((anchor) =>
          anchor.id === action.id
            ? { ...anchor, photos: [...anchor.photos, action.photo], updatedAt: Date.now() }
            : anchor,
        ),
      };
    case 'remove-photo':
      return {
        ...state,
        anchors: state.anchors.map((anchor) =>
          anchor.id === action.id
            ? {
                ...anchor,
                photos: anchor.photos.filter((photo) => photo.id !== action.photoId),
                updatedAt: Date.now(),
              }
            : anchor,
        ),
      };
    case 'add-voice':
      return {
        ...state,
        anchors: state.anchors.map((anchor) =>
          anchor.id === action.id
            ? { ...anchor, voices: [...anchor.voices, action.voice], updatedAt: Date.now() }
            : anchor,
        ),
      };
    case 'remove-voice':
      return {
        ...state,
        anchors: state.anchors.map((anchor) =>
          anchor.id === action.id
            ? {
                ...anchor,
                voices: anchor.voices.filter((voice) => voice.id !== action.voiceId),
                updatedAt: Date.now(),
              }
            : anchor,
        ),
      };
    case 'append-trail':
      return {
        ...state,
        anchors: state.anchors.map((anchor) =>
          anchor.id === action.id
            ? { ...anchor, trail: appendTrailPoint(anchor.trail, action.point) }
            : anchor,
        ),
      };
    case 'clear-trail':
      return {
        ...state,
        anchors: state.anchors.map((anchor) =>
          anchor.id === action.id ? { ...anchor, trail: [], updatedAt: Date.now() } : anchor,
        ),
      };
    case 'set-parking':
      return {
        ...state,
        anchors: state.anchors.map((anchor) =>
          anchor.id === action.id
            ? { ...anchor, parking: action.parking, updatedAt: Date.now() }
            : anchor,
        ),
      };
    case 'import-anchors':
      return { ...state, anchors: mergeImported(state.anchors, action.anchors) };
    case 'update-settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'set-license':
      return { ...state, license: action.license };
    case 'clear-all':
      return { ...state, anchors: [], license: { plan: 'free' } };
    default:
      return state;
  }
}

export interface CreateAnchorArgs {
  fix: GeoFix;
  name?: string;
  category?: AnchorCategory;
  note?: string;
  zone?: string;
  floorLabel?: string;
}

interface AppContextValue {
  ready: boolean;
  anchors: Anchor[];
  settings: AppSettings;
  license: LicenseState;
  plan: 'free' | 'pro';
  limits: ReturnType<typeof limitsFor>;
  locale: 'de' | 'en';
  setLocale: (locale: 'de' | 'en') => void;
  fix: GeoFix | null;
  sensors: SensorReadings;
  locationError: string | null;
  demo: boolean;
  // anchors
  setAnchor: (args: CreateAnchorArgs) => { ok: boolean; anchor?: Anchor; reason?: string };
  /** Returns the merged anchor (optimistic) so callers can chain actions. */
  updateAnchor: (id: string, patch: Partial<Anchor>) => Anchor | null;
  deleteAnchor: (id: string) => void;
  archiveAnchor: (id: string, archived: boolean) => void;
  toggleFavorite: (id: string) => void;
  addPhoto: (id: string, photo: PhotoRef) => void;
  removePhoto: (id: string, photoId: string) => void;
  addVoice: (id: string, voice: VoiceRef) => void;
  removeVoice: (id: string, voiceId: string) => void;
  appendTrail: (id: string, point: PastePoint) => void;
  clearTrail: (id: string) => void;
  setParking: (id: string, parking: Anchor['parking']) => void;
  importAnchors: (anchors: Anchor[]) => void;
  activeAnchors: Anchor[];
  archivedAnchors: Anchor[];
  search: (options: Parameters<typeof queryAnchors>[1]) => Anchor[];
  // settings & licence
  updateSettings: (patch: Partial<AppSettings>) => void;
  activateLicense: (token: string) => Promise<{ ok: boolean; reason?: string; payload?: LicensePayload }>;
  deactivateLicense: () => void;
  exportData: () => string;
  clearAllData: () => void;
  storageBytes: number;
  requestPermissions: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Hydrate synchronously so the first paint already shows the user's anchors.
 * (An effect-based hydration would flash the loading state on every cold start,
 * which feels broken on a phone.)
 */
function loadInitialState(): State {
  return {
    anchors: storage.get<Anchor[]>(STORAGE_KEYS.anchors, []),
    settings: { ...DEFAULT_SETTINGS, ...storage.get<AppSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS) },
    license: storage.get<LicenseState>(STORAGE_KEYS.license, { plan: 'free' }),
    order: [],
  };
}

const initialState: State = { anchors: [], settings: DEFAULT_SETTINGS, license: { plan: 'free' }, order: [] };

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitialState);
  const [ready, setReady] = useState(true);
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sensors, setSensors] = useState<SensorReadings>({
    heading: null,
    magneticAccuracy: null,
    hasAbsoluteHeading: false,
    pressure: null,
    steps: null,
  });
  const [storageBytes, setStorageBytes] = useState(0);
  const trailTarget = useRef<string | null>(null);

  /* ---------------- initial storage size ---------------- */
  useEffect(() => {
    setStorageBytes(storage.size());
  }, []);

  /* ---------------- persistence ---------------- */
  useEffect(() => {
    if (!ready) return;
    storage.set(STORAGE_KEYS.anchors, state.anchors);
    setStorageBytes(storage.size());
  }, [state.anchors, ready]);

  useEffect(() => {
    if (!ready) return;
    storage.set(STORAGE_KEYS.settings, state.settings);
  }, [state.settings, ready]);

  useEffect(() => {
    if (!ready) return;
    storage.set(STORAGE_KEYS.license, state.license);
  }, [state.license, ready]);

  /* ---------------- sensors & position ---------------- */
  useEffect(() => {
    let stop = () => {};
    void (async () => {
      await requestMotionPermission();
      stop = subscribeSensors(setSensors);
    })();
    return () => stop();
  }, []);

  useEffect(() => {
    let cancel = () => {};
    void (async () => {
      const initial = await getCurrentFix();
      if (initial) setFix(initial);
      cancel = await watchLocation({
        onUpdate: (next) => {
          setFix(next);
          setLocationError(null);
        },
        onError: (error) => setLocationError(error.message),
      });
    })();
    return () => cancel();
  }, []);

  /* ---------------- trail recording ---------------- */
  useEffect(() => {
    if (!trailTarget.current || !fix) return;
    dispatch({
      type: 'append-trail',
      id: trailTarget.current,
      point: {
        lat: fix.lat,
        lng: fix.lng,
        t: fix.timestamp,
        accuracy: fix.accuracy ?? 25,
      },
    });
  }, [fix]);

  /* ---------------- locale resolution ---------------- */
  const locale: 'de' | 'en' = useMemo(() => {
    if (state.settings.locale === 'auto') return detectLocale();
    return state.settings.locale;
  }, [state.settings.locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.dataset.locale = locale;
  }, [locale, state.settings.theme]);

  const plan: 'free' | 'pro' = state.license.plan;
  const limits = useMemo(() => limitsFor(plan), [plan]);

  const activeAnchors = useMemo(() => state.anchors.filter((a) => !a.archived), [state.anchors]);
  const archivedAnchors = useMemo(() => state.anchors.filter((a) => a.archived), [state.anchors]);

  const setAnchor = useCallback(
    (args: CreateAnchorArgs) => {
      const check = canAddAnchor(state.anchors, plan);
      if (!check.allowed) return { ok: false, reason: check.reason };
      const anchor = createAnchor(args);
      dispatch({ type: 'add-anchor', anchor });
      return { ok: true, anchor };
    },
    [state.anchors, plan],
  );

  const activateLicense = useCallback(async (token: string) => {
    const result = await verifyLicense(token);
    if (!result.ok || !result.payload) {
      return { ok: false, reason: result.reason ?? 'malformed' };
    }
    dispatch({
      type: 'set-license',
      license: {
        plan: 'pro',
        token: token.trim(),
        fingerprint: licenseFingerprint(token),
        activatedAt: Date.now(),
        via: result.payload.via,
      },
    });
    return { ok: true, payload: result.payload };
  }, []);

  const exportData = useCallback(() => {
    return JSON.stringify(
      {
        app: 'wAI',
        format: 1,
        exportedAt: new Date().toISOString(),
        anchors: state.anchors,
        settings: state.settings,
        license: state.license.token
          ? { plan: state.license.plan, token: state.license.token, fingerprint: state.license.fingerprint }
          : undefined,
      },
      null,
      2,
    );
  }, [state.anchors, state.settings, state.license]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      anchors: state.anchors,
      settings: state.settings,
      license: state.license,
      plan,
      limits,
      locale,
      setLocale: (next) => dispatch({ type: 'update-settings', patch: { locale: next } }),
      fix,
      sensors,
      locationError,
      demo: isDemo,
      setAnchor,
      updateAnchor: (id, patch) => {
        dispatch({ type: 'update-anchor', id, patch });
        const current = state.anchors.find((item) => item.id === id);
        return current ? { ...current, ...patch } : null;
      },
      deleteAnchor: (id) => dispatch({ type: 'delete-anchor', id }),
      archiveAnchor: (id, archived) => dispatch({ type: 'archive-anchor', id, archived }),
      toggleFavorite: (id) => dispatch({ type: 'toggle-favorite', id }),
      addPhoto: (id, photo) => dispatch({ type: 'add-photo', id, photo }),
      removePhoto: (id, photoId) => dispatch({ type: 'remove-photo', id, photoId }),
      addVoice: (id, voice) => dispatch({ type: 'add-voice', id, voice }),
      removeVoice: (id, voiceId) => dispatch({ type: 'remove-voice', id, voiceId }),
      appendTrail: (id, point) => dispatch({ type: 'append-trail', id, point }),
      clearTrail: (id) => dispatch({ type: 'clear-trail', id }),
      setParking: (id, parking) => dispatch({ type: 'set-parking', id, parking }),
      importAnchors: (anchors) => dispatch({ type: 'import-anchors', anchors }),
      activeAnchors,
      archivedAnchors,
      search: (options) => queryAnchors(state.anchors, options),
      updateSettings: (patch) => dispatch({ type: 'update-settings', patch }),
      activateLicense,
      deactivateLicense: () => dispatch({ type: 'set-license', license: { plan: 'free' } }),
      exportData,
      clearAllData: () => {
        storage.clearAll();
        dispatch({ type: 'clear-all' });
      },
      storageBytes,
      requestPermissions: async () => {
        await requestMotionPermission();
        const initial = await getCurrentFix();
        if (initial) setFix(initial);
      },
    }),
    [
      ready,
      state,
      plan,
      limits,
      locale,
      fix,
      sensors,
      locationError,
      setAnchor,
      activeAnchors,
      archivedAnchors,
      activateLicense,
      exportData,
      storageBytes,
    ],
  );

  // Expose the trail recorder to other components without prop drilling.
  useEffect(() => {
    (window as unknown as { __waiSetTrailTarget?: (id: string | null) => void }).__waiSetTrailTarget = (
      id: string | null,
    ) => {
      trailTarget.current = id;
    };
  }, []);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export const startTrailRecording = (anchorId: string) => {
  (window as unknown as { __waiSetTrailTarget?: (id: string | null) => void }).__waiSetTrailTarget?.(
    anchorId,
  );
};

export const stopTrailRecording = () => {
  (window as unknown as { __waiSetTrailTarget?: (id: string | null) => void }).__waiSetTrailTarget?.(null);
};

/** Create a photo/voice reference with sane defaults. */
export const makePhotoRef = (file: string, heading?: number): PhotoRef => ({
  id: newId(),
  file,
  heading: typeof heading === 'number' ? heading : undefined,
  takenAt: Date.now(),
});

export const makeVoiceRef = (file: string, durationMs: number, mime: string): VoiceRef => ({
  id: newId(),
  file,
  durationMs,
  recordedAt: Date.now(),
  mime,
});

export const issuerKey = import.meta.env.VITE_WAI_ISSUER_KEY ?? DEFAULT_ISSUER_PUBLIC_KEY;
