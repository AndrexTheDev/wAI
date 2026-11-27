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
  closeLabel = 'Schließen',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  labelledBy?: string;
  /** Screenreader-Label des Schließen-Knopfs – war fest auf Englisch. */
  closeLabel?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    /**
     * Escape schließt, Tab bleibt im Sheet.
     *
     * Die Fokus-Falle fehlte hier, obwohl das Confirm-Overlay sie hatte: im Sheet
     * (Editor, Teilen, Timer, Pro) wanderte der Fokus mit Tab in die Seite
     * dahinter, während `aria-modal="true"` das Gegenteil behauptet. Ein
     * Screenreader-Nutzer landete damit in Inhalten, die verdeckt sind.
     */
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      // Fokus außerhalb (z. B. nach Klick auf den Hintergrund): zurück ins Sheet.
      if (!active || !panelRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => {
      // Kein Klick-Chip als erstes Fokusziel: das sieht aus wie eine Auswahl.
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button:not([data-skip-autofocus]):not(.chip)',
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
            aria-label={closeLabel}
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
