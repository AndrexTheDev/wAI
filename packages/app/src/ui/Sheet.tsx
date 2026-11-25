import { useEffect, useRef, type ReactNode } from 'react';
import { Cross } from './icons';

/**
 * Bottom sheet used for every modal flow (new anchor, edit, share, Pro, …).
 * Handles Escape, backdrop click, body scroll lock and focus restore.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  labelledBy = 'sheet-title',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button:not([data-skip-autofocus])',
      );
      focusable?.focus();
    }, 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
      restoreFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        <div className="sheet__grab" />
        <header className="sheet__head">
          <h2 className="sheet__title" id={labelledBy}>
            {title}
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close"
            data-skip-autofocus
            style={{ marginLeft: 'auto' }}
          >
            <Cross size={17} />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__foot">{footer}</footer>}
      </div>
    </>
  );
}
