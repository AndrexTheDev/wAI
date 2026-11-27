import { useState } from 'react';
import QRCode from 'qrcode';
import {
  PRICING,
  PRODUCT,
  WALLET_LIST,
  licenseFingerprint,
  newOrderReference,
  type CryptoAsset,
} from '@wai/shared';
import { useApp } from '../store/AppStore';
import { useT } from '../i18n/useT';
import { useToast } from '../ui/Toast';
import { storage } from '../store/storage';

const SITE = import.meta.env.VITE_WEBSITE_URL ?? PRODUCT.website;
import { Sheet } from '../ui/Sheet';
import { openExternal } from '../platform/links';
import {
  Check,
  ChevronDown,
  Copy,
  Crown,
  Info,
  Layers,
  Mail,
  Share,
  Star,
  Timer,
  Trail,
  Vibrate,
  WALLET_ICONS,
  Camera,
  Mic,
  Lock,
  Anchor as AnchorIcon,
} from '../ui/icons';
import { useEffect, useRef } from 'react';

/**
 * Die Merkmalsliste nennt Fähigkeiten, keine Hinweissätze. Vorher standen hier die
 * langen Banner-Texte („… ist in Pro enthalten."), siebenmal derselbe Schluss –
 * eine Liste, die wie eine Fehlermeldung siebenmal wiederholt wurde.
 */
const PRO_LIST = [
  { icon: AnchorIcon, key: 'app.pro.listAnchors' },
  { icon: Camera, key: 'app.pro.listMedia' },
  { icon: Mic, key: 'app.pro.listVoice' },
  { icon: Layers, key: 'app.pro.listMultiView' },
  { icon: Trail, key: 'app.pro.listTrail' },
  { icon: Vibrate, key: 'app.pro.listProximity' },
  { icon: Timer, key: 'app.pro.listTimer' },
  { icon: Star, key: 'app.pro.listFavorite' },
  { icon: Share, key: 'app.pro.listShareFull' },
] as const;

function Qr({ value }: { value: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) {
      void QRCode.toCanvas(ref.current, value, {
        width: 336,
        margin: 1,
        color: { dark: '#07101c', light: '#ffffff' },
      }).catch(() => {});
    }
  }, [value]);
  return (
    <div className="qr-frame">
      <canvas ref={ref} aria-label="QR" />
    </div>
  );
}

