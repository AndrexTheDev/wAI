import { useEffect, useRef, type ReactNode } from 'react';
import { Cross } from './icons';

/**
 * In-app confirmation instead of `window.confirm`.
 *
 * The native dialog was the only English text in a German app (the WebView
 * renders the system wording), it ignores the theme, and on Android it looks
 * like a crash prompt. This one is bilingual, focus-trapped and cancel-first.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    // Focus the *cancel* action: destructive actions must not be one Enter away.
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }, 40);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      // Keep the focus inside the dialog.
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>('button');
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
      previous?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <>
      <div className="sheet-backdrop sheet-backdrop--solid" onClick={onCancel} aria-hidden="true" />
      <div className="confirm" role="alertdialog" aria-modal="true" ref={panelRef} aria-labelledby="confirm-title">
        <div className="confirm__head">
          <h2 id="confirm-title" className="confirm__title">
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label={cancelLabel} data-autofocus>
            <Cross size={16} />
          </button>
        </div>
        {body && <div className="confirm__body">{body}</div>}
        <div className="confirm__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} data-autofocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
