import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  anchorToShare,
  decodeSharePayload,
  encodeSharePayload,
  formatDistance,
  sanitizeImportedAnchor,
  type Anchor,
} from '@wai/shared';
import { useApp, makePhotoRef } from '../store/AppStore';
import { useT } from '../i18n/useT';
import { useToast } from '../ui/Toast';
import { Sheet } from '../ui/Sheet';
import { saveExportFile, shareText } from '../platform/native';
import { Camera, Check, Copy, Crown, Download, QrIcon, Share } from '../ui/icons';

/**
 * Sharing without a server: a compact text code, a QR code, or a full JSON pack
 * (Pro) that includes the note and media references.
 */
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

  useEffect(() => {
    if (!showQr || !canvasRef.current || !code) return;
    void QRCode.toCanvas(canvasRef.current, code, {
      width: 340,
      margin: 1,
      errorCorrectionLevel: 'L',
      color: { dark: '#07101c', light: '#ffffff' },
    }).catch(() => {});
  }, [showQr, code]);

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
    const payload = decodeSharePayload(importCode);
    if (!payload) {
      toast.show(t('app.share.invalid'), 'err');
      return;
    }
    const data = sanitizeImportedAnchor(payload.a);
    if (!data) {
      toast.show(t('app.share.invalid'), 'err');
      return;
    }
    const now = Date.now();
    importAnchors([
      {
        id: `a_${now.toString(16)}${Math.random().toString(16).slice(2, 6)}`,
        name: data.n ?? '',
        category: data.cat ?? 'other',
        lat: data.lat,
        lng: data.lng,
        altitude: data.alt,
        source: 'import',
        createdAt: data.t ?? now,
        updatedAt: now,
        note: data.note,
        zone: data.zone,
        photos: [],
        voices: [],
        favorite: false,
        archived: false,
        trail: [],
      },
    ]);
    setImportCode('');
    toast.show(t('app.share.imported'), 'ok');
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('app.share.title')}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={() => setShowQr((value) => !value)}>
            <QrIcon size={15} /> {t('app.share.asQr')}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void shareAsText()}>
            <Share size={15} /> {t('app.share.asText')}
          </button>
        </>
      }
    >
      <p className="muted">{t('app.share.subtitle')}</p>

      <div className="card">
        <div className="row row--between">
          <span className="field__label">{t('app.share.asText')}</span>
          <button
            type="button"
            className={`switch ${includeNote ? 'is-on' : ''}`}
            role="switch"
            aria-checked={includeNote}
            onClick={() => setIncludeNote((value) => !value)}
            aria-label={t('app.anchor.shareFull')}
          />
        </div>
        <code className="mono" style={{ display: 'block', wordBreak: 'break-all', marginTop: 8, fontSize: 10.5, color: 'var(--text-3)' }}>
          {code}
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
          <span className="muted">{includeNote ? t('app.anchor.shareFull') : t('app.anchor.sharePositionOnly')}</span>
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