export function ProScreen({
  open,
  onClose,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  reason?: string;
}) {
  const { t, locale } = useT();
  const { plan, activateLicense, license, deactivateLicense } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState<'upgrade' | 'activate'>('upgrade');
  const [token, setToken] = useState('');
  const [checking, setChecking] = useState(false);
  const [orderRef] = useState(() => newOrderReference());
  const [openAsset, setOpenAsset] = useState<CryptoAsset | null>('SOL');
  // Withdrawal-right consent must be actively given before any payment route is
  // shown (see docs/LEGAL_REVIEW.md §1.2). The timestamp is stored locally so we
  // can prove *when* consent was given, without sending it anywhere.
  const [consentAt, setConsentAt] = useState<number | null>(() =>
    storage.get<number | null>('purchaseConsentAt', null),
  );

  const giveConsent = () => {
    const now = Date.now();
    storage.set('purchaseConsentAt', now);
    setConsentAt(now);
  };

  const activate = async () => {
    if (!token.trim()) return;
    setChecking(true);
    const result = await activateLicense(token);
    setChecking(false);
    if (result.ok) {
      toast.show(`${t('app.pro.successTitle')} – ${t('app.pro.successBody')}`, 'ok');
      onClose();
    } else {
      const message =
        result.reason === 'expired'
          ? t('landing.crypto.licenseExpired')
          : result.reason === 'wrong-product'
            ? t('landing.crypto.licenseWrongProduct')
            : t('landing.crypto.licenseInvalid');
      toast.show(message, 'err');
    }
  };

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text);
    toast.show(t('common.copiedToClipboard'), 'ok');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={plan === 'pro' ? t('app.pro.title') : t('common.ctaPro')}
      closeLabel={t('common.ctaClose')}
      footer={
        plan === 'pro' ? (
          <button type="button" className="btn" onClick={onClose}>
            {t('common.ctaClose')}
          </button>
        ) : (
          /**
           * Der Knopf unten hieß „Aktivieren", schaltete aber nur auf den Reiter
           * „Lizenz aktivieren" – danach stand derselbe Knopf noch einmal im
           * Inhalt, diesmal mit Wirkung. Zwei Knöpfe, gleicher Text, einer ohne
           * Funktion. Jetzt tut der untere Knopf, was draufsteht: auf dem
           * Wallet-Reiter führt er zum Lizenzfeld, auf dem Lizenz-Reiter prüft er.
           */
          tab === 'upgrade' ? (
            <button type="button" className="btn btn--primary" onClick={() => setTab('activate')}>
              <Lock size={15} /> {t('app.pro.haveLicense')}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              disabled={!token.trim() || checking}
              onClick={() => void activate()}
            >
              <Check size={15} /> {checking ? t('common.loading') : t('app.pro.activateCta')}
            </button>
          )
        )
      }
    >
      {plan === 'pro' ? (
        <>
          <div className="pro-hero">
            <span className="pro-hero__icon">
              <Crown size={26} />
            </span>
            <h3>{t('app.pro.successTitle')}</h3>
            <p className="muted">{t('app.pro.successBody')}</p>
          </div>
          <div className="card">
            <div className="row row--between">
              <span className="muted">{t('landing.crypto.licenseFingerprint')}</span>
              <span className="mono">{license.fingerprint ?? '–'}</span>
            </div>
            <div className="row row--between" style={{ marginTop: 6 }}>
              <span className="muted">Plan</span>
              <span className="mono">{locale === 'de' ? 'Pro · lebenslang' : 'Pro · lifetime'}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() => {
              deactivateLicense();
              toast.show(t('app.settings.licenseStatusFree'), 'info');
            }}
          >
            {t('app.settings.licenseDeactivate')}
          </button>
        </>
      ) : (
        <>
          <div className="pro-hero">
            <span className="pro-hero__icon">
              <Crown size={26} />
            </span>
            <h3>{PRICING.proPriceLabel[locale]}</h3>
            <p className="muted">{t('app.pro.subtitle')}</p>
          </div>

          {reason && (
            <div className="banner">
              <Crown size={15} />
              <div className="banner__body">{reason}</div>
            </div>
          )}

          <div className="segmented" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'upgrade'} className={tab === 'upgrade' ? 'is-active' : ''} onClick={() => setTab('upgrade')}>
              {t('app.pro.seeWallets')}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'activate'} className={tab === 'activate' ? 'is-active' : ''} onClick={() => setTab('activate')}>
              {t('app.pro.activateTitle')}
            </button>
          </div>

          {tab === 'upgrade' ? (
            <>
              <div className="pro-features">
                {PRO_LIST.map((item) => (
                  <div key={item.key} className="pro-feature">
                    <item.icon size={15} />
                    <span>{t(item.key)}</span>
                  </div>
                ))}
              </div>

              {consentAt === null ? (
                <div className="card consent-card">
                  <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                    <input
                      id="wai-consent"
                      type="checkbox"
                      className="consent-card__box"
                      checked={false}
                      onChange={giveConsent}
                    />
                    <label htmlFor="wai-consent" className="consent-card__label">
                      {t('app.pro.consentLabel')}
                    </label>
                  </div>
                  <p className="field__help">{t('app.pro.consentHelp')}</p>
                  <button
                    type="button"
                    className="btn btn--quiet btn--xs"
                    onClick={() => openExternal(`${SITE}/legal/terms`)}
                  >
                    {t('app.pro.withdrawalLink')}
                  </button>
                </div>
              ) : (
                <p className="consent-recorded">
                  <Check size={12} /> {t('app.pro.consentStored')} ·{' '}
                  <span className="mono">
                    {new Date(consentAt).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB')}
                  </span>
                </p>
              )}

              {consentAt !== null && (
              <>
              <div className="card">
                <span className="field__label">{t('landing.crypto.orderRef')}</span>
                <div className="row row--between">
                  <span className="mono" style={{ color: 'var(--mint)', fontSize: 14 }}>{orderRef}</span>
                  <button type="button" className="btn btn--xs" onClick={() => copy(orderRef)}>
                    <Copy size={12} /> {t('common.ctaCopy')}
                  </button>
                </div>
                <p className="field__help">{t('landing.crypto.orderRefHelp')}</p>
              </div>

              {WALLET_LIST.map((wallet) => {
                const Icon = WALLET_ICONS[wallet.asset];
                const isOpen = openAsset === wallet.asset;
                const amount = PRICING.suggestedCrypto[wallet.asset];
                return (
                  <div key={wallet.asset} className="wallet">
                    <button
                      type="button"
                      className="wallet__head"
                      onClick={() => setOpenAsset(isOpen ? null : wallet.asset)}
                      aria-expanded={isOpen}
                      style={{ width: '100%', textAlign: 'left' }}
                    >
                      <span className="wallet__icon" style={{ color: wallet.accent }}>
                        <Icon size={17} />
                      </span>
                      <span style={{ display: 'grid' }}>
                        <span className="wallet__name">{wallet.name}</span>
                        <span className="wallet__network">{wallet.network}</span>
                      </span>
                      <span className="wallet__amount" style={{ color: wallet.accent }}>
                        {amount} {wallet.asset}
                      </span>
                      <ChevronDown size={15} style={{ rotate: isOpen ? '180deg' : '0deg', transition: 'rotate 160ms' }} />
                    </button>

                    {isOpen && (
                      <>
                        <code className="wallet__address">{wallet.address}</code>
                        <Qr value={wallet.uri} />
                        <div className="wallet__actions">
                          <button type="button" className="btn btn--xs" onClick={() => copy(wallet.address)}>
                            <Copy size={12} /> {t('landing.crypto.copyAddress')}
                          </button>
                          <button type="button" className="btn btn--xs" onClick={() => copy(String(amount))}>
                            {t('landing.crypto.copyAmount')}
                          </button>
                          <button type="button" className="btn btn--xs" onClick={() => openExternal(wallet.uri)}>
                            {t('landing.crypto.openWallet')}
                          </button>
                          <button type="button" className="btn btn--xs" onClick={() => openExternal(wallet.explorer)}>
                            Explorer ↗
                          </button>
                        </div>
                        <p className="wallet__warn">
                          <Info size={11} /> {wallet.networkNote[locale]}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}

              <div className="banner">
                <Info size={15} />
                <div className="banner__body">
                  <span className="banner__title">{t('app.pro.pendingTitle')}</span>
                  <span>{t('app.pro.pendingBody')}</span>
                  <button
                    type="button"
                    className="btn btn--xs"
                    style={{ justifySelf: 'start' }}
                    onClick={() =>
                      openExternal(
                        `mailto:${PRODUCT.contactEmail}?subject=${encodeURIComponent(`wAI Pro – ${orderRef}`)}&body=${encodeURIComponent(
                          `${t('landing.crypto.orderRef')}: ${orderRef}\n${t('landing.crypto.txLabel')}: `,
                        )}`,
                      )
                    }
                  >
                    <Mail size={12} /> {t('landing.crypto.openMail')}
                  </button>
                </div>
              </div>

              <p className="muted">{t('landing.crypto.disclaimer')}</p>
              <p className="muted">{t('landing.crypto.refundNote')}</p>
              </>
              )}
            </>
          ) : (
            <>
              <label className="field">
                <span className="field__label">{t('app.pro.activateTitle')}</span>
                <textarea
                  className="field__textarea mono"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder={t('landing.crypto.licensePlaceholder')}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <span className="field__help">{t('landing.crypto.licenseBody')}</span>
              </label>
              {token.trim() && (
                <p className="muted">
                  {t('landing.crypto.licenseFingerprint')}:{' '}
                  <span className="mono">{licenseFingerprint(token)}</span>
                </p>
              )}
              <div className="banner banner--info">
                <Lock size={14} />
                <div className="banner__body">
                  {locale === 'de'
                    ? 'Die Lizenz wird kryptografisch und vollständig offline auf diesem Gerät geprüft.'
                    : 'The licence is verified cryptographically and entirely offline on this device.'}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
