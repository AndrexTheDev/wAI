import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  bearingDeg,
  destinationPoint,
  distanceMeters,
  elevationHint,
  formatDistance,
  proximityTier,
  relativeBearing,
  type Anchor,
} from '@wai/shared';
import { useLocale } from '../lib/locale';
import { CompassIcon, ElevationIcon, TrailIcon, VibrateIcon, CameraIcon } from './Icons';
import './PhoneDemo.css';

/**
 * Interactive product demo for the hero.
 *
 * The visitor drags the map (or uses the arrow keys / buttons) to walk around.
 * The compass, distance, floor beam and proximity pulse all respond exactly like
 * the real app – the math is the same @wai/shared code the Android build uses.
 */

const DEMO_ANCHOR: Anchor = {
  id: 'demo-pillar-b17',
  name: 'Car · Level 3 · B17',
  category: 'car',
  lat: 48.1351,
  lng: 11.582,
  altitude: 412,
  accuracy: 6,
  source: 'demo',
  createdAt: 0,
  updatedAt: 0,
  note: 'Level 3, right of the blue pillar, next to the east lift',
  zone: 'Zone B · €2.50/h · paid until 18:00',
  photos: [],
  voices: [],
  favorite: true,
  archived: false,
  floorLabel: 'L3',
};

const START = { lat: 48.1332, lng: 11.5785 };
const MAP_RADIUS_M = 260;
const STEP_M = 18;

