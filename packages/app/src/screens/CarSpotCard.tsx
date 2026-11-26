import { formatDuration, parkingStatus, type Anchor } from '@wai/shared';
import { useT } from '../i18n/useT';
import { useUnits } from '../i18n/useUnits';
import { ChevronRight, Timer, Trail } from '../ui/icons';

/**
 * "Where is my car?" – the single most common question this app answers.
 *
 * It gets its own card above the list instead of hiding inside it: after a day
 * in a city you remember *that* you parked, not the name you gave the anchor.
 * The card shows the one number that matters (how long it has been standing, or
 * how far away it is) and a single path back to the compass.
 */
export function CarSpotCard({
  anchor,
  distanceMeters,
  onFind,
  onTimer,
}: {
  anchor: Anchor;
  distanceMeters: number | null;
  onFind: () => void;
  onTimer: () => void;
}) {
  const { t, locale } = useT();
  const { distance: fmtDistance } = useUnits();
  const parking = parkingStatus(anchor);
  const running = Boolean(anchor.parking?.limitMinutes);
  const minutesLeft = parking.remaining !== undefined ? Math.round(parking.remaining / 60000) : null;
  const urgent = minutesLeft !== null && minutesLeft <= 15;

  return (
    <div className={`carspot ${parking.overdue ? 'is-overdue' : ''} ${urgent ? 'is-urgent' : ''}`}>
      <div className="carspot__head">
        <span className="carspot__badge">{t('app.carSpot.badge')}</span>
        <span className="carspot__name">{anchor.name || t('app.anchor.untitled')}</span>
      </div>

      <div className="carspot__body">
        <button type="button" className="carspot__main" onClick={onFind}>
          <span className="carspot__value">
            {distanceMeters !== null ? fmtDistance(distanceMeters) : anchor.floorLabel ?? '—'}
          </span>
          <span className="carspot__label">
            {distanceMeters !== null ? t('app.carSpot.distance') : t('app.carSpot.level')}
          </span>
        </button>
        <button type="button" className="carspot__side" onClick={onTimer}>
          <Timer size={14} />
          <span className="carspot__side-value">
            {running
              ? parking.overdue
                ? `+${formatDuration(Math.abs(parking.remaining ?? 0), locale)}`
                : formatDuration(parking.remaining ?? 0, locale)
              : formatDuration(parking.elapsed, locale)}
          </span>
          <span className="carspot__side-label">
            {running ? (parking.overdue ? t('app.timer.expired') : t('app.timer.remaining')) : t('app.anchor.parkedFor', { duration: '' }).trim()}
          </span>
        </button>
      </div>

      {anchor.floorLabel && (
        <p className="carspot__meta">
          {t('app.carSpot.level')}: <strong>{anchor.floorLabel}</strong>
          {anchor.zone ? ` · ${anchor.zone.slice(0, 30)}` : ''}
        </p>
      )}

      <div className="carspot__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={onFind}>
          <Trail size={14} /> {t('app.carSpot.find')}
          <ChevronRight size={13} />
        </button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={onTimer}>
          <Timer size={13} /> {running ? t('app.timer.title') : t('app.timer.startShort')}
        </button>
      </div>
    </div>
  );
}
