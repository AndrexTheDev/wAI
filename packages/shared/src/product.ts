/**
 * wAI – product-wide constants shared by the Android app, the landing page and
 * the license tooling. Keeping them in one place guarantees that prices, wallet
 * addresses and limits can never drift apart between deliverables.
 */

export const PRODUCT = {
  name: 'wAI',
  legalBrand: 'AndrexTheDev',
  contactEmail: 'hippie.highho@gmail.com',
  version: '1.0.0',
  website: 'https://wai.app',
  packageId: 'dev.andrexthedev.wai',
} as const;

/** Crypto wallets of the developer (non-custodial, user pays directly). */
export type CryptoAsset = 'SOL' | 'BTC' | 'ETH';

export interface WalletInfo {
  asset: CryptoAsset;
  name: string;
  network: string;
  /** Human readable network note shown in the UI. */
  networkNote: { de: string; en: string };
  address: string;
  uriScheme: string;
  /** Canonical URI (BIP21 / EIP-681 / Solana Pay) used for the QR code. */
  uri: string;
  explorer: string;
  decimals: number;
  accent: string;
  symbol: string;
}

export const WALLETS: Record<CryptoAsset, WalletInfo> = {
  SOL: {
    asset: 'SOL',
    name: 'Solana',
    network: 'Solana Mainnet-Beta',
    networkNote: {
      de: 'Nur Solana (SOL) auf dem Mainnet senden. Keine SPL-Token, keine anderen Chains.',
      en: 'Send SOL on Solana Mainnet only. No SPL tokens, no other chains.',
    },
    address: '79KsqtJJdhKFJ9woxnYgtf3nq7HxQveafWBCtC3mxWi8',
    uriScheme: 'solana',
    uri: 'solana:79KsqtJJdhKFJ9woxnYgtf3nq7HxQveafWBCtC3mxWi8',
    explorer: 'https://solscan.io/account/79KsqtJJdhKFJ9woxnYgtf3nq7HxQveafWBCtC3mxWi8',
    decimals: 9,
    accent: '#14F195',
    symbol: '◎',
  },
  BTC: {
    asset: 'BTC',
    name: 'Bitcoin',
    network: 'Bitcoin Mainnet',
    networkNote: {
      de: 'Nur Bitcoin (BTC) auf dem Mainnet senden – Adresse beginnt mit „bc1“. Kein Lightning, keine Testnet-Adresse.',
      en: 'Send BTC on Bitcoin mainnet only – the address starts with “bc1”. No Lightning, no testnet address.',
    },
    address: 'bc1qeqzrlfg3edrydk4s0hecakc82gp26n5p7hkc7f',
    uriScheme: 'bitcoin',
    uri: 'bitcoin:bc1qeqzrlfg3edrydk4s0hecakc82gp26n5p7hkc7f',
    explorer: 'https://mempool.space/address/bc1qeqzrlfg3edrydk4s0hecakc82gp26n5p7hkc7f',
    decimals: 8,
    accent: '#F7931A',
    symbol: '₿',
  },
  ETH: {
    asset: 'ETH',
    name: 'Ethereum',
    network: 'Ethereum Mainnet (ERC-20 / L1)',
    networkNote: {
      de: 'Nur ETH auf Ethereum Mainnet senden. Kein BNB-Chain-, Polygon- oder Arbitrum-Transfer.',
      en: 'Send ETH on Ethereum mainnet only. Do not use BNB Chain, Polygon or Arbitrum.',
    },
    address: '0xBC3fab34f69bc9f6661608C3FB36dDdC313C42F7',
    uriScheme: 'ethereum',
    uri: 'ethereum:0xBC3fab34f69bc9f6661608C3FB36dDdC313C42F7',
    explorer: 'https://etherscan.io/address/0xBC3fab34f69bc9f6661608C3FB36dDdC313C42F7',
    decimals: 18,
    accent: '#627EEA',
    symbol: 'Ξ',
  },
};

export const WALLET_LIST: WalletInfo[] = [WALLETS.SOL, WALLETS.BTC, WALLETS.ETH];

/**
 * Suggested support amounts. Prices are "suggested" because the license is
 * non-custodial: the user sends whatever they confirm in the flow and the
 * app/store operator unlocks the key manually or via the signed license.
 */
export const PRICING = {
  /** One-time lifetime Pro unlock, in EUR – marketing reference price. */
  proPriceEur: 14.99,
  proPriceLabel: { de: '14,99 € einmalig', en: '€14.99 one-time' },
  proCompareLabel: {
    de: 'Weniger als ein Parkhaus-Volltarif – für immer.',
    en: 'Less than a full-day parking fee – forever.',
  },
  /** Suggested crypto amounts per asset (crypto reference prices, editable). */
  suggestedCrypto: {
    SOL: 0.12,
    BTC: 0.00017,
    ETH: 0.0042,
  } as Record<CryptoAsset, number>,
  monthlyEur: { de: '0 € pro Monat', en: '€0 per month' },
  refundDays: 14,
} as const;

/** Free plan limits – enforced in the app and listed on the landing page. */
export const FREE_LIMITS = {
  activeAnchors: 3,
  notesPerAnchor: 1,
  photosPerAnchor: 1,
  voicePerAnchor: 0,
  multiView: false,
  breadcrumbTrail: false,
  proximityFeedback: false,
  parkTimer: false,
  mediaShare: false,
  archive: false,
  favorites: false,
} as const;

export const PRO_FEATURES = {
  activeAnchors: Infinity,
  notesPerAnchor: Infinity,
  photosPerAnchor: Infinity,
  voicePerAnchor: Infinity,
  multiView: true,
  breadcrumbTrail: true,
  proximityFeedback: true,
  parkTimer: true,
  mediaShare: true,
  archive: true,
  favorites: true,
} as const;

export const isProFeature = (key: keyof typeof FREE_LIMITS): boolean => key in PRO_FEATURES;
