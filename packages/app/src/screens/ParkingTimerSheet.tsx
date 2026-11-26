import { useEffect, useMemo, useState } from 'react';
import { formatDuration, formatTime, parkingStatus, type Anchor } from '@wai/shared';
import { useApp, makePhotoRef } from '../store/AppStore';
import { useT } from '../i18n/useT';
import { useToast } from '../ui/Toast';
import { Sheet } from '../ui/Sheet';
import { cancelParkingReminder, capturePhoto, scheduleParkingReminder, vibrate } from '../platform/native';
import { Camera, Check, Crown, Timer, Trash } from '../ui/icons';

const PRESETS = [30, 60, 90, 120, 180, 240];

/**
 * Parking timer: counts the standing time of an anchor and schedules a local
 * (offline) notification. Pro-only per the pricing table.
 */
export function ParkingTimerSheet({
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
  const { plan, setParking, addPhoto, sensors } = useApp();
  const toast = useToast();
  const [minutes, setMinutes] = useState(120);
  const [now, setNow] = useState(Date.now());
  /** Second, earlier reminder – the one that actually saves you from a ticket. */
  const [earlyReminder, setEarlyReminder] = useState(true);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  const status = useMemo(() => (anchor ? parkingStatus(anchor, now) : null), [anchor, now]);

  if (!anchor) return null;

  const start = async () => {
    if (plan !== 'pro') {
      onUpgrade(t('app.timer.proOnly'));
      return;
    }
    const remindAt = Date.now() + minutes * 60000;
    setParking(anchor.id, {
      startedAt: anchor.parking?.startedAt ?? anchor.createdAt,
      limitMinutes: minutes,
      remindAt,
      reminderState: 'scheduled',
    });
    const name = anchor.name || t('app.anchor.untitled');
    const scheduled = await scheduleParkingReminder(
      anchor.id,
      t('app.timer.notificationTitle'),
      t('app.timer.notificationBody', {
        name,
        duration: formatDuration(minutes * 60000, locale),
      }),
      new Date(remindAt),
    );

    /**
     * The reminder that matters is the early one: at the limit the ticket is
     * already written. Ten minutes ahead is enough to walk back in a car park.
     * Only scheduled when it still lies in the future and there is room.
     */
    if (scheduled && earlyReminder && minutes > 12) {
      const earlyAt = remindAt - 10 * 60000;
      await scheduleParkingReminder(
        anchor.id,
        t('app.timer.earlyTitle'),
        t('app.timer.earlyBody', { name }),
        new Date(earlyAt),
        1,
      );
    } else {
      await cancelParkingReminder(anchor.id, [1]);
    }
    toast.show(
      scheduled
        ? t('app.timer.reminderAt', { time: formatTime(remindAt, locale) })
        : t('app.errors.notification'),
      scheduled ? 'ok' : 'warn',
    );
    onClose();
  };

  const stop = async () => {
    await cancelParkingReminder(anchor.id, [0, 1]);
    setParking(anchor.id, undefined);
    toast.show(t('app.timer.stop'), 'info');
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('app.timer.title')}
      footer={
        plan === 'pro' ? (
          <>
            {anchor.parking && (
              <button type="button" className="btn btn--danger" onClick={() => void stop()}>
                <Trash size={15} /> {t('app.timer.stop')}
              </button>
            )}
            <button type="button" className="btn btn--primary" onClick={() => void start()}>
              <Check size={15} /> {t('app.timer.start')}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--primary btn--block" onClick={() => onUpgrade(t('app.timer.proOnly'))}>
            <Crown size={15} /> {t('common.ctaPro')}
          </button>
        )
      }
    >
      <div className="tiles">
        <div className="tile">
          <span className="tile__label">
            <Timer size={11} /> {t('app.anchor.parkedFor', { duration: '' }).replace('{duration}', '').trim()}
          </span>
          <span className="tile__value tile__value--mint">
            {status ? formatDuration(status.elapsed, locale) : '—'}
          </span>
        </div>
        <div className="tile">
          <span className="tile__label">{t('app.timer.remaining')}</span>
          <span className={`tile__value ${status?.overdue ? 'tile__value--amber' : ''}`}>
            {status?.remaining !== undefined
              ? status.overdue
                ? `+${formatDuration(Math.abs(status.remaining), locale)}`
                : formatDuration(status.remaining, locale)
              : '—'}
          </span>
        </div>
      </div>

      <div className="field">
        <span className="field__label">{t('app.timer.minutes')}</span>
        <div className="chips">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`chip ${minutes === preset ? 'is-active' : ''}`}
              onClick={() => setMinutes(preset)}
            >
              {preset >= 60 ? `${preset / 60} h` : `${preset} min`}
            </button>
          ))}
        </div>
        <input
          className="field__input"
          type="number"
          min={5}
          max={1440}
          value={minutes}
          onChange={(event) => setMinutes(Math.max(5, Math.min(1440, Number(event.target.value) || 5)))}
          aria-label={t('app.timer.minutes')}
        />
        <span className="field__help">
          {t('app.timer.reminderAt', { time: formatTime(Date.now() + minutes * 60000, locale) })}
        </span>
        <div className="row row--between" style={{ marginTop: 10 }}>
          <div>
            <div className="setting-row__label">{t('app.timer.remind10')}</div>
            <div className="setting-row__sub">
              {minutes > 12
                ? t('app.timer.earlyAt', { time: formatTime(Date.now() + (minutes - 10) * 60000, locale) })
                : t('app.timer.earlyTooShort')}
            </div>
          </div>
          <button
            type="button"
            className={`switch setting-row__control ${earlyReminder ? 'is-on' : ''}`}
            role="switch"
            aria-checked={earlyReminder}
            onClick={() => setEarlyReminder((value) => !value)}
            aria-label={t('app.timer.remind10')}
            data-skip-autofocus
          />
        </div>
      </div>

      {/* The ticket: the thing you never find when a warden is standing there. */}
      <div className="card">
        <div className="card__head">
          <span className="card__title">
            <Camera size={14} /> {t('app.timer.ticketTitle')}
          </span>
        </div>
        <p className="muted">{t('app.timer.ticketHint')}</p>
        {anchor.photos.length > 0 && (
          <div className="photo-strip" style={{ marginTop: 8 }}>
            {anchor.photos.map((photo) => (
              <img key={photo.id} className="reference-photo" src={photo.file} alt={t('app.timer.ticketTitle')} />
            ))}
          </div>
        )}
        <button
          type="button"
          className="btn btn--sm btn--block"
          style={{ marginTop: 8 }}
          onClick={async () => {
            const captured = await capturePhoto('camera');
            if (!captured) {
              toast.show(t('app.errors.camera'), 'err');
              return;
            }
            addPhoto(anchor.id, makePhotoRef(captured.stored, sensors.heading ?? undefined));
            void vibrate('tap');
            toast.show(t('app.timer.ticketSaved'), 'ok');
          }}
        >
          <Camera size={14} /> {t('app.anchor.takePhoto')}
        </button>
      </div>

      {plan !== 'pro' && (
        <div className="banner">
          <Crown size={15} />
          <div className="banner__body">{t('app.timer.proOnly')}</div>
        </div>
      )}
    </Sheet>
  );
}
