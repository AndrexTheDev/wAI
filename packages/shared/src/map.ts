/**
 * Offline street map: tiles, projection and what is worth drawing.
 *
 * The app promises to work without a network, so the map cannot be a tile server.
 * Instead a city pack is downloaded once, cut into square tiles and stored on the
 * device; this module is the pure geometry between "a pack on disk" and "pixels on
 * screen". Everything here is synchronous and testable without a browser.
 *
 * Coordinate system: Web-Mercator in metres at a fixed zoom (see `MAP_ZOOM`), with
 * Y pointing south, exactly like the tiles themselves. Screens are drawn by
 * subtracting a tile origin and scaling – no map library, no floating point
 * surprises at the edges.
 */

/**
 * A pack is cut on a fixed Web-Mercator grid. Zoom 18 is the sweet spot: tiles are
 * ~150 m across (about one city block) and 0.6 m of ground per unit at the equator,
 * which is plenty for a footprint you can see from the pavement.
 */
export const MAP_ZOOM = 18;
export const TILE_SIZE = 256;

const EARTH_CIRCUMFERENCE = 40_075_016.686;

/**
 * The map works in **world pixels at MAP_ZOOM**, not in metres.
 *
 * Trying to use "Mercator metres" was the first version's bug: at zoom 16 the world
 * is 2.6 trillion "metres" wide, so a 100 m step came out as 9 800 km. Pixels are
 * the unit the tiles themselves use, and `metresPerUnit` converts wherever a real
 * distance is needed (scale bar, accuracy circle).
 */
export function worldPixels(zoom = MAP_ZOOM): number {
  return TILE_SIZE * Math.pow(2, zoom);
}

/** Ground metres per world unit at a given latitude. */
export function metresPerUnit(lat: number, zoom = MAP_ZOOM): number {
  return (EARTH_CIRCUMFERENCE * Math.cos((lat * Math.PI) / 180)) / worldPixels(zoom);
}

/** Pack format version – stored in the index so old packs are rejected loudly. */
export const MAP_PACK_VERSION = 1;

export interface MapTileRef {
  z: number;
  x: number;
  y: number;
}

export interface MapBuilding {
  /** Footprint in tile-local world pixels (0…256) – cheap to store, cheap to draw. */
  points: Array<[number, number]>;
  /** Optional label anchors: shops, garages, entrances. */
  kind?: 'building' | 'parking' | 'shop' | 'entrance';
}

export interface MapTile {
  z: number;
  x: number;
  y: number;
  /** Roads as polylines in tile-local world pixels. */
  roads: Array<{ class: 'motorway' | 'primary' | 'residential' | 'service' | 'footway'; points: Array<[number, number]> }>;
  buildings: MapBuilding[];
  /** Water and green areas for orientation – a park is a landmark too. */
  areas: Array<{ kind: 'water' | 'green'; points: Array<[number, number]> }>;
  /** Points of interest without text: shops, entrances, parking. */
  pois?: Array<{ kind: 'shop' | 'parking' | 'entrance'; x: number; y: number }>;
  /** Feature names that fit the tile (street names, car parks). */
  labels: Array<{ text: string; x: number; y: number; kind: 'street' | 'place' | 'parking' }>;
}

export interface MapPackIndex {
  version: number;
  /**
   * Ordner-Slug des Pakets, z. B. "muenchen-mitte". Fehlt bei Paketen aus der
   * ersten Fassung; der Renderer benutzt dann "münchen-mitte".
   */
  slug?: string;
  /** Human name, e.g. "München Mitte". */
  name: string;
  zoom: number;
  /** Bounding box of the pack in degrees. */
  bounds: { south: number; west: number; north: number; east: number };
  tiles: Array<{ x: number; y: number; bytes: number; buildings: number; roads: number }>;
  /** Where the data came from and when – required by ODbL attribution. */
  source: string;
  /**
   * True when the geometry is synthetic (demo/test). The map must not claim
   * OpenStreetMap attribution for shapes that nobody surveyed.
   */
  synthetic?: boolean;
  generatedAt: string;
}

