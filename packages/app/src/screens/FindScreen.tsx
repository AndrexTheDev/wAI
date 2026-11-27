import { useEffect, useMemo, useRef, useState } from 'react';
import {
  bearingDeg,
  distanceMeters,
  elevationHint,
  formatBearing,
  formatDistance,
  formatDuration,
  guidanceFor,
  parkingStatus,
  proximityInterval,
  proximityTier,
  relativeBearing,
  trailDistance,
  type Anchor,
} from '@wai/shared';
import { useApp, startTrailRecording, stopTrailRecording } from '../store/AppStore';
import { useT } from '../i18n/useT';
import { MapView } from './MapView';
import { useUnits } from '../i18n/useUnits';
import { useToast } from '../ui/Toast';
import { beep, isDemo, setTorch, vibrate } from '../platform/native';
import {
  Camera,
  Torch,
  ChevronLeft,
  Compass,
  Crown,
  Elevation,
  Info,
  Layers,
  Mic,
  Play,
  Timer,
  Trail,
  Vibrate,
  ArrowUpRight,
  Anchor as AnchorIcon,
  Map as MapIcon,
} from '../ui/icons';
import { EmptyState } from './EmptyState';

/**
 * Guidance screen: compass, elevation beam, breadcrumb trail, photo reference
 * and proximity feedback. Multi-view (all at once) is a Pro-only layout; the
 * free plan shows a single view at a time.
 */
