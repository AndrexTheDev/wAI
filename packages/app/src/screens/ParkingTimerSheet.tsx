import { useEffect, useMemo, useState } from 'react';
import { formatDuration, formatTime, parkingStatus, type Anchor } from '@wai/shared';
import { useApp } from '../store/AppStore';
import { useT } from '../i18n/useT';
import { useToast } from '../ui/Toast';
import { Sheet } from '../ui/Sheet';
import { cancelParkingReminder, scheduleParkingReminder } from '../platform/native';
import { Check, Crown, Timer, Trash } from '../ui/icons';

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
  const { plan, setParking } = useApp();
  const toast = useToast();
  const [minutes, setMinutes] = useState(120);
  const [now, setNow] = useState(Date.now());

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
    const scheduled = await scheduleParkingReminder(
      anchor.id,
      t('app.timer.notificationTitle'),
      t('app.timer.notificationBody', {
        name: anchor.name || t('app.anchor.untitled'),
        duration: formatDuration(minutes * 60000, locale),
      }),
      new Date(remindAt),
    );
    toast.show(
      scheduled
        ? t('app.timer.reminderAt', { time: formatTime(remindAt, locale) })
        : t('app.errors.notification'),
      scheduled ? 'ok' : 'warn',
    );
    onClose();
  };

  const stop = async () => {
    await cancelParkingReminder(anchor.id);
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
