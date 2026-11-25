import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Cross, Info } from './icons';

type ToastKind = 'ok' | 'warn' | 'err' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind, action?: ToastItem['action']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastKind, typeof Check> = { ok: Check, warn: Info, err: Cross, info: Info };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef<number[]>([]);

  const show = useCallback((message: string, kind: ToastKind = 'ok', action?: ToastItem['action']) => {
    const id = ++counter.current;
    setItems((prev) => [...prev.slice(-2), { id, message, kind, action }]);
    const timer = window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, action ? 5200 : 2800);
    timers.current.push(timer);
  }, []);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {items.map((item) => {
          const Icon = ICONS[item.kind];
          return (
            <div key={item.id} className={`toast-item toast-item--${item.kind}`}>
              <Icon size={15} />
              <span style={{ flex: 1 }}>{item.message}</span>
              {item.action && (
                <button
                  type="button"
                  className="btn btn--xs"
                  onClick={() => {
                    item.action?.onClick();
                    setItems((prev) => prev.filter((x) => x.id !== item.id));
                  }}
                >
                  {item.action.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
