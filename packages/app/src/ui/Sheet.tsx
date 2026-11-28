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
  // The parent may create a new callback on every render. Keep the latest
  // callback without reopening the focus trap or resetting the user's focus.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  /**
   * Markiert den Körper, solange ein Sheet offen ist.
   *
   * Der Toast sitzt fest über der Tab-Leiste – im offenen Editor liegt dort
   * aber die Fußzeile des Sheets. Die Meldung „Anker gesetzt · Rückgängig"
   * verdeckte damit genau die Knöpfe, die sie betrifft: „Rückgängig" war nicht
   * antippbar. Mit dieser Markierung wandert der Toast über den Sheet-Fuß
   * (Regel `body[data-sheet-open] .toast-wrap`). Zähler statt Flag, weil zwei Sheets
   * gleichzeitig offen sein können (Editor + Bestätigung).
   */
  useEffect(() => {
    if (!open) return;
    const root = document.body;
    const count = Number(root.dataset.sheetOpen ?? '0') + 1;
    root.dataset.sheetOpen = String(count);
    /**
     * Die Fußzeile ist unterschiedlich hoch: 69 px, sobald alle Knöpfe in eine
     * Zeile passen, 113 px wenn die Hauptaktion umbricht (schmale Telefone).
     * Deshalb wird sie gemessen statt geraten.
     */
    const footer = panelRef.current?.querySelector<HTMLElement>('.sheet__foot');
    const observer = footer ? new ResizeObserver(() => root.style.setProperty('--sheet-foot-h', `${Math.round(footer.getBoundingClientRect().height)}px`)) : null;
    if (footer && observer) {
      root.style.setProperty('--sheet-foot-h', `${Math.round(footer.getBoundingClientRect().height)}px`);
      observer.observe(footer);
    }
    return () => {
      observer?.disconnect();
      root.style.removeProperty('--sheet-foot-h');
      const left = Number(root.dataset.sheetOpen ?? '1') - 1;
      if (left <= 0) delete root.dataset.sheetOpen;
      else root.dataset.sheetOpen = String(left);
    };
  }, [open]);

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
        onCloseRef.current();
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
    /**
     * Beim Öffnen gehört der Blick (und der Fokus) an den Anfang des Sheets –
     * nicht auf das erste Bedienelement darin. In „Hilfe & Fragen" war das der
     * erste FAQ-Knopf: das Sheet sprang mitten in die Liste, die Überschrift und
     * der erste Absatz lagen darüber und waren weg. Ein Nutzer liest von oben.
     *
     * `preventScroll` ist Absicht: das Sheet soll mit `scrollTop = 0` starten,
     * nicht dorthin scrollen, wo irgendein Element gerade steht.
     */
    panelRef.current?.scrollTo?.({ top: 0 });
    const body = panelRef.current?.querySelector<HTMLElement>('.sheet__body');
    if (body) {
      body.scrollTop = 0;
      body.setAttribute('tabindex', '-1');
      body.focus({ preventScroll: true });
    }
    const timer = window.setTimeout(() => {
      // Nur wenn der Inhalt keinen eigenen Fokuspunkt hat, etwas darin fokussieren.
      if (body && document.activeElement === body) return;
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'input, textarea, select, button:not([data-skip-autofocus]):not(.chip)',
      );
      focusable?.focus({ preventScroll: true });
    }, 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
      restoreFocus.current?.focus?.();
    };
  }, [open]);

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