export function PhoneDemo() {
  const { t, locale } = useLocale();
  const [pos, setPos] = useState(START);
  const [heading, setHeading] = useState(28);
  const [walking, setWalking] = useState(false);
  const [view, setView] = useState<'compass' | 'trail'>('compass');
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const distance = distanceMeters(pos, DEMO_ANCHOR);
  const bearing = bearingDeg(pos, DEMO_ANCHOR);
  const relative = relativeBearing(heading, bearing);
  const elevation = elevationHint(DEMO_ANCHOR.altitude, 404 + (pos.lat - START.lat) * 9000);
  const tier = proximityTier(distance, 6);
  const arrived = distance < 6;

  /** Map projection: target fixed at the centre, user moves around it. */
  const offset = useMemo(() => {
    const toLat = (DEMO_ANCHOR.lat - pos.lat) * 111132;
    const toLng = (DEMO_ANCHOR.lng - pos.lng) * 111320 * Math.cos((pos.lat * Math.PI) / 180);
    const scale = 0.62; // px per metre at typical phone width
    return { x: toLng * scale, y: toLat * scale };
  }, [pos]);

  const move = useCallback(
    (deltaBearing: number) => {
      setPos((p) => destinationPoint(p, STEP_M, deltaBearing));
    },
    [],
  );

  // Gentle auto-walk so the demo looks alive without interaction.
  useEffect(() => {
    if (!walking) return;
    const id = window.setInterval(() => {
      setPos((p) => {
        const next = destinationPoint(p, 9, bearingDeg(p, DEMO_ANCHOR));
        return distanceMeters(next, DEMO_ANCHOR) < 3 ? START : next;
      });
    }, 420);
    return () => window.clearInterval(id);
  }, [walking]);

  // Keyboard support (accessibility): arrow keys walk, space turns.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!mapRef.current?.matches(':focus-within')) return;
      if (event.key === 'ArrowUp') move(heading);
      else if (event.key === 'ArrowDown') move((heading + 180) % 360);
      else if (event.key === 'ArrowLeft') setHeading((h) => (h + 330) % 360);
      else if (event.key === 'ArrowRight') setHeading((h) => (h + 30) % 360);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [heading, move]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    if (Math.hypot(dx, dy) < 12) return;
    // Walking backwards means the target moves away on the map.
    const dir = Math.atan2(dx, -dy) * (180 / Math.PI);
    move((dir + 180) % 360);
    dragRef.current = { x: e.clientX, y: e.clientY };
    setWalking(false);
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="phone-demo" aria-label={t('landing.hero.phoneCaption')}>
      <div className={`phone-demo__device tier-${tier}`}>
        <div className="phone-demo__notch" />
        <div className="phone-demo__screen">
          <header className="pd-header">
            <span className="pd-status">
              <span className="pd-dot" />
              {t('common.offlineReady')}
            </span>
            <span className="pd-title">{DEMO_ANCHOR.name}</span>
          </header>

          <div
            className="pd-map"
            ref={mapRef}
            tabIndex={0}
            role="application"
            aria-label={t('app.demo.hint')}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="pd-map__grid" />
            <svg className="pd-map__rings" viewBox="-160 -160 320 320" aria-hidden="true">
              <circle r="52" />
              <circle r="104" />
              <circle r="156" />
              <line x1="-160" y1="0" x2="160" y2="0" />
              <line x1="0" y1="-160" x2="0" y2="160" />
            </svg>

            {view === 'trail' && (
              <svg className="pd-map__trail" viewBox="-160 -160 320 320" aria-hidden="true">
                <path
                  d={`M ${offset.x} ${offset.y} C ${offset.x + 18} ${offset.y + 26}, ${offset.x + 54} ${offset.y + 8}, ${offset.x + 62} ${offset.y + 48} S ${offset.x + 20} ${offset.y + 92}, ${offset.x + 34} ${offset.y + 118}`}
                  fill="none"
                />
              </svg>
            )}

            <div
              className="pd-map__target"
              style={{ transform: `translate(-50%, -50%) scale(${arrived ? 1.14 : 1})` }}
            >
              <span className="pd-map__target-pulse" />
              <span className="pd-map__target-core" />
              <span className="pd-map__target-label">B17</span>
            </div>

            <div
              className="pd-map__user"
              style={{ transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
            >
              <span className="pd-map__user-beam" style={{ rotate: `${heading}deg` }} />
              <span className="pd-map__user-dot" />
            </div>

            <span className="pd-map__scale">{MAP_RADIUS_M} m</span>
            <span className="pd-map__hint">{t('app.demo.hint')}</span>
          </div>

          <div className="pd-compass">
            <div className="pd-compass__arrow" style={{ rotate: `${relative}deg` }}>
              <CompassIcon size={30} />
            </div>
            <div className="pd-compass__meta">
              <strong>{formatDistance(distance, locale)}</strong>
              <span>
                {Math.abs(relative) < 20
                  ? locale === 'de'
                    ? 'geradeaus'
                    : 'straight ahead'
                  : `${Math.round(Math.abs(relative))}° ${relative > 0 ? (locale === 'de' ? 'rechts' : 'right') : locale === 'de' ? 'links' : 'left'}`}
              </span>
            </div>
            <div className={`pd-bars tier-${tier}`} aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i < tier ? 'is-on' : ''} />
              ))}
            </div>
          </div>

          <div className="pd-tiles">
            <div className="pd-tile">
              <ElevationIcon size={16} />
              <span>
                {elevation.level === 'same'
                  ? t('app.find.elevationSame')
                  : locale === 'de'
                    ? `${Math.round(elevation.delta)} m ${elevation.level === 'higher' ? 'höher' : 'tiefer'}`
                    : `${Math.round(elevation.delta)} m ${elevation.level === 'higher' ? 'up' : 'down'}`}
              </span>
            </div>
            <div className="pd-tile">
              <VibrateIcon size={16} />
              <span>{arrived ? t('app.find.arrived') : t('common.offlineReady')}</span>
            </div>
          </div>

          <div className="pd-note">
            <CameraIcon size={14} />
            <span>{DEMO_ANCHOR.note}</span>
          </div>

          <div className="pd-actions">
            <button
              type="button"
              className={view === 'compass' ? 'is-active' : ''}
              onClick={() => setView('compass')}
            >
              <CompassIcon size={15} /> {locale === 'de' ? 'Kompass' : 'Compass'}
            </button>
            <button
              type="button"
              className={view === 'trail' ? 'is-active' : ''}
              onClick={() => setView('trail')}
            >
              <TrailIcon size={15} /> {locale === 'de' ? 'Spur' : 'Trail'}
            </button>
            <button
              type="button"
              className={walking ? 'is-active' : ''}
              onClick={() => setWalking((w) => !w)}
            >
              {walking ? '⏸' : '▶'} {locale === 'de' ? 'Auto' : 'Auto'}
            </button>
          </div>
        </div>
      </div>
      <p className="phone-demo__caption">{t('landing.hero.phoneCaption')}</p>
    </div>
  );
}
