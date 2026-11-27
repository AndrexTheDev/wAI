/** Compact icon set for the app (shares the same visual language as the site). */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const s = ({ size = 20, ...rest }: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...rest,
});

/**
 * Die Marke: Pin mit Pfeil nach oben.
 *
 * Sie ist das App-Zeichen (`tools/make-icons.mjs`) und erscheint als Linienfassung
 * dort, wo die Marke selbst steht – Kopfzeile, Startfläche. Vorher war hier ein
 * Anker: das Zeichen sagte „Boot", und auf dem Homescreen stand inzwischen etwas
 * anderes. Zwei Symbole für ein Produkt sind ein Fehler, kein Detail.
 */
export const Brand = (p: P) => (
  <svg {...s(p)}>
    <path d="M12 21.6c3.8-3.9 5.6-6.1 5.6-8.6a5.6 5.6 0 1 0-11.2 0c0 2.5 1.8 4.7 5.6 8.6Z" />
    <path d="M12 6.6l2.7 3.3h-1.7v2.3h-2V9.9H9.3z" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * Ein gesetzter Anker als Zeichen in Listen und Karten – bewusst **nicht** die
 * Marke: der Pin mit Pfeil bedeutet „hier entlang", ein Anker-Symbol in einer Liste
 * bedeutet „dieser Punkt". Sonst wären Marke und Inhalt nicht unterscheidbar.
 */
export const Anchor = (p: P) => (
  <svg {...s(p)}>
    <path d="M12 21s6.5-5.9 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 15.1 12 21 12 21Z" />
    <circle cx="12" cy="10.4" r="2.3" />
  </svg>
);

export const Compass = (p: P) => (
  <svg {...s(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" fill="currentColor" stroke="none" />
  </svg>
);

/** „Dreh dich nach links/rechts" – Pfeil um einen Punkt. */
export const RotateCw = (p: P) => (
  <svg {...s(p)}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 5v6h-6" />
  </svg>
);

export const Elevation = (p: P) => (
  <svg {...s(p)}>
    <path d="M3 19h18M12 4v10M8.5 7.5 12 4l3.5 3.5M8 19v-3M16 19v-6" />
  </svg>
);

export const Trail = (p: P) => (
  <svg {...s(p)}>
    <path d="M4 18c3 0 3-4 6-4s3-4 6-4 4-3 4-3" />
    <circle cx="4" cy="18" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="10" cy="14" r="1.2" fill="currentColor" stroke="none" opacity="0.65" />
    <circle cx="16" cy="10" r="1.2" fill="currentColor" stroke="none" opacity="0.45" />
    <circle cx="20" cy="7" r="1.4" fill="currentColor" stroke="none" opacity="0.3" />
  </svg>
);

export const Map = (p: P) => (
  <svg {...s(p)}>
    <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </svg>
);

export const Camera = (p: P) => (
  <svg {...s(p)}>
    <rect x="3" y="7" width="18" height="13" rx="3" />
    <circle cx="12" cy="13.5" r="3.6" />
    <path d="M8.5 7 10 4h4l1.5 3" />
  </svg>
);

export const Mic = (p: P) => (
  <svg {...s(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
  </svg>
);

export const StopMic = (p: P) => (
  <svg {...s(p)}>
    <rect x="5" y="5" width="14" height="14" rx="4" />
    <rect x="10" y="10" width="4" height="4" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

export const Vibrate = (p: P) => (
  <svg {...s(p)}>
    <rect x="8" y="4" width="8" height="16" rx="2.5" />
    <path d="M4.5 9v6M2 11v2M19.5 9v6M22 11v2" />
  </svg>
);

export const Timer = (p: P) => (
  <svg {...s(p)}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4.5l3 1.8M9 2h6" />
  </svg>
);

export const Share = (p: P) => (
  <svg {...s(p)}>
    <circle cx="17.5" cy="6" r="2.6" />
    <circle cx="6.5" cy="12" r="2.6" />
    <circle cx="17.5" cy="18" r="2.6" />
    <path d="M8.8 10.7 15.2 7.3M8.8 13.3l6.4 3.4" />
  </svg>
);

export const Ticket = (p: P) => (
  <svg {...s(p)}>
    <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 3 3 0 0 0 0 6 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 3 3 0 0 0 0-6Z" />
    <path d="M12 7v10" strokeDasharray="2 2.5" />
  </svg>
);

export const Torch = (p: P) => (
  <svg {...s(p)}>
    <path d="M9 3h6l1 4H8l1-4ZM8 7h8v3a4 4 0 0 1-8 0V7ZM12 14v7" />
  </svg>
);

export const Shield = (p: P) => (
  <svg {...s(p)}>
    <path d="M12 3 5 6v6c0 4.2 2.9 7.4 7 9 4.1-1.6 7-4.8 7-9V6l-7-3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </svg>
);

export const Settings = (p: P) => (
  <svg {...s(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
  </svg>
);

export const Archive = (p: P) => (
  <svg {...s(p)}>
    <rect x="3" y="4" width="18" height="5" rx="1.5" />
    <path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" />
  </svg>
);

export const Plus = (p: P) => (
  <svg {...s(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Check = (p: P) => (
  <svg {...s(p)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const Cross = (p: P) => (
  <svg {...s(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ChevronRight = (p: P) => (
  <svg {...s(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const ChevronDown = (p: P) => (
  <svg {...s(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronLeft = (p: P) => (
  <svg {...s(p)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);

export const Star = (p: P) => (
  <svg {...s(p)}>
    <path d="m12 3.5 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9L12 3.5Z" />
  </svg>
);

export const StarFilled = (p: P) => (
  <svg {...s(p)}>
    <path d="m12 3.5 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9L12 3.5Z" fill="currentColor" />
  </svg>
);

export const Trash = (p: P) => (
  <svg {...s(p)}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
  </svg>
);

export const Edit = (p: P) => (
  <svg {...s(p)}>
    <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
);

export const Copy = (p: P) => (
  <svg {...s(p)}>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M15 6.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1.5" />
  </svg>
);

export const QrIcon = (p: P) => (
  <svg {...s(p)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <path d="M14 14h3v3h-3zM20 14h1M14 20h3M20 17v4" />
  </svg>
);

export const Search = (p: P) => (
  <svg {...s(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m16.5 16.5 4 4" />
  </svg>
);

export const Info = (p: P) => (
  <svg {...s(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const Crown = (p: P) => (
  <svg {...s(p)}>
    <path d="M4 17h16l-1.2-8-4.3 3L12 6l-2.5 6-4.3-3L4 17ZM4 20h16" />
  </svg>
);

export const Lock = (p: P) => (
  <svg {...s(p)}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </svg>
);

export const Download = (p: P) => (
  <svg {...s(p)}>
    <path d="M12 3v12M7 10l5 5 5-5M4 19h16" />
  </svg>
);

export const Globe = (p: P) => (
  <svg {...s(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
  </svg>
);

export const Car = (p: P) => (
  <svg {...s(p)}>
    <path d="M4 16v-3.2L6 8h12l2 4.8V16M3 16h18v3.2h-3V16M6 19.2H3V16" />
    <circle cx="7.5" cy="16" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="16" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const Tent = (p: P) => (
  <svg {...s(p)}>
    <path d="M12 4 3 20h18L12 4Z" />
    <path d="m12 11-3.5 9M12 11l3.5 9" />
  </svg>
);

export const Pin = (p: P) => (
  <svg {...s(p)}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

export const Tool = (p: P) => (
  <svg {...s(p)}>
    <path d="M14.5 6.5a4 4 0 0 1 5 5L11 20a3.5 3.5 0 0 1-5-5l8.5-8.5Z" />
    <path d="m4 4 4 4" />
  </svg>
);

export const Tree = (p: P) => (
  <svg {...s(p)}>
    <path d="M12 3 6 12h3.5L5 19h14l-4.5-7H18L12 3Z" />
    <path d="M12 19v2.5" />
  </svg>
);

export const Door = (p: P) => (
  <svg {...s(p)}>
    <path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17H4Z" />
    <path d="M16 9h4v12M13 12h.01" />
  </svg>
);

export const Box = (p: P) => (
  <svg {...s(p)}>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
  </svg>
);

export const Play = (p: P) => (
  <svg {...s(p)}>
    <path d="M8 5.5v13l11-6.5L8 5.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const Pause = (p: P) => (
  <svg {...s(p)}>
    <rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
  </svg>
);

export const ArrowLeft = (p: P) => (
  <svg {...s(p)}>
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </svg>
);

export const ArrowUpRight = (p: P) => (
  <svg {...s(p)}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

export const Layers = (p: P) => (
  <svg {...s(p)}>
    <path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5" />
  </svg>
);

export const Solana = (p: P) => (
  <svg {...s(p)}>
    <path d="M6 8.2 8.2 6h12l-2.2 2.2H6Z" fill="currentColor" stroke="none" />
    <path d="M6 15.8 8.2 18h12l-2.2-2.2H6Z" fill="currentColor" stroke="none" />
    <path d="M6 12 8.2 14h12L18 12H6Z" fill="currentColor" stroke="none" opacity="0.75" />
  </svg>
);

export const Bitcoin = (p: P) => (
  <svg {...s(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 7.5h3.8a2.4 2.4 0 0 1 0 4.8H9.5m0 0h4.2a2.4 2.4 0 0 1 0 4.8H9.5M9.5 7.5V17M11 5.5v2M14 5.5v2M11 17v2M14 17v2" />
  </svg>
);

export const Ethereum = (p: P) => (
  <svg {...s(p)}>
    <path d="M12 2 6 12.2l6 3.5 6-3.5L12 2Z" fill="currentColor" stroke="none" opacity="0.85" />
    <path d="M6 13.6 12 22l6-8.4-6 3.4-6-3.4Z" fill="currentColor" stroke="none" opacity="0.6" />
  </svg>
);

export const Mail = (p: P) => (
  <svg {...s(p)}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const Moon = (p: P) => (
  <svg {...s(p)}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

export const Sun = (p: P) => (
  <svg {...s(p)}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" />
  </svg>
);

export const CATEGORY_ICONS = {
  car: Car,
  tent: Tent,
  meeting: Pin,
  tool: Tool,
  entrance: Door,
  nature: Tree,
  other: Box,
} as const;

export const WALLET_ICONS = {
  SOL: Solana,
  BTC: Bitcoin,
  ETH: Ethereum,
} as const;
