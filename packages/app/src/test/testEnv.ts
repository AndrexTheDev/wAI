/** Minimal browser shims for the app render smoke test (node, no DOM). */
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

const globals = globalThis as unknown as Record<string, unknown>;

globals.window = {
  location: { pathname: '/', search: '?embed=1', hash: '', href: 'http://localhost/', origin: 'http://localhost' },
  localStorage: memoryStorage(),
  sessionStorage: memoryStorage(),
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  clearInterval: () => {},
  confirm: () => true,
  open: () => null,
  parent: null,
  isSecureContext: false,
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
};

globals.document = {
  documentElement: { lang: 'de', dataset: {} },
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {} }),
  addEventListener: () => {},
  removeEventListener: () => {},
  body: { style: {}, appendChild: () => {}, removeChild: () => {} },
};

Object.defineProperty(globals, 'navigator', {
  value: { languages: ['de-DE'], language: 'de-DE', onLine: false },
  configurable: true,
  writable: true,
});

globals.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globals.AudioContext = class {
  state = 'running';
  currentTime = 0;
  destination = null;
  resume() {}
  createOscillator() {
    return { frequency: {}, connect: () => ({ connect: () => {} }), start: () => {}, stop: () => {} };
  }
  createGain() {
    return {
      gain: { value: 0, exponentialRampToValueAtTime: () => {} },
      connect: () => ({ connect: () => {} }),
    };
  }
};

(window.parent as unknown) === null;
Object.defineProperty(window, 'parent', { value: window, configurable: true });