/**
 * Übersicht aller Kartenpakete, die die App kennt (`map/packs.json`).
 *
 * Ein Paket deckt ein Gebiet ab, nicht die Welt. Bis hierhin konnte die App genau
 * ein Paket lesen; für „offline pro Stadt" muss sie wissen, **welche** Gebiete sie
 * hat, noch bevor sie eines lädt – sonst zeigt sie außerhalb Münchens eine leere
 * Fläche und behauptet, es gäbe keine Karte.
 */
export interface MapPackSummary {
  slug: string;
  name: string;
  bounds: { south: number; west: number; north: number; east: number };
  buildings: number;
  synthetic?: boolean;
}

export interface MapPackRegistry {
  version: number;
  packs: MapPackSummary[];
}

/** Liegt der Punkt im Gebiet dieses Pakets? */
export function packContains(
  pack: { bounds: { south: number; west: number; north: number; east: number } },
  position: { lat: number; lng: number },
): boolean {
  return (
    position.lat >= pack.bounds.south &&
    position.lat <= pack.bounds.north &&
    position.lng >= pack.bounds.west &&
    position.lng <= pack.bounds.east
  );
}

/**
 * Welches Paket soll angezeigt werden?
 *
 * Reihenfolge: das Gebiet, in dem der Standort liegt; sonst das Paket, dessen Mitte
 * am nächsten liegt (man läuft aus dem Gebiet heraus, die Kacheln sollen bleiben);
 * sonst das erste überhaupt, damit die Karte nicht leer startet.
 */
export function pickPack(
  packs: ReadonlyArray<MapPackSummary>,
  position: { lat: number; lng: number },
): MapPackSummary | null {
  if (packs.length === 0) return null;
  const inside = packs.find((pack) => packContains(pack, position));
  if (inside) return inside;
  let best = packs[0];
  let bestDistance = Infinity;
  for (const pack of packs) {
    const centreLat = (pack.bounds.south + pack.bounds.north) / 2;
    const centreLng = (pack.bounds.west + pack.bounds.east) / 2;
    const distance = Math.hypot(centreLat - position.lat, centreLng - position.lng);
    if (distance < bestDistance) {
      best = pack;
      bestDistance = distance;
    }
  }
  return best;
}

/** Ortsname für die Anzeige, wenn der Standort in keinem Paket liegt. */
export function describePacks(packs: ReadonlyArray<MapPackSummary>): string {
  return packs.map((pack) => pack.name).join(' · ');
}

/* ------------------------------------------------------------------ */
/* Projection                                                          */
/* ------------------------------------------------------------------ */