export function FindScreen({
  anchor,
  onBack,
  onChooseAnother,
  onOpenPro,
  onArchive,
  onStopParking,
}: {
  anchor: Anchor | null;
  onBack: () => void;
  onChooseAnother: () => void;
  onOpenPro: (reason: string) => void;
  /** Arrival actions: park the anchor away, or stop the running timer. */
  onArchive?: (anchor: Anchor) => void;
  onStopParking?: (anchor: Anchor) => void;
}) {
  const { t, locale } = useT();
  const { distance: fmtDistance, height: fmtHeight } = useUnits();
  const { fix, sensors, plan, activeAnchors, appendTrail, anchors, estimated, estimatedSteps } = useApp();
  const toast = useToast();
  const [view, setView] = useState<'compass' | 'map' | 'trail' | 'media'>('compass');
  const [proximityOn, setProximityOn] = useState(plan === 'pro');
  const [recording, setRecording] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const lastTier = useRef(0);
  const lastPulse = useRef(0);

  const current = anchor ?? activeAnchors[0] ?? null;

  const guidance = useMemo(() => {
    if (!current || !fix) return null;
    const heading = sensors.heading ?? bearingDeg(fix, current);
    return guidanceFor(fix, current, heading, locale, fix.altitude, Math.max(8, (fix.accuracy ?? 10) * 1.5));
  }, [current, fix, sensors.heading, locale]);

  /* Proximity feedback: vibration/tone intensity grows as you approach. */
  useEffect(() => {
    if (!guidance || !proximityOn || plan !== 'pro') return;
    const tier = proximityTier(guidance.distance, Math.max(8, (fix?.accuracy ?? 10) * 1.5));
    if (tier !== lastTier.current) {
      lastTier.current = tier;
      if (tier >= 2) {
        void vibrate(tier >= 4 ? 'arrived' : tier === 3 ? 'strong' : 'medium');
        beep(600 + tier * 90, tier >= 4 ? 180 : 80);
      }
    }
    const now = Date.now();
    if (tier >= 2 && now - lastPulse.current > proximityInterval(tier)) {
      lastPulse.current = now;
      void vibrate('soft');
      beep(500 + tier * 100, 60, 0.04);
    }
  }, [guidance, proximityOn, plan, fix]);

  /* Trail recording while walking back (stops when leaving the screen). */
  useEffect(() => {
    if (!current || !recording) return;
    startTrailRecording(current.id);
    return () => stopTrailRecording();
  }, [current, recording]);

  /* Leaving guidance must not leave the flashlight burning. */
  useEffect(() => {
    return () => {
      if (torchOn) void setTorch(false);
    };
  }, [torchOn]);

  if (!current) {
    return (
      <>
        <div className="topbar" style={{ paddingTop: 6 }}>
          <h1 className="topbar__name">{t('app.find.title')}</h1>
        </div>
        <EmptyState
          icon={<Compass size={26} />}
          title={t('app.find.choose')}
          body={t('app.find.chooseBody')}
        />
        {anchors.length > 0 && (
          <div className="anchor-list" style={{ marginTop: 12 }}>
            {anchors.slice(0, 4).map((item) => (
              <button key={item.id} type="button" className="btn btn--block" onClick={onChooseAnother}>
                {item.name || t('app.anchor.untitled')}
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  if (!fix) {
    return (
      <EmptyState
        icon={<Info size={26} />}
        title={t('app.permissions.noLocation')}
        body={t('app.find.compassHint')}
        action={
          <button type="button" className="btn btn--sm" onClick={onBack}>
            {t('common.back')}
          </button>
        }
      />
    );
  }

  /** Stabil über Renders – ein neues Literal hier hätte die Karte dauerhaft neu geladen. */
  const mapTarget = useMemo(
    () => ({
      id: current.id,
      name: current.name,
      lat: current.lat,
      lng: current.lng,
      category: current.category,
    }),
    [current.id, current.name, current.lat, current.lng, current.category],
  );
  const trailLength = trailDistance(current.trail);
  const elevation = elevationHint(current.altitude, fix.altitude);
  const parking = parkingStatus(current);
  const tier = proximityTier(guidance?.distance ?? Infinity, Math.max(8, (fix.accuracy ?? 10) * 1.5));
  const arrived = guidance?.arrived ?? false;
  const distanceText = fmtDistance(guidance?.distance ?? 0);
  const multiView = plan === 'pro';

  const elevationText =
    elevation.level === 'same'
      ? t('app.find.elevationSame')
      : // Zu großer Unterschied für ein Gebäude: Höhe nennen, Etagen weglassen.
        elevation.implausible
      ? t('app.find.elevationUnclear', { meters: Math.abs(Math.round(elevation.delta)) })
      : elevation.level === 'higher'
        ? t('app.find.elevationHigher', {
            meters: Math.abs(Math.round(elevation.delta)),
            floors: Math.max(1, elevation.floors),
          })
        : t('app.find.elevationLower', {
            meters: Math.abs(Math.round(elevation.delta)),
            floors: Math.max(1, elevation.floors),
          });

  return (
    <>
      <div className="topbar" style={{ paddingTop: 4 }}>
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t('common.back')}>
          <ChevronLeft size={18} />
        </button>
        <div className="topbar__titles" style={{ flex: 1 }}>
          <span className="topbar__name" style={{ fontSize: 15 }}>
            {current.name || t('app.anchor.untitled')}
          </span>
          <span className="topbar__sub">
            {t(`app.anchor.categories.${current.category}`)} · {formatBearing(guidance?.bearing ?? 0, locale)}
          </span>
        </div>
        {/* The torch belongs here and not only in settings: you need it while
            walking, in a dark car park, without leaving the guidance screen. */}
        <button
          type="button"
          className={`icon-btn ${torchOn ? 'is-active' : ''}`}
          onClick={async () => {
            const ok = await setTorch(!torchOn);
            if (!ok) {
              toast.show(t('app.errors.torch'), 'warn');
              return;
            }
            setTorchOn(ok ? !torchOn : false);
            void vibrate('tap');
          }}
          aria-pressed={torchOn}
          aria-label={t('app.find.torch')}
          title={t('app.find.torch')}
        >
          <Torch size={17} />
        </button>
        <button type="button" className="icon-btn" onClick={onChooseAnother} aria-label={t('app.find.choose')}>
          <Layers size={17} />
        </button>
      </div>

      <div className="guide">
        {isDemo && (
          /**
           * Der Demo-Hinweis erklärt den Zustand, in dem der ganze Bildschirm
           * steht – simulierte Sensoren, keine echte Position. Als Fließtext am
           * Ende lag er unter allem anderen und war auf einem 732-px-Viewport
           * schlicht außerhalb des Bildes; als Zustandsangabe gehört er nach oben,
           * direkt unter die Kopfzeile. Das violette Feld hebt ihn von echten
           * Messwerten ab.
           */
          <div className="demo-hint">
            <span className="demo-hint__tag">{t('app.demo.simulated')}</span>
            <span className="demo-hint__text">{t('app.demo.hint')}</span>
          </div>
        )}
        {arrived && (
          <div className="arrived-card">
            <div className="arrived-card__head">
              <span className="arrived-card__icon">
                <AnchorIcon size={18} />
              </span>
              <div>
                <span className="arrived-card__title">{t('app.find.arrived')}</span>
                <p className="arrived-card__body">{current.note ?? t('app.find.arriving')}</p>
              </div>
            </div>
            {/* Standing in front of the thing is the only moment where "done"
                makes sense – offer the follow-up right here, not in a menu. */}
            <div className="arrived-card__actions">
              {current.parking && onStopParking && (
                <button type="button" className="btn btn--sm" onClick={() => onStopParking(current)}>
                  <Timer size={13} /> {t('app.timer.stop')}
                </button>
              )}
              {onArchive && (
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => onArchive(current)}>
                  {t('app.find.markArrived')}
                </button>
              )}
              <button type="button" className="btn btn--sm btn--quiet" onClick={onBack}>
                {t('app.find.toList')}
              </button>
            </div>
          </div>
        )}

        {/*
          Ein Anker 1400 km entfernt ist kein Ziel, sondern ein Datensatz-Fehler.
          Die App sagt das, statt einen Kompass auf einen anderen Kontinent zu
          richten – derselbe Fehler wie „1423,2 km entfernt" auf der Auto-Kachel.
        */}
        {(guidance?.distance ?? 0) > 50_000 && (
          <div className="banner banner--warn">
            <Info size={16} />
            <div className="banner__body">
              <span className="banner__title">
                {t('app.find.farTitle', { distance: fmtDistance(guidance?.distance ?? 0) })}
              </span>
              <span>{t('app.find.farBody')}</span>
            </div>
          </div>
        )}

        {estimated && (
          <div className="banner banner--warn">
            <Info size={16} />
            <div className="banner__body">
              <span className="banner__title">{t('app.find.estimatedTitle')}</span>
              <span>{t('app.find.estimatedBody', { steps: estimatedSteps, meters: Math.round(guidance?.distance ?? 0) })}</span>
            </div>
          </div>
        )}

        {/*
          Der Umschalter steht direkt unter dem Kompass, nicht unter den Kacheln.
          Vorher lag er bei 523 von 732 CSS-Pixeln Höhe – also genau auf der Falz,
          wo der Store-Screenshot ihn halb abschnitt. Er steuert die Hauptansicht
          dieses Bildschirms und gehört deshalb zu ihr.
        */}
        {!multiView && (
          <div className="segmented" role="tablist">
            <button type="button" role="tab" aria-selected={view === 'compass'} className={view === 'compass' ? 'is-active' : ''} onClick={() => setView('compass')}>
              <Compass size={13} /> {locale === 'de' ? 'Kompass' : 'Compass'}
            </button>
            <button type="button" role="tab" aria-selected={view === 'map'} className={view === 'map' ? 'is-active' : ''} onClick={() => setView('map')}>
              <MapIcon size={13} /> {t('app.map.tab')}
            </button>
            <button type="button" role="tab" aria-selected={view === 'trail'} className={view === 'trail' ? 'is-active' : ''} onClick={() => setView('trail')}>
              <Trail size={13} /> {locale === 'de' ? 'Spur' : 'Trail'}
            </button>
            <button type="button" role="tab" aria-selected={view === 'media'} className={view === 'media' ? 'is-active' : ''} onClick={() => setView('media')}>
              <Camera size={13} /> {locale === 'de' ? 'Foto' : 'Photo'}
            </button>
          </div>
        )}

        {(multiView || view === 'compass') && (
          <div
            className={`guide__compass guide__compass--tier${tier} ${arrived ? 'is-arrived' : ''} ${
              (guidance?.distance ?? 0) > 50_000 ? 'is-far' : ''
            }`}
          >
            <span className="guide__compass-cardinal guide__compass-cardinal--n">N</span>
            <span className="guide__compass-cardinal guide__compass-cardinal--e">O/E</span>
            <span className="guide__compass-cardinal guide__compass-cardinal--s">S</span>
            <span className="guide__compass-cardinal guide__compass-cardinal--w">W</span>
            <div className="guide__rings" aria-hidden="true" />
            <div className="guide__pulse" aria-hidden="true" />
            <div className="guide__sweep" aria-hidden="true" />
            <div
              className="guide__needle"
              style={{ rotate: `${guidance?.relative ?? 0}deg` }}
              aria-hidden="true"
            >
              <span className="guide__needle-arrow" />
              <span className="guide__needle-tail" />
            </div>
            <div className="guide__center">
              <div className="guide__distance">
                <strong key={distanceText} className="guide__distance-value">
                  {distanceText}
                </strong>
                <span>{arrived ? t('app.find.arrived') : t('app.find.distance')}</span>
              </div>
            </div>
            {sensors.magneticAccuracy === 'low' && (
              <span
                className="status-chip status-chip--warn"
                style={{ position: 'absolute', bottom: 8, left: '50%', translate: '-50% 0' }}
              >
                <Info size={11} /> {t('app.find.headingLow')}
              </span>
            )}
          </div>
        )}

        {multiView && (
          <div className="row" style={{ gap: 8 }}>
            <div className="tile" style={{ flex: 1 }}>
              <span className="tile__label">
                <Elevation size={11} /> {t('app.find.elevation')}
              </span>
              <span className={`tile__value ${elevation.level === 'same' ? 'tile__value--mint' : 'tile__value--amber'}`}>
                {elevation.level === 'same'
                  ? t('app.find.elevationSame')
                  : `${fmtHeight(Math.abs(elevation.delta))} ${elevation.level === 'higher' ? '↑' : '↓'}`}
              </span>
              <span className="tile__sub">
                {elevation.level === 'same'
                  ? current.floorLabel ?? '—'
                  : elevation.implausible
                    ? t('app.find.elevationUnclearShort')
                    : t(elevation.level === 'higher' ? 'app.find.elevationHigher' : 'app.find.elevationLower', {
                        meters: Math.abs(Math.round(elevation.delta)),
                        floors: Math.max(1, elevation.floors),
                      }).slice(0, 28)}
              </span>
            </div>
            <div className="tile" style={{ flex: 1 }}>
              <span className="tile__label">
                <Trail size={11} /> {t('app.find.trail')}
              </span>
              <span className="tile__value tile__value--mint">
                {trailLength ? fmtDistance(trailLength) : '—'}
              </span>
              <span className="tile__sub">{current.trail?.length ?? 0} GPS</span>
            </div>
          </div>
        )}

        {!multiView && view === 'map' && (
          <MapView
            position={
              fix
                ? { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy ?? null }
                : estimated
                  ? null
                  : null
            }
            target={mapTarget}
            anchors={anchors
              .filter((anchor) => anchor.id !== current.id && !anchor.archived)
              .slice(0, 40)
              .map((anchor) => ({
                id: anchor.id,
                name: anchor.name,
                lat: anchor.lat,
                lng: anchor.lng,
                category: anchor.category,
              }))}
            trail={current.trail ?? []}
            height={330}
          />
        )}

        {!multiView && view === 'trail' && (
          <div className="card">
            <div className="card__head">
              <span className="card__title">
                <Trail size={14} /> {t('app.find.trail')}
              </span>
              <span className="muted">{fmtDistance(trailLength)}</span>
            </div>
            <TrailCanvas anchor={current} currentLat={fix.lat} currentLng={fix.lng} />
            <p className="muted" style={{ marginTop: 6 }}>
              {current.trail && current.trail.length > 1 ? t('app.find.trailLength', { distance: fmtDistance(trailLength) }) : t('app.find.trailPro')}
            </p>
          </div>
        )}

        {!multiView && view === 'media' && (
          <div className="card">
            <div className="card__head">
              <span className="card__title">
                <Camera size={14} /> {t('app.find.photoRef')}
              </span>
            </div>
            {current.photos.length ? (
              <div className="photo-strip">
                {current.photos.map((photo) => (
                  <img key={photo.id} className="reference-photo" src={photo.file} alt={t('app.find.photoRef')} />
                ))}
              </div>
            ) : (
              <p className="muted">{t('app.find.noPhoto')}</p>
            )}
            {current.note && <p style={{ marginTop: 10, fontSize: 13 }}>{current.note}</p>}
            {current.voices.length > 0 && (
              <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                {current.voices.map((voice) => (
                  <button
                    key={voice.id}
                    type="button"
                    className="btn btn--sm"
                    onClick={() => void new Audio(voice.file).play().catch(() => {})}
                  >
                    <Play size={13} /> {t('app.anchor.voiceSeconds', { seconds: Math.round(voice.durationMs / 1000) })}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {multiView && current.photos.length > 0 && (
          <div className="photo-strip">
            {current.photos.map((photo) => (
              <img key={photo.id} className="reference-photo" src={photo.file} alt={t('app.find.photoRef')} />
            ))}
          </div>
        )}

        <div className="tiles">
          <div className="tile">
            <span className="tile__label">
              <Vibrate size={11} /> {t('app.find.proximity')}
            </span>
            <div className="row" style={{ gap: 8 }}>
              <div className="proximity-bar" aria-hidden="true">
                {[0, 1, 2, 3].map((index) => (
                  <span key={index} className={index < tier ? 'is-on' : ''} />
                ))}
              </div>
              <span className="tile__value" style={{ fontSize: 12 }}>
                {tier === 0 ? '—' : `${tier}/4`}
              </span>
            </div>
            <button
              type="button"
              className={`btn btn--xs ${proximityOn ? 'btn--primary' : ''}`}
              style={{ justifySelf: 'start' }}
              onClick={() => {
                if (plan !== 'pro') {
                  onOpenPro(t('app.pro.proximityBanner'));
                  return;
                }
                setProximityOn((value) => !value);
                void vibrate('tap');
              }}
            >
              {plan === 'pro' ? (proximityOn ? 'ON' : 'OFF') : 'PRO'}
            </button>
          </div>

          <div className="tile">
            <span className="tile__label">
              <Timer size={11} /> {current.parking ? t('app.timer.title') : t('app.timer.trackTitle')}
            </span>
            {current.parking ? (
              <>
                <span className={`tile__value ${parking.overdue ? 'tile__value--amber' : ''}`}>
                  {formatDuration(parking.elapsed, locale)}
                </span>
                <span className="tile__sub">
                  {parking.overdue
                    ? t('app.timer.expired')
                    : current.parking.limitMinutes
                      ? t('app.timer.remaining')
                      : t('app.timer.noLimit')}
                </span>
              </>
            ) : (
              /**
               * Ohne laufenden Parkvorgang stand hier die Zeit seit dem Anlegen des
               * Ankers („8 Std.") mit einem Strich darunter – auf dem Screenshot
               * sah das wie eine laufende Parkzeit aus, war aber nur das Alter
               * eines Ankers. Jetzt: keine Zahl, ein Satz.
               */
              <>
                <span className="tile__value tile__value--none">—</span>
                <span className="tile__sub">{t('app.timer.notStarted')}</span>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <span className="card__title">
              <Elevation size={14} /> {t('app.find.elevation')}
            </span>
            <span className="muted">
              {typeof current.altitude === 'number' ? fmtHeight(current.altitude) : t('app.find.noElevation')}
            </span>
          </div>
          <p style={{ fontSize: 13 }}>{elevationText}</p>
          {/* Ohne Beschriftung war „−3" unter der Höhenzeile nur eine Zahl, die
              man raten musste. */}
          {current.floorLabel && (
            <p className="muted">
              {t('app.find.floorLabel')}: <strong>{current.floorLabel}</strong>
            </p>
          )}
        </div>

        {multiView && (
          <div className="row" style={{ gap: 6 }}>
            <button
              type="button"
              className={`btn btn--sm ${recording ? 'btn--danger' : ''}`}
              style={{ flex: 1 }}
              onClick={() => {
                setRecording((value) => !value);
                toast.show(recording ? t('app.find.trail') : t('app.home.recordingTrail'), 'info');
              }}
            >
              <Trail size={14} /> {recording ? t('app.home.recordingTrail') : t('app.home.recordTrail')}
            </button>
            <a
              className="btn btn--sm"
              href={`geo:${current.lat},${current.lng}?q=${current.lat},${current.lng}(${encodeURIComponent(current.name || 'wAI')})`}
            >
              <ArrowUpRight size={14} /> {t('app.find.openMap')}
            </a>
          </div>
        )}

        {/* Kein Pro-Banner mehr an dieser Stelle.
             *
             * Er stand als letzter Block unter der Höhenkarte und schob den
             * Bildschirm über die Displayhöhe – im Store-Screenshot war er halb
             * abgeschnitten, also ausgerechnet die Werbung. Das Pro-Angebot steht
             * ohnehin zweimal sichtbar auf diesem Bildschirm: als PRO-Knopf in der
             * Näher-dran-Kachel und als Reiter in der Leiste.
             */}
      </div>
    </>
  );
}

/** Simple canvas-free SVG trail renderer normalised to the bounding box. */
function TrailCanvas({ anchor, currentLat, currentLng }: { anchor: Anchor; currentLat: number; currentLng: number }) {
  const points = useMemo(() => {
    const trail = anchor.trail ?? [];
    const all = [
      ...trail.map((p) => ({ lat: p.lat, lng: p.lng })),
      { lat: currentLat, lng: currentLng },
      { lat: anchor.lat, lng: anchor.lng },
    ];
    const lat0 = anchor.lat;
    const lng0 = anchor.lng;
    const scaleLat = 111132;
    const scaleLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
    const projected = all.map((p) => ({
      x: (p.lng - lng0) * scaleLng,
      y: -(p.lat - lat0) * scaleLat,
    }));
    const xs = projected.map((p) => p.x);
    const ys = projected.map((p) => p.y);
    const minX = Math.min(...xs, -10);
    const maxX = Math.max(...xs, 10);
    const minY = Math.min(...ys, -10);
    const maxY = Math.max(...ys, 10);
    const width = Math.max(maxX - minX, 20);
    const height = Math.max(maxY - minY, 20);
    const pad = 14;
    const viewW = 320;
    const viewH = 200;
    const scale = Math.min((viewW - pad * 2) / width, (viewH - pad * 2) / height);
    return {
      trail: projected.slice(0, -2).map((p) => ({ x: pad + (p.x - minX) * scale, y: pad + (p.y - minY) * scale })),
      you: { x: pad + (projected[projected.length - 2].x - minX) * scale, y: pad + (projected[projected.length - 2].y - minY) * scale },
      target: { x: pad + (projected[projected.length - 1].x - minX) * scale, y: pad + (projected[projected.length - 1].y - minY) * scale },
    };
  }, [anchor, currentLat, currentLng]);

  return (
    <div className="trail-map">
      <svg viewBox="0 0 320 200" role="img" aria-label={anchor.name}>
        <polyline
          points={points.trail.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="var(--violet)"
          strokeWidth="2.2"
          strokeDasharray="5 4"
        />
        <circle cx={points.target.x} cy={points.target.y} r="5" fill="var(--mint)" />
        <circle cx={points.target.x} cy={points.target.y} r="11" fill="none" stroke="var(--mint)" strokeOpacity="0.4" />
        <circle cx={points.you.x} cy={points.you.y} r="4.5" fill="#fff" stroke="var(--sky)" strokeWidth="2.5" />
      </svg>
    </div>
  );
}
