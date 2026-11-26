import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MAP_ZOOM,
  fitToInclude,
  metresPerUnit,
  placeLabels,
  project,
  toScreen,
  viewportFor,
  visibleTiles,
  type MapPackIndex,
  type MapTile,
} from '@wai/shared';
import { useT } from '../i18n/useT';

/**
 * Offline map.
 *
 * Loads the city pack that ships with the app (`/map/index.json` plus one JSON file
 * per tile) and draws it as SVG: buildings, roads, water, green, labels, then the
 * user, the anchor and the trail on top. No tile server, no network, no API key –
 * which is the only way this app can keep its "works offline" promise.
 *
 * The drawing is deliberately plain: a handful of `<path>` elements per visible
 * tile, culled to the viewport, redrawn only when the viewport changes. On a phone
 * that is 60 fps while walking; a canvas would be faster but would lose the crisp
 * text and the free accessibility.
 */

export interface MapAnchor {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
}

interface Props {
  /** Where the user stands, from GPS or dead reckoning. */
  position: { lat: number; lng: number; accuracy?: number | null } | null;
  /** Where the user is heading. */
  target: MapAnchor | null;
  /** Everything else worth showing. */
  anchors?: MapAnchor[];
  /** Breadcrumb points already recorded. */
  trail?: Array<{ lat: number; lng: number }>;
  height?: number;
  onSelectAnchor?: (id: string) => void;
}

const TILE_CACHE_LIMIT = 120;

