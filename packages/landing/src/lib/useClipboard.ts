import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Clipboard with graceful fallback (the preview iframe may block the async API)
 * plus a self-clearing "copied" state for button feedback.
 */
export function useClipboard(resetMs = 1800) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string, key = text) => {
      try {
        if (navigator.clipboard?.writeText && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const el = document.createElement('textarea');
          el.value = text;
          el.setAttribute('readonly', '');
          el.style.position = 'fixed';
          el.style.opacity = '0';
          document.body.appendChild(el);
          el.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(el);
          if (!ok) throw new Error('execCommand failed');
        }
        setCopiedKey(key);
        setError(null);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopiedKey(null), resetMs);
        return true;
      } catch {
        setError('copy-failed');
        return false;
      }
    },
    [resetMs],
  );

  return { copy, copiedKey, isCopied: (key: string) => copiedKey === key, error };
}
