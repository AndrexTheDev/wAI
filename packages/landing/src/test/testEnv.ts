/**
 * Minimal SSR/browser shim for the render smoke test.
 * The real app reads `window.location` and `localStorage`; node has neither.
 */
interface TestWindow {
  location: { pathname: string; search: string; href: string; origin: string; hash: string };
  localStorage: Storage;
  sessionStorage: Storage;
  addEventListener: () => void;
  removeEventListener: () => void;
  scrollTo: () => void;
  history: { pushState: () => void; replaceState: () => void };
  matchMedia: () => { matches: boolean; addEventListener: () => void; removeEventListener: () => void };
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  setInterval: typeof setInterval;
  clearInterval: typeof clearInterval;
  isSecureContext: boolean;
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  } as Storage;
}

let currentPath = '/';
let currentLocale = 'de';

export function setTestPath(path: string, locale: 'de' | 'en'): void {
  currentPath = path;
  currentLocale = locale;
  const win = globalThis as unknown as { window?: TestWindow };
  if (win.window) {
    win.window.location.pathname = path;
    win.window.location.search = `?lang=${locale}`;
    win.window.localStorage.setItem('wai.locale', locale);
  }
}

const testWindow: TestWindow = {
  location: {
    get pathname() {
      return currentPath;
    },
    set pathname(value: string) {
      currentPath = value;
    },
    get search() {
      return `?lang=${currentLocale}`;
    },
    set search(_value: string) {},
    hash: '',
    href: 'http://localhost/',
    origin: 'http://localhost',
  },
  localStorage: memoryStorage(),
  sessionStorage: memoryStorage(),
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  history: { pushState: () => {}, replaceState: () => {} },
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  isSecureContext: false,
};

(testWindow.localStorage as Storage).setItem('wai.locale', 'de');

const globals = globalThis as unknown as Record<string, unknown>;
globals.window = testWindow;
globals.document = {
  documentElement: { lang: 'de', dataset: {} },
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: () => ({ style: {}, setAttribute: () => {}, select: () => {} }),
  body: { appendChild: () => {}, removeChild: () => {}, style: {} },
} as unknown as Document;
Object.defineProperty(globals, 'navigator', {
  value: { languages: ['de-DE', 'en'], language: 'de-DE' },
  configurable: true,
  writable: true,
});
globals.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