export function MapView({ position, target, anchors = [], trail = [], height = 320, onSelectAnchor }: Props) {
  const { t, locale } = useT();
  const [index, setIndex] = useState<MapPackIndex | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  const [tiles, setTiles] = useState<Map<string, MapTile>>(new Map());
  const [size, setSize] = useState({ width: 340, height });
  const [zoom, setZoom] = useState(2.4);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const cache = useRef(new Map<string, MapTile>());

  /* ---------------- pack index ---------------- */

  useEffect(() => {
    let cancelled = false;
    fetch('./map/index.json')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((json: MapPackIndex) => {
        if (!cancelled) setIndex(json);
      })
      .catch(() => {
        if (!cancelled) setPackError('missing');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- element size ---------------- */

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0) setSize({ width: Math.round(rect.width), height });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [height]);

  /* ---------------- viewport ---------------- */

  const here = position ?? target ?? { lat: 48.1374, lng: 11.5755 };
  /**
   * Die Kamera liegt zwischen dir und dem Ziel, nicht auf dir.
   *
   * Erste Fassung zentrierte auf die eigene Position und ließ `fitToInclude` nur
   * herauszoomen – bei einem Anker 1 400 km entfernt (Demo-Daten) landete die
   * Karte damit auf Zoomstufe „ganz Europa" und zeigte nichts.
   */
  const camera = useMemo(() => {
    if (!target) return here;
    return { lat: (here.lat + target.lat) / 2, lng: (here.lng + target.lng) / 2 };
  }, [here.lat, here.lng, target?.lat, target?.lng]);

  const viewport = useMemo(() => {
    const base = viewportFor(camera.lat, camera.lng, size.width, size.height, zoom);
    if (!target) return base;
    // Beide Punkte müssen sichtbar sein; bei extremer Entfernung begrenzt
    // `fitToInclude` selbst (MAX_UNITS_PER_PIXEL), die Karte bleibt also lesbar.
    return fitToInclude(fitToInclude(base, project(target.lat, target.lng)), project(here.lat, here.lng));
  }, [camera.lat, camera.lng, size.width, size.height, zoom, target, here.lat, here.lng]);

  /** Liegt überhaupt Pack-Gelände im Bild? Sonst ist die Karte leer und sagt das. */
  const coversArea = useMemo(() => {
    if (!index) return false;
    const { south, west, north, east } = index.bounds;
    return here.lat >= south && here.lat <= north && here.lng >= west && here.lng <= east;
  }, [index, here.lat, here.lng]);

  /* ---------------- tile loading ---------------- */

  /** Kacheln, deren Anfrage läuft – sonst feuert jeder Render dieselbe Anfrage. */
  const inFlight = useRef(new Set<string>());
  const available = useMemo(() => index?.tiles ?? [], [index]);
  const visible = useMemo(() => visibleTiles(viewport), [viewport]);

  /**
   * Kacheln nachladen.
   *
   * Der Cleanup darf laufende Anfragen **nicht** verwerfen: `target` ist ein
   * Objekt-Literal aus dem Aufrufer, also bei jedem Render neu, also ändert sich
   * `visible` bei jedem Render, also lief der Effekt neu — und die Antworten der
   * ersten Runde kamen als „abgebrochen" zurück. Ergebnis: die Karte blieb leer,
   * während im Netzwerk-Tab 20 Anfragen erfolgreich waren. Jetzt wird nur beim
   * Unmount abgebrochen; Zwischenstände sind ohnehin im Cache.
   */
  useEffect(() => {
    if (!index || available.length === 0) return;
    for (const { tile } of visible) {
      // Kacheln außerhalb des gepackten Gebiets bleiben leer – das ist der Rand
      // der Karte, kein Fehler.
      const known = available.some((entry) => entry.x === tile.x && entry.y === tile.y);
      const key = `${tile.x}/${tile.y}`;
      if (!known) continue;
      if (cache.current.has(key) || inFlight.current.has(key)) continue;
      inFlight.current.add(key);
      fetch(`./map/${MAP_ZOOM}/${tile.x}/${tile.y}.json`)
        .then((response) => (response.ok ? response.json() : null))
        .then((json: MapTile | null) => {
          if (!json) return;
          cache.current.set(key, json);
          if (cache.current.size > TILE_CACHE_LIMIT) {
            const oldest = cache.current.keys().next().value;
            if (oldest) cache.current.delete(oldest);
          }
          setTiles(new Map(cache.current));
        })
        .catch(() => {
          /* eine fehlende Kachel ist ein leeres Feld, kein Absturz */
        })
        .finally(() => {
          inFlight.current.delete(key);
        });
    }
  }, [index, available.length, visible]);

  /* ---------------- geometry ---------------- */

  const drawn = useMemo(() => {
    const paths: Array<{ d: string; className: string }> = [];
    const labels: Array<{ text: string; x: number; y: number }> = [];

    if (!coversArea) return { paths, labels };
    for (const { tile, dx, dy } of visible) {
      const data = tiles.get(`${tile.x}/${tile.y}`);
      if (!data) continue;
      for (const road of data.roads) {
        paths.push({
          d: polygonPath(road.points, dx, dy, viewport.unitsPerPixel, false),
          className: `map__road map__road--${road.class}`,
        });
      }
      for (const area of data.areas) {
        paths.push({
          d: polygonPath(area.points, dx, dy, viewport.unitsPerPixel, true),
          className: `map__area map__area--${area.kind}`,
        });
      }
      for (const building of data.buildings) {
        paths.push({
          d: polygonPath(building.points, dx, dy, viewport.unitsPerPixel, true),
          className: `map__building ${building.kind === 'parking' ? 'is-parking' : ''}`,
        });
      }
      for (const label of data.labels) {
        labels.push({
          text: label.text,
          x: (label.x + dx) / viewport.unitsPerPixel,
          y: (label.y + dy) / viewport.unitsPerPixel,
        });
      }
    }

    return { paths, labels: placeLabels(labels, (text) => ({ width: text.length * 5.4, height: 11 })) };
  }, [tiles, visible, viewport.unitsPerPixel, coversArea]);

  const metersPerPixel = metresPerUnit(here.lat) * viewport.unitsPerPixel;
  // Diagnose für den Capture-Lauf (nicht sichtbar, nur abfragbar).
  if (typeof window !== 'undefined') {
    (window as unknown as { __waiMap?: unknown }).__waiMap = {
      centre: viewport.centre,
      unitsPerPixel: viewport.unitsPerPixel,
      size,
      visible: visible.length,
      loaded: tiles.size,
      projected: visible.map((v) => ({ x: v.tile.x, y: v.tile.y, dx: Math.round(v.dx), dy: Math.round(v.dy) })),
    };
  }
  const scaleBar = scaleFor(metersPerPixel, locale);
  const userPoint = position ? toScreen(viewport, project(position.lat, position.lng)) : null;
  const targetPoint = target ? toScreen(viewport, project(target.lat, target.lng)) : null;
  const trailPoints = trail.map((point) => toScreen(viewport, project(point.lat, point.lng)));

  /* ---------------- render ---------------- */

  return (
    <div className="map" ref={boxRef} style={{ height }}>
      {packError && (
        <div className="map__empty">
          <strong>{t('app.map.noPack')}</strong>
          <span>{t('app.map.noPackBody')}</span>
        </div>
      )}

      {/* Ein Pack, das diesen Ort nicht abdeckt, ist kein Fehler – aber es wäre
          eine Lüge, eine leere Fläche als Karte auszugeben. */}
      {index && !coversArea && !packError && (
        <div className="map__empty">
          <strong>{t('app.map.outsidePack', { name: index.name })}</strong>
          <span>{t('app.map.outsidePackBody')}</span>
        </div>
      )}

      <svg
        className="map__svg"
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="img"
        aria-label={t('app.map.title')}
      >
        <rect className="map__ground" x={0} y={0} width={size.width} height={size.height} />

        {drawn.paths.map((path, i) => (
          <path key={i} d={path.d} className={path.className} />
        ))}

        {trailPoints.length > 1 && (
          <polyline
            className="map__trail"
            points={trailPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
          />
        )}

        {anchors
          .filter((anchor) => anchor.id !== target?.id)
          .map((anchor) => {
            const point = toScreen(viewport, project(anchor.lat, anchor.lng));
            if (point.x < -20 || point.y < -20 || point.x > size.width + 20 || point.y > size.height + 20) return null;
            return (
              <circle
                key={anchor.id}
                className="map__other"
                cx={point.x}
                cy={point.y}
                r={4}
                onClick={() => onSelectAnchor?.(anchor.id)}
              />
            );
          })}

        {targetPoint && (
          <g className="map__target">
            <circle cx={targetPoint.x} cy={targetPoint.y} r={12} className="map__target-halo" />
            <circle cx={targetPoint.x} cy={targetPoint.y} r={5.5} className="map__target-dot" />
          </g>
        )}

        {userPoint && (
          <g className="map__user">
            {position?.accuracy ? (
              <circle
                cx={userPoint.x}
                cy={userPoint.y}
                r={Math.min(90, Math.max(6, (position.accuracy * 0.5) / metersPerPixel))}
                className="map__accuracy"
              />
            ) : null}
            <circle cx={userPoint.x} cy={userPoint.y} r={6} className="map__user-dot" />
            <circle cx={userPoint.x} cy={userPoint.y} r={11} className="map__user-ring" />
          </g>
        )}

        {drawn.labels.map((label) => (
          <text key={`${label.text}${label.x}`} className="map__label" x={label.x} y={label.y}>
            {label.text}
          </text>
        ))}
      </svg>

      {/* Zoom: two buttons, because pinching in a WebView competes with page zoom. */}
      <div className="map__controls">
        <button
          type="button"
          className="map__zoom"
          onClick={() => setZoom((value) => Math.max(0.5, value / 1.6))}
          aria-label={t('app.map.zoomIn')}
        >
          +
        </button>
        <button
          type="button"
          className="map__zoom"
          onClick={() => setZoom((value) => Math.min(8, value * 1.6))}
          aria-label={t('app.map.zoomOut')}
        >
          −
        </button>
      </div>

      <div className="map__scale" aria-hidden="true">
        <span className="map__scale-bar" style={{ width: scaleBar.width }} />
        <span className="map__scale-text">{scaleBar.label}</span>
      </div>

      <p className="map__attribution">
        {index?.source ?? t('app.map.attribution')}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function polygonPath(
  points: ReadonlyArray<readonly [number, number]>,
  dx: number,
  dy: number,
  scale: number,
  close: boolean,
): string {
  let d = '';
  for (let i = 0; i < points.length; i++) {
    const x = (points[i][0] + dx) / scale;
    const y = (points[i][1] + dy) / scale;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return close ? `${d}Z` : d;
}

/** A scale bar is the cheapest honesty device on a map. */
function scaleFor(metersPerPixel: number, locale: 'de' | 'en'): { width: number; label: string } {
  const candidates = [5, 10, 20, 50, 100, 200, 500, 1000];
  const target = 72; // px
  let best = candidates[0];
  for (const candidate of candidates) {
    if (Math.abs(candidate / metersPerPixel - target) < Math.abs(best / metersPerPixel - target)) best = candidate;
  }
  const width = Math.max(24, Math.min(120, best / metersPerPixel));
  const label = best >= 1000 ? `${best / 1000} km` : `${best} m`;
  void locale;
  return { width, label };
}
