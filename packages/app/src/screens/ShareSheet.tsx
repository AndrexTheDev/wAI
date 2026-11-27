import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  anchorToShare,
  buildShareLink,
  encodeSharePayload,
  PRODUCT,
  type Anchor,
} from '@wai/shared';
import { useApp, makePhotoRef } from '../store/AppStore';
import { anchorFromShareCode } from '../store/shareImport';
import { useT } from '../i18n/useT';
import { useToast } from '../ui/Toast';
import { Sheet } from '../ui/Sheet';
import { saveExportFile, shareText } from '../platform/native';
import { Camera, Check, Copy, Crown, Download, QrIcon, Share } from '../ui/icons';

/**
 * Sharing without a server: a compact text code, a QR code, or a full JSON pack
 * (Pro) that includes the note and media references.
 */
const SITE = import.meta.env.VITE_WEBSITE_URL ?? PRODUCT.website;

export function ShareSheet({
  anchor,
  open,
  onClose,
  onUpgrade,
}: {
  anchor: Anchor | null;
  open: boolean;
  onClose: () => void;
  onUpgrade: (reason: string) => void;
}) {
  const { t, locale } = useT();
  const { plan, importAnchors, addPhoto } = useApp();
  const toast = useToast();
  const [includeNote, setIncludeNote] = useState(true);
  const [importCode, setImportCode] = useState('');
  const [showQr, setShowQr] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const code = useMemo(() => (anchor ? encodeSharePayload(anchorToShare(anchor, includeNote)) : ''), [anchor, includeNote]);
  /**
   * A share link is a normal https URL with the code in the fragment — the
   * fragment never reaches the host, so the coordinates stay local. Messengers
   * render it as a preview card, and without the app the web page explains the
   * anchor and offers the hand-off.
   */
  const shareLink = useMemo(() => (code ? buildShareLink(code, SITE) : ''), [code]);

  useEffect(() => {
    if (!showQr || !canvasRef.current || !code) return;
    // The QR code carries the share link: scanning it on a phone opens the web
    // preview, which hands the anchor over to the app. The bare code stays
    // available above for offline copying.
    void QRCode.toCanvas(canvasRef.current, shareLink || code, {
      width: 340,
      margin: 1,
      errorCorrectionLevel: 'L',
      color: { dark: '#07101c', light: '#ffffff' },
    }).catch(() => {});
  }, [showQr, shareLink, code]);

  if (!anchor) return null;

  const shareAsText = async () => {
    const payload = anchorToShare(anchor, includeNote);
    const readable = `${anchor.name || t('app.anchor.untitled')}\n${payload.a.lat}, ${payload.a.lng}\n${includeNote && anchor.note ? anchor.note + '\n' : ''}\n${code}`;
    const result = await shareText(readable, anchor.name || 'wAI');
    if (result === 'copied') toast.show(t('common.copiedToClipboard'), 'ok');
    if (result === 'failed') toast.show(t('app.errors.share'), 'err');
  };

  const shareAsFile = async () => {
    if (plan !== 'pro') {
      onUpgrade(t('app.anchor.mediaPackUnavailable'));
      return;
    }
    const pack = {
      app: 'wAI',
      format: 'waipack',
      version: 1,
      exportedAt: new Date().toISOString(),
      code,
      anchor: {
        ...anchor,
        photos: anchor.photos.map((photo) => ({ ...photo, file: photo.file.startsWith('data:') ? photo.file : undefined })),
      },
    };
    const filename = `wai-${(anchor.name || 'anchor').replace(/[^\w-]+/g, '_').slice(0, 30)}.waipack.json`;
    const path = await saveExportFile(filename, JSON.stringify(pack, null, 2));
    toast.show(path ? t('app.share.fileSaved', { path }) : t('app.errors.generic'), path ? 'ok' : 'err');
  };

  const doImport = () => {
    const anchor = anchorFromShareCode(importCode);
    if (!anchor) {
      toast.show(t('app.share.invalid'), 'err');
      return;
    }
    importAnchors([anchor]);
    setImportCode('');
    toast.show(t('app.share.imported'), 'ok');
    onClose();
  };

  /**
   * A share link is a normal https URL with the code in the fragment — the
   * fragment never reaches the host, so the coordinates stay local. Messengers
   * turn it into a preview card, and without the app the web page explains the
   * anchor and offers the hand-off.
   */
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.show(t('common.copiedToClipboard'), 'ok');
    } catch {
      toast.show(t('app.errors.generic'), 'err');
    }
  };

  const shareAsLink = async () => {
    const title = anchor.name || t('app.anchor.untitled');
    const coords = `${anchor.lat.toFixed(5)}, ${anchor.lng.toFixed(5)}`;
    const text = `${title} · ${coords}\n${shareLink}`;
    const result = await shareText(text, title);
    if (result === 'copied') toast.show(t('common.copiedToClipboard'), 'ok');
    if (result === 'failed') toast.show(t('app.errors.share'), 'err');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('app.share.title')}
      closeLabel={t('common.ctaClose')}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={() => setShowQr((value) => !value)}>
            <QrIcon size={15} /> {t('app.share.asQr')}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void shareAsLink()}>
            <Share size={15} /> {t('app.share.asLink')}
          </button>
        </>
      }
    >
      <p className="muted">{t('app.share.subtitle')}</p>

      <div className="card">
        <div className="row row--between">
          <span className="field__label">{t('app.share.asText')}</span>
          {/**
            * Der Schalter stand ohne sichtbare Beschriftung neben der
            * Überschrift „Als Text" – man musste raten, was er schaltet, und die
            * Erklärung erschien erst unter dem Code. Jetzt steht sie daneben,
            * der Zustand ist ablesbar, und die Zeile darunter wiederholt ihn
            * nicht mehr.
            */}
          <button
            type="button"
            className="share__toggle"
            role="switch"
            aria-checked={includeNote}
            onClick={() => setIncludeNote((value) => !value)}
          >
            <span className="switch" aria-hidden="true" data-on={includeNote ? '1' : '0'} />
            <span>
              {includeNote ? t('app.anchor.shareFull') : t('app.anchor.sharePositionOnly')}
            </span>
          </button>
        </div>
        {/*
          Der Code ist ein Schlüssel, kein Lesetext: er stand als vierzeiliger
          Zeichensalat mitten im Bild (Store-Screenshot 05) und drängte die
          eigentliche Aussage – „Kein Server beteiligt" – an den Rand. Deshalb:
          gekürzt, in einer Zeile, mit Kopierknopf. Der vollständige Code bleibt
          über „Kopieren" und den Link zugänglich.
        */}
        <code className="share__code mono" title={code}>
          {code.slice(0, 18)}…{code.slice(-6)}
        </code>
        <div className="row" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn btn--xs"
            onClick={() => {
              void navigator.clipboard?.writeText(code);
              toast.show(t('common.copiedToClipboard'), 'ok');
            }}
          >
            <Copy size={12} /> {t('common.ctaCopy')}
          </button>
          <span className="muted">{t('app.share.codeHint')}</span>
        </div>
      </div>

      <div className="card">
        <div className="row row--between">
          <span className="field__label">{t('app.share.asLink')}</span>
        </div>
        <code className="share__code mono" title={shareLink}>
          {`${shareLink.slice(0, 34)}…${shareLink.slice(-8)}`}
        </code>
        <div className="row" style={{ marginTop: 8 }}>
          <button type="button" className="btn btn--xs" onClick={() => void copyLink()}>
            <Copy size={12} /> {t('app.share.copyLink')}
          </button>
          <span className="muted">{t('app.share.linkHint')}</span>
        </div>
      </div>

      {showQr && (
        <div className="card" style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
          <div className="qr-frame">
            <canvas ref={canvasRef} />
          </div>
          <p className="muted">{t('app.share.qrHint')}</p>
        </div>
      )}

      <button type="button" className="btn btn--block" onClick={() => void shareAsFile()}>
        <Download size={15} /> {t('app.share.asFile')} {plan === 'pro' ? '' : <Crown size={12} />}
      </button>
      <p className="muted">{t('app.share.mediaProNote')}</p>

      <hr className="divider" />

      <label className="field">
        <span className="field__label">{t('app.share.importTitle')}</span>
        <textarea
          className="field__textarea mono"
          value={importCode}
          onChange={(event) => setImportCode(event.target.value)}
          placeholder="WAIX1.…"
          spellCheck={false}
        />
        <span className="field__help">{t('app.share.importBody')}</span>
      </label>
      <button type="button" className="btn btn--sm" disabled={!importCode.trim()} onClick={doImport}>
        <Check size={14} /> {t('app.share.importCta')}
      </button>
    </Sheet>
  );
}
