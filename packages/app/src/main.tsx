import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './store/AppStore';
import { ToastProvider } from './ui/Toast';
import { AppShell } from './screens/AppShell';
import './styles/app.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root missing');

/**
 * Notify the marketing site when embedded, so the language switcher in the
 * site header stays in sync with the app and the "exit demo" button works.
 */
function connectHost() {
  if (window.parent === window) return;
  const send = (type: string, payload: Record<string, unknown> = {}) => {
    try {
      window.parent.postMessage({ type, ...payload }, window.location.origin);
    } catch {
      /* ignore */
    }
  };
  const observer = new MutationObserver(() => send('wai:locale', { locale: document.documentElement.lang }));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}

connectHost();

createRoot(container).render(
  <StrictMode>
    <AppProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AppProvider>
  </StrictMode>,
);