/** Longitude/latitude → world pixels at MAP_ZOOM. */
export function project(lat: number, lng: number, zoom = MAP_ZOOM): { x: number; y: number } {
  const scale = worldPixels(zoom);
  const x = ((lng + 180) / 360) * scale;
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/** World pixels → degrees. Inverse of `project`. */
export function unproject(x: number, y: number, zoom = MAP_ZOOM): { lat: number; lng: number } {
  const scale = worldPixels(zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - 2 * Math.PI * (y / scale);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

export function tileOf(lat: number, lng: number, zoom = MAP_ZOOM): MapTileRef {
  const { x, y } = project(lat, lng, zoom);
  return { z: zoom, x: Math.floor(x / TILE_SIZE), y: Math.floor(y / TILE_SIZE) };
}

/** Top-left corner of a tile in absolute metres. */
export function tileOrigin(tile: MapTileRef): { x: number; y: number } {
  return { x: tile.x * TILE_SIZE, y: tile.y * TILE_SIZE };
}

/* ------------------------------------------------------------------ */
/* Viewport                                                            */
/* ------------------------------------------------------------------ */

export interface MapViewport {
  /** Centre of the screen in world pixels at MAP_ZOOM. */
  centre: { x: number; y: number };
  /** World units per screen pixel – the zoom factor (1 = pack resolution). */
  unitsPerPixel: number;
  width: number;
  height: number;
}

/**
 * Zoom range on screen. 1 shows the pack at its native resolution; 8 is roughly a
 * whole city block per 100 px, which is where "which side of the street" still
 * reads. Below 1 the pack has no more detail to give.
 */
const MIN_UNITS_PER_PIXEL = 0.5;
const MAX_UNITS_PER_PIXEL = 4;

/** Centre the viewport on a point. `unitsPerPixel` is clamped to what the pack can show. */
export function viewportFor(
  lat: number,
  lng: number,
  width: number,
  height: number,
  unitsPerPixel = 2.4,
): MapViewport {
  return {
    centre: project(lat, lng),
    width,
    height,
    unitsPerPixel: Math.min(MAX_UNITS_PER_PIXEL, Math.max(MIN_UNITS_PER_PIXEL, unitsPerPixel)),
  };
}

/** Absolute metres → screen pixels inside a viewport. */
export function toScreen(viewport: MapViewport, point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: (point.x - viewport.centre.x) / viewport.unitsPerPixel + viewport.width / 2,
    y: (point.y - viewport.centre.y) / viewport.unitsPerPixel + viewport.height / 2,
  };
}

/** Screen pixels → absolute metres (tap-to-inspect on the map). */
export function toWorld(viewport: MapViewport, screen: { x: number; y: number }): { x: number; y: number } {
  return {
    x: (screen.x - viewport.width / 2) * viewport.unitsPerPixel + viewport.centre.x,
    y: (screen.y - viewport.height / 2) * viewport.unitsPerPixel + viewport.centre.y,
  };
}

/**
 * Tiles that intersect the viewport, with their offset in **world units** relative
 * to the tile's own top-left corner.
 *
 * The unit matters and was wrong: this returned *screen pixels*, and the renderer
 * added them to the raw geometry before dividing by `unitsPerPixel`. That is only
 * correct when the scale happens to be exactly the default 2.4 — at every other
 * zoom level each tile was drawn off by the zoom factor, so neighbouring tiles
 * overlapped and cut each other into the visual knot seen on the first real map.
 */

export function visibleTiles(viewport: MapViewport): Array<{ tile: MapTileRef; dx: number; dy: number }> {
  const halfW = (viewport.width / 2) * viewport.unitsPerPixel;
  const halfH = (viewport.height / 2) * viewport.unitsPerPixel;
  const minX = viewport.centre.x - halfW;
  const maxX = viewport.centre.x + halfW;
  const minY = viewport.centre.y - halfH;
  const maxY = viewport.centre.y + halfH;

  const fromX = Math.floor(minX / TILE_SIZE);
  const toX = Math.floor(maxX / TILE_SIZE);
  const fromY = Math.floor(minY / TILE_SIZE);
  const toY = Math.floor(maxY / TILE_SIZE);

  const out: Array<{ tile: MapTileRef; dx: number; dy: number }> = [];
  for (let ty = fromY; ty <= toY; ty++) {
    for (let tx = fromX; tx <= toX; tx++) {
      // Ursprung der Kachel in Weltkoordinaten; dx/dy ist der Versatz der Kachel
      // gegen den Bildmittelpunkt, **in Welteinheiten**.
      out.push({
        tile: { z: MAP_ZOOM, x: tx, y: ty },
        dx: tx * TILE_SIZE - viewport.centre.x,
        dy: ty * TILE_SIZE - viewport.centre.y,
      });
    }
  }
  return out;
}

/** Should the viewport be zoomed out to keep a far target on screen? */
export function fitToInclude(
  viewport: MapViewport,
  point: { x: number; y: number },
  padding = 48,
): MapViewport {
  const dx = Math.abs(point.x - viewport.centre.x) * 2 + padding * 2;
  const dy = Math.abs(point.y - viewport.centre.y) * 2 + padding * 2;
  const neededX = dx / Math.max(1, viewport.width);
  const neededY = dy / Math.max(1, viewport.height);
  const needed = Math.max(neededX, neededY);
  if (needed <= viewport.unitsPerPixel) return viewport;
  return { ...viewport, unitsPerPixel: Math.min(MAX_UNITS_PER_PIXEL, needed) };
}

/* ------------------------------------------------------------------ */
/* What to draw                                                        */
/* ------------------------------------------------------------------ */

export const ROAD_WIDTH_M: Record<string, number> = {
  motorway: 16,
  primary: 11,
  residential: 7,
  service: 4.5,
  footway: 2,
};

/**
 * Cull geometry that cannot be seen.
 *
 * A tile holds hundreds of buildings; drawing the ten that are off-screen costs the
 * same as drawing the ones you need, and on a phone that is the difference between
 * 60 and 20 frames per second while walking.
 */
export function visiblePolygons<T extends { points: Array<[number, number]> }>(
  items: readonly T[],
  viewport: MapViewport,
  origin: { x: number; y: number },
): T[] {
  const halfW = (viewport.width / 2) * viewport.unitsPerPixel;
  const halfH = (viewport.height / 2) * viewport.unitsPerPixel;
  const minX = viewport.centre.x - halfW - origin.x;
  const maxX = viewport.centre.x + halfW - origin.x;
  const minY = viewport.centre.y - halfH - origin.y;
  const maxY = viewport.centre.y + halfH - origin.y;

  return items.filter((item) => {
    let inside = false;
    for (const [x, y] of item.points) {
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        inside = true;
        break;
      }
    }
    return inside;
  });
}

/**
 * Labels are optional decoration; overlap is worse than absence.
 *
 * Greedy placement in draw order: take the first label that does not collide with
 * something already placed. Deterministic, so the map does not jitter between
 * frames while walking.
 *
 * Two rules learned from the first real pack, where the screen was a wall of print:
 * a name is placed **once** (OSM splits one street into dozens of ways, each with
 * the same name), and two labels of the same text need real distance, not just
 * non-overlapping boxes – "Isartorplatz" twice, side by side, reads as a glitch.
 */
export function placeLabels(
  labels: ReadonlyArray<{ text: string; x: number; y: number; priority?: number }>,
  measure: (text: string) => { width: number; height: number },
  options: { repeatDistance?: number } = {},
): Array<{ text: string; x: number; y: number }> {
  const repeatDistance = options.repeatDistance ?? 120;
  const placed: Array<{ text: string; x: number; y: number }> = [];
  const boxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const seen = new Map<string, Array<{ x: number; y: number }>>();
  for (const label of labels) {
    const near = seen.get(label.text);
    if (near?.some((p) => Math.hypot(p.x - label.x, p.y - label.y) < repeatDistance)) continue;
    const size = measure(label.text);
    const box = {
      x1: label.x - size.width / 2,
      y1: label.y - size.height / 2,
      x2: label.x + size.width / 2,
      y2: label.y + size.height / 2,
    };
    const collides = boxes.some(
      (other) => box.x1 < other.x2 && box.x2 > other.x1 && box.y1 < other.y2 && box.y2 > other.y1,
    );
    if (collides) continue;
    boxes.push(box);
    placed.push(label);
    (near ?? seen.set(label.text, []).get(label.text)!).push({ x: label.x, y: label.y });
  }
  return placed;
}

/**
 * Pick the pack tile for a position, or the nearest one that exists.
 *
 * A pack never covers the whole city, and walking 200 m past its edge should not
 * blank the screen – it should keep showing the last rows it has.
 */
export function nearestTile(
  position: { lat: number; lng: number },
  available: ReadonlyArray<{ x: number; y: number }>,
): { x: number; y: number } | null {
  if (available.length === 0) return null;
  const want = tileOf(position.lat, position.lng);
  let best = available[0];
  let bestDistance = Infinity;
  for (const tile of available) {
    const distance = Math.hypot(tile.x - want.x, tile.y - want.y);
    if (distance < bestDistance) {
      best = tile;
      bestDistance = distance;
    }
  }
  return best;
}
