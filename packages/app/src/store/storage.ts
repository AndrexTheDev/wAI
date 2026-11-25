/**
 * Key/value persistence with a graceful in-memory fallback.
 *
 * Android WebView → localStorage (persisted in the app's private data dir).
 * Private-mode browsers → in-memory map so the demo never crashes.
 */
export interface KVStore {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  keys(): string[];
  /** Approximate size of all wAI keys in bytes – shown in settings. */
  size(): number;
  clearAll(): void;
}

const PREFIX = 'wai.v1.';

class MemoryStore implements KVStore {
  private map = new Map<string, string>();
  get<T>(key: string, fallback: T): T {
    const raw = this.map.get(PREFIX + key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  set<T>(key: string, value: T): void {
    this.map.set(PREFIX + key, JSON.stringify(value));
  }
  remove(key: string): void {
    this.map.delete(PREFIX + key);
  }
  keys(): string[] {
    return [...this.map.keys()].map((k) => k.slice(PREFIX.length));
  }
  size(): number {
    let total = 0;
    for (const [key, value] of this.map) total += key.length + value.length;
    return total * 2; // UTF-16 code units → bytes
  }
  clearAll(): void {
    this.map.clear();
  }
}

class BrowserStore implements KVStore {
  constructor(private storage: Storage) {}
  get<T>(key: string, fallback: T): T {
    try {
      const raw = this.storage.getItem(PREFIX + key);
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  set<T>(key: string, value: T): void {
    try {
      this.storage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* quota exceeded – the caller shows a storage warning */
    }
  }
  remove(key: string): void {
    try {
      this.storage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  }
  keys(): string[] {
    const out: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(PREFIX)) out.push(key.slice(PREFIX.length));
    }
    return out;
  }
  size(): number {
    let total = 0;
    for (const key of this.keys()) {
      const raw = this.storage.getItem(PREFIX + key) ?? '';
      total += (PREFIX.length + key.length + raw.length) * 2;
    }
    return total;
  }
  clearAll(): void {
    this.keys().forEach((key) => this.remove(key));
  }
}

function createStore(): KVStore {
  try {
    const probe = '__wai_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return new BrowserStore(window.localStorage);
  } catch {
    return new MemoryStore();
  }
}

export const storage: KVStore = createStore();

export const STORAGE_KEYS = {
  anchors: 'anchors',
  settings: 'settings',
  license: 'license',
  onboarding: 'onboarding',
} as const;
