import { useEffect, useMemo, useState } from 'react';
import {
  canAddNote,
  canAddPhoto,
  canAddVoice,
  tArray,
  type Anchor,
  type AnchorCategory,
} from '@wai/shared';
import { useApp, makePhotoRef, makeVoiceRef } from '../store/AppStore';
import { useT } from '../i18n/useT';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { capturePhoto, startVoiceRecording, vibrate } from '../platform/native';
import {
  CATEGORY_ICONS,
  Camera,
  Check,
  Crown,
  Cross,
  Mic,
  Play,
  StopMic,
  Trash,
  Copy,
  Share,
  Timer,
} from '../ui/icons';

const CATEGORIES: AnchorCategory[] = ['car', 'tent', 'meeting', 'tool', 'entrance', 'nature', 'other'];

interface DraftState {
  name: string;
  category: AnchorCategory;
  note: string;
  zone: string;
  floorLabel: string;
}

const emptyDraft = (): DraftState => ({
  name: '',
  category: 'other',
  note: '',
  zone: '',
  floorLabel: '',
});

/**
 * Combined create + edit sheet. Creating is intentionally frictionless: the
 * anchor already exists (created on tap), this sheet only enriches it – and it
 * can be dismissed at any time without losing the anchor.
 */
export function AnchorEditor({
  anchor,
  mode,
  open,
  onClose,
  onUpgrade,
  onShare,
  onTimer,
}: {
  anchor: Anchor | null;
  mode: 'create' | 'edit';
  open: boolean;
  onClose: () => void;
  onUpgrade: (reason: string) => void;
  onShare: (anchor: Anchor) => void;
  onTimer: (anchor: Anchor) => void;
}) {
  const { t, locale } = useT();
  const {
    plan,
    updateAnchor,
    deleteAnchor,
    addPhoto,
    removePhoto,
    addVoice,
    removeVoice,
    sensors,
    fix,
    toggleFavorite,
    archiveAnchor,
  } = useApp();
  const toast = useToast();
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [recording, setRecording] = useState<ReturnType<typeof startVoiceRecording> extends Promise<infer R> ? R : never>(null);
  const [recordMs, setRecordMs] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    if (!anchor) return;
    setDraft({
      name: anchor.name,
      category: anchor.category,
      note: anchor.note ?? '',
      zone: anchor.zone ?? '',
      floorLabel: anchor.floorLabel ?? '',
    });
  }, [anchor?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordMs((value) => value + 200), 200);
    return () => window.clearInterval(timer);
  }, [recording]);

  const createdLabel = useMemo(() => {
    if (!anchor) return '';
    return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(anchor.createdAt));
  }, [anchor, locale]);

  if (!anchor) return null;

  const persist = (patch: Partial<Anchor>): Anchor | null => updateAnchor(anchor.id, patch);

  /**
   * Writes the current draft to the store. Returns the anchor that *is* stored
   * afterwards (the committed one, or the fallback we just created) so callers
   * can chain an action such as share or timer without reopening a sheet.
   */
  const commit = (close = true): Anchor | null => {
    const saved = persist({
      name: draft.name.trim(),
      category: draft.category,
      note: draft.note.trim() || undefined,
      zone: draft.zone.trim() || undefined,
      floorLabel: draft.floorLabel.trim() || undefined,
    });
    if (close) {
      void vibrate('tap');
      onClose();
    }
    return saved ?? anchor;
  };

  const onAddPhoto = async (source: 'camera' | 'gallery') => {
    const check = canAddPhoto(anchor, plan);
    const noteCheck = canAddNote(anchor, plan, 'photo');
    if (!noteCheck.allowed) {
      onUpgrade(t('app.pro.mediaBanner'));
      return;
    }
    if (!check.allowed) {
      onUpgrade(t('app.pro.mediaBanner'));
      return;
    }
    const captured = await capturePhoto(source);
    if (!captured) {
      toast.show(t('app.errors.camera'), 'err');
      return;
    }
    addPhoto(anchor.id, makePhotoRef(captured.stored, sensors.heading ?? undefined));
    void vibrate('tap');
  };

  const onToggleRecording = async () => {
    if (recording) {
      const result = await recording.stop();
      setRecording(null);
      setRecordMs(0);
      if (result) {
        addVoice(anchor.id, makeVoiceRef(result.stored, result.durationMs, result.mime));
        toast.show(t('app.anchor.voice'), 'ok');
      }
      return;
    }
    const check = canAddVoice(anchor, plan);
    if (!check.allowed) {
      onUpgrade(t('app.pro.voiceBanner'));
      return;
    }
    const started = await startVoiceRecording();
    if (!started) {
      toast.show(t('app.errors.mic'), 'err');
      return;
    }
    setRecordMs(0);
    setRecording(started);
  };

  const playVoice = (url: string, id: string) => {
    try {
      const audio = new Audio(url);
      setPlaying(id);
      audio.onended = () => setPlaying(null);
      void audio.play();
    } catch {
      setPlaying(null);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={() => commit(true)}
      title={mode === 'create' ? t('app.anchor.newAnchor') : t('app.anchor.edit')}
      footer={
        <>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const target = commit(true);
              if (target) onShare(target);
            }}
            aria-label={t('app.anchor.share')}
          >
            <Share size={15} /> {t('app.anchor.share')}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              const target = commit(true);
              if (target) onTimer(target);
            }}
            aria-label={t('app.timer.title')}
          >
            <Timer size={15} /> {t('app.timer.title')}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => commit(true)}>
            <Check size={16} /> {mode === 'create' ? t('app.anchor.save') : t('common.ctaSave')}
          </button>
        </>
      }
    >
      <p className="muted">
        {t('app.anchor.parkedAt')}: {createdLabel}
        {typeof anchor.altitude === 'number' && ` · ${t('app.anchor.altitude')} ${Math.round(anchor.altitude)} m`}
        {typeof anchor.accuracy === 'number' && ` · ±${Math.round(anchor.accuracy)} m`}
      </p>

      <label className="field">
        <span className="field__label">{t('app.anchor.name')}</span>
        <input
          className="field__input"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder={t('app.anchor.namePlaceholder')}
          maxLength={80}
        />
      </label>

      <div className="field">
        <span className="field__label">{t('app.anchor.category')}</span>
        <div className="category-grid">
          {CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category];
            return (
              <button
                key={category}
                type="button"
                className={`category-btn ${draft.category === category ? 'is-active' : ''}`}
                onClick={() => setDraft({ ...draft, category })}
                aria-pressed={draft.category === category}
              >
                <Icon size={17} />
                {t(`app.anchor.categories.${category}`)}
              </button>
            );
          })}
        </div>
      </div>

      <label className="field">
        <span className="field__label">
          {t('app.anchor.note')}
          {plan === 'free' && <span className="muted"> · {t('common.free')}</span>}
        </span>
        <textarea
          className="field__textarea"
          value={draft.note}
          onChange={(event) => setDraft({ ...draft, note: event.target.value })}
          placeholder={t('app.anchor.notePlaceholder')}
          maxLength={2000}
        />
      </label>

      <div className="field">
        <span className="field__label">
          {t('app.anchor.zone')}
        </span>
        <input
          className="field__input"
          value={draft.zone}
          onChange={(event) => setDraft({ ...draft, zone: event.target.value })}
          placeholder={t('app.anchor.zonePlaceholder')}
          maxLength={200}
        />
      </div>

      <div className="field">
        <span className="field__label">{t('app.anchor.photo')}</span>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--sm" onClick={() => void onAddPhoto('camera')}>
            <Camera size={15} /> {t('app.anchor.takePhoto')}
          </button>
          <button type="button" className="btn btn--sm" onClick={() => void onAddPhoto('gallery')}>
            {t('app.anchor.pickPhoto')}
          </button>
          {plan === 'free' && <span className="mini-badge mini-badge--pro">PRO ∞</span>}
        </div>
        {anchor.photos.length > 0 && (
          <div className="photo-strip" style={{ marginTop: 8 }}>
            {anchor.photos.map((photo) => (
              <div key={photo.id} style={{ position: 'relative', flex: 'none' }}>
                <img className="reference-photo" src={photo.file} alt={t('app.find.photoRef')} />
                <button
                  type="button"
                  className="icon-btn"
                  style={{ position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 8 }}
                  onClick={() => removePhoto(anchor.id, photo.id)}
                  aria-label={t('common.ctaClose')}
                >
                  <Cross size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <span className="field__label">
          {t('app.anchor.voice')} {plan === 'free' && <span className="mini-badge mini-badge--pro">PRO</span>}
        </span>
        <div className="row">
          <button
            type="button"
            className={`btn btn--sm ${recording ? 'btn--danger' : ''}`}
            onClick={() => void onToggleRecording()}
          >
            {recording ? <StopMic size={15} /> : <Mic size={15} />}
            {recording ? t('app.anchor.stopVoice') : t('app.anchor.recordVoice')}
          </button>
          {recording && (
            <span className="mono" style={{ color: 'var(--danger)' }}>
              {t('app.anchor.voiceSeconds', { seconds: Math.round(recordMs / 1000) })}
            </span>
          )}
        </div>
        {anchor.voices.length > 0 && (
          <div style={{ display: 'grid', gap: 6, marginTop: 6 }}>
            {anchor.voices.map((voice) => (
              <div key={voice.id} className="row" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn--xs" onClick={() => playVoice(voice.file, voice.id)}>
                  <Play size={12} /> {playing === voice.id ? t('app.anchor.playing') : `${Math.round(voice.durationMs / 1000)}s`}
                </button>
                <button type="button" className="icon-btn" onClick={() => removeVoice(anchor.id, voice.id)} aria-label={t('common.ctaClose')}>
                  <Trash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {mode === 'edit' && (
        <>
          <hr className="divider" />
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            <button type="button" className="btn btn--sm" onClick={() => toggleFavorite(anchor.id)}>
              ★ {t('app.anchor.favorite')}
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                archiveAnchor(anchor.id, !anchor.archived);
                onClose();
              }}
            >
              {t('app.anchor.archive')}
            </button>
            <button
              type="button"
              className="btn btn--sm btn--danger"
              onClick={() => {
                if (window.confirm(t('app.anchor.deleteConfirm'))) {
                  deleteAnchor(anchor.id);
                  onClose();
                }
              }}
            >
              <Trash size={14} /> {t('app.anchor.delete')}
            </button>
          </div>
          {typeof fix?.lat === 'number' && (
            <button
              type="button"
              className="btn btn--xs"
              onClick={() => {
                const text = `${anchor.name || t('app.anchor.untitled')}: ${anchor.lat.toFixed(6)}, ${anchor.lng.toFixed(6)}`;
                void navigator.clipboard?.writeText(text);
                toast.show(t('common.copiedToClipboard'), 'ok');
              }}
            >
              <Copy size={12} /> {anchor.lat.toFixed(5)}, {anchor.lng.toFixed(5)}
            </button>
          )}
        </>
      )}

      {plan === 'free' && (
        <div className="banner banner--info">
          <Crown size={15} />
          <div className="banner__body">
            <span>{t('app.pro.mediaBanner')}</span>
            <button type="button" className="btn btn--xs" style={{ justifySelf: 'start' }} onClick={() => onUpgrade(t('app.pro.mediaBanner'))}>
              {t('app.pro.seeWallets')}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
