/** Hand-built, dependency-free icon set (24px grid, 1.6 stroke). */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = ({ size = 22, ...rest }: IconProps) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...rest,
});

export const AnchorIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="5" r="2.4" />
    <path d="M12 7.4V21" />
    <path d="M8 11h8" />
    <path d="M4 15a8 8 0 0 0 16 0" />
    <path d="M4 15h3M17 15h3" />
  </svg>
);

export const CompassIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" fill="currentColor" stroke="none" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
  </svg>
);

export const ElevationIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 19h18" />
    <path d="M12 4v11" />
    <path d="M8.5 7.5 12 4l3.5 3.5" />
    <path d="M8 19v-3M16 19v-6" />
  </svg>
);

export const TrailIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 18c3 0 3-4 6-4s3-4 6-4 4-3 4-3" />
    <circle cx="4" cy="18" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="10" cy="14" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
    <circle cx="16" cy="10" r="1.2" fill="currentColor" stroke="none" opacity="0.5" />
    <circle cx="20" cy="7" r="1.4" fill="currentColor" stroke="none" opacity="0.35" />
  </svg>
);

export const CameraIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="7" width="18" height="13" rx="3" />
    <circle cx="12" cy="13.5" r="3.6" />
    <path d="M8.5 7 10 4h4l1.5 3" />
  </svg>
);

export const MicIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21M9 21h6" />
  </svg>
);

export const VibrateIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="8" y="4" width="8" height="16" rx="2.5" />
    <path d="M4.5 9v6M2 11v2M19.5 9v6M22 11v2" />
  </svg>
);

export const TimerIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4.5l3 1.8" />
    <path d="M9 2h6" />
  </svg>
);

export const ShareIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="17.5" cy="6" r="2.6" />
    <circle cx="6.5" cy="12" r="2.6" />
    <circle cx="17.5" cy="18" r="2.6" />
    <path d="M8.8 10.7 15.2 7.3M8.8 13.3l6.4 3.4" />
  </svg>
);

export const TicketIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 3 3 0 0 0 0 6 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 3 3 0 0 0 0-6Z" />
    <path d="M12 7v10" strokeDasharray="2 2.5" />
  </svg>
);

export const TorchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 3h6l1 4H8l1-4Z" />
    <path d="M8 7h8v3a4 4 0 0 1-4 4 4 4 0 0 1-4-4V7Z" />
    <path d="M12 14v7" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 5 6v6c0 4.2 2.9 7.4 7 9 4.1-1.6 7-4.8 7-9V6l-7-3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </svg>
);

export const OfflineIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 8.8a15 15 0 0 1 20 0" opacity="0.35" />
    <path d="M5.5 12.4a10 10 0 0 1 13 0" opacity="0.55" />
    <path d="M9 16a5 5 0 0 1 6 0" opacity="0.8" />
    <circle cx="12" cy="19.4" r="1.1" fill="currentColor" stroke="none" />
    <path d="M3 3l18 18" stroke="var(--c-danger)" strokeWidth="1.8" />
  </svg>
);

export const BitcoinIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 7.5h3.8a2.4 2.4 0 0 1 0 4.8H9.5m0 0h4.2a2.4 2.4 0 0 1 0 4.8H9.5M9.5 7.5V17M11 5.5v2M14 5.5v2M11 17v2M14 17v2" />
  </svg>
);

export const SolanaIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 8.2 8.2 6h12l-2.2 2.2H6Z" fill="currentColor" stroke="none" />
    <path d="M6 15.8 8.2 18h12l-2.2-2.2H6Z" fill="currentColor" stroke="none" />
    <path d="M6 12 8.2 14h12L18 12H6Z" fill="currentColor" stroke="none" opacity="0.75" />
  </svg>
);

export const EthereumIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2 6 12.2l6 3.5 6-3.5L12 2Z" fill="currentColor" stroke="none" opacity="0.85" />
    <path d="M6 13.6 12 22l6-8.4-6 3.4-6-3.4Z" fill="currentColor" stroke="none" opacity="0.6" />
  </svg>
);

export const CopyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M15 6.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1.5" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const CrossIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

export const ArrowUpIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20V4M6 10l6-6 6 6" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v12M7 10l5 5 5-5" />
    <path d="M4 19h16" />
  </svg>
);

export const GlobeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
  </svg>
);

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const SparkIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8.5 13.4 11 16 12l-2.6 1-1.4 2.5-1.4-2.5L8 12l2.6-1L12 8.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const CrownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 17h16l-1.2-8-4.3 3L12 6l-2.5 6-4.3-3L4 17Z" />
    <path d="M4 20h16" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 5.5v13l11-6.5L8 5.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="6" y="2.5" width="12" height="19" rx="3" />
    <path d="M10.5 5.5h3" />
    <circle cx="12" cy="18.2" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const PrinterIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 8V4h10v4" />
    <rect x="4" y="8" width="16" height="8" rx="2" />
    <path d="M7 16h10v4H7z" />
  </svg>
);

export const AndroidIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 16a7 7 0 0 1 14 0v1H5v-1Z" />
    <path d="m7 6 1.6 2.4M17 6l-1.6 2.4" />
    <circle cx="9.4" cy="12.4" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="14.6" cy="12.4" r="0.8" fill="currentColor" stroke="none" />
    <path d="M3.4 19.4v2.2M20.6 19.4v2.2M9 20.4v2M15 20.4v2" opacity="0.6" />
  </svg>
);

export const MailIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const LayersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);

export const CarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 16v-3.2L6 8h12l2 4.8V16" />
    <path d="M3 16h18v3.2h-3V16M6 19.2H3V16" />
    <circle cx="7.5" cy="16" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="16.5" cy="16" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const TentIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4 3 20h18L12 4Z" />
    <path d="m12 11-3.5 9M12 11l3.5 9" />
  </svg>
);

export const PinIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

export const ToolIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14.5 6.5a4 4 0 0 1 5 5L11 20a3.5 3.5 0 0 1-5-5l8.5-8.5Z" />
    <path d="m4 4 4 4M9 9l-1.5 1.5" />
  </svg>
);

export const TreeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 6 12h3.5L5 19h14l-4.5-7H18L12 3Z" />
    <path d="M12 19v2.5" />
  </svg>
);

export const DoorIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17H4Z" />
    <path d="M16 9h4v12M13 12h.01" />
  </svg>
);

export const BoxIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
  </svg>
);

export const InfoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const LockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </svg>
);

export const ICON_MAP = {
  anchor: AnchorIcon,
  compass: CompassIcon,
  elevation: ElevationIcon,
  trail: TrailIcon,
  media: CameraIcon,
  proximity: VibrateIcon,
  timer: TimerIcon,
  share: ShareIcon,
  zones: TicketIcon,
  night: TorchIcon,
  car: CarIcon,
  tent: TentIcon,
  meeting: PinIcon,
  tool: ToolIcon,
  nature: TreeIcon,
  entrance: DoorIcon,
  other: BoxIcon,
} as const;

export type IconName = keyof typeof ICON_MAP;
