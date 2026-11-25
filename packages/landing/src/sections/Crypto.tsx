import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  PRICING,
  PRODUCT,
  WALLET_LIST,
  licenseFingerprint,
  newOrderReference,
  verifyLicense,
  type CryptoAsset,
  type WalletInfo,
} from '@wai/shared';
import { useLocale } from '../lib/locale';
import { Link } from '../lib/router';
import { useClipboard } from '../lib/useClipboard';
import {
  BitcoinIcon,
  CheckIcon,
  CopyIcon,
  CrossIcon,
  InfoIcon,
  LockIcon,
  MailIcon,
  SolanaIcon,
  EthereumIcon,
  ArrowRightIcon,
  SparkIcon,
} from '../components/Icons';
import './Crypto.css';

const ASSET_ICONS = { SOL: SolanaIcon, BTC: BitcoinIcon, ETH: EthereumIcon } as const;

const EXPLORER_HINT: Record<CryptoAsset, { de: string; en: string }> = {
  SOL: { de: 'Solscan', en: 'Solscan' },
  BTC: { de: 'mempool.space', en: 'mempool.space' },
  ETH: { de: 'Etherscan', en: 'Etherscan' },
};

function QrCode({ value, label }: { value: string; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: 336,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#07101c', light: '#ffffff' },
    }).catch(() => setFailed(true));
  }, [value]);

  if (failed) return null;
  return (
    <div className="qr-frame crypto__qr">
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  );
}

function WalletCard({ wallet }: { wallet: WalletInfo }) {
  const { t, locale } = useLocale();
  const { copy, isCopied } = useClipboard();
  const Icon = ASSET_ICONS[wallet.asset];
  const amount = PRICING.suggestedCrypto[wallet.asset];

  return (
    <div className={`wallet-card wallet-card--${wallet.asset.toLowerCase()}`}>
      <div className="wallet-card__head">
        <span className="wallet-card__icon" style={{ color: wallet.accent }}>
          <Icon size={22} />
        </span>
        <div>
          <strong>{wallet.name}</strong>
          <span className="wallet-card__network">{wallet.network}</span>
        </div>
        <span className="wallet-card__amount">
          {amount} {wallet.asset}
        </span>
      </div>

      <div className="wallet-card__body">
        <div className="wallet-card__address">
          <span className="wallet-card__label">{t('landing.crypto.addressLabel')}</span>
          <code className="mono">{wallet.address}</code>
          <button
            type="button"
            className="btn btn--quiet btn--sm wallet-card__copy"
            onClick={() => copy(wallet.address, `${wallet.asset}-addr`)}
            aria-live="polite"
          >
            {isCopied(`${wallet.asset}-addr`) ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
            {isCopied(`${wallet.asset}-addr`) ? t('common.ctaCopied') : t('common.ctaCopy')}
          </button>
        </div>

        <QrCode value={wallet.uri} label={`${wallet.name} QR ${wallet.address}`} />
      </div>

      <p className="wallet-card__warn">
        <InfoIcon size={13} /> {wallet.networkNote[locale]}
      </p>

      <div className="wallet-card__actions">
        <a className="btn btn--ghost btn--sm" href={wallet.uri}>
          {t('landing.crypto.openWallet')} <ArrowRightIcon size={13} />
        </a>
        <a
          className="btn btn--quiet btn--sm"
          href={wallet.explorer}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {EXPLORER_HINT[wallet.asset][locale]} ↗
        </a>
      </div>
    </div>
  );
}

function LicenseActivator() {
  const { t, locale } = useLocale();
  const [value, setValue] = useState('');
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok'; fingerprint: string; plan: string } | { kind: 'error'; message: string }
  >({ kind: 'idle' });
  const [orderRef] = useState(() => newOrderReference());

  const onVerify = async () => {
    if (!value.trim()) return;
    setState({ kind: 'checking' });
    const result = await verifyLicense(value);
    if (result.ok && result.payload) {
      setState({
        kind: 'ok',
        fingerprint: licenseFingerprint(value),
        plan: result.payload.plan,
      });
    } else {
      const reason = result.reason ?? 'malformed';
      const message =
        reason === 'expired'
          ? t('landing.crypto.licenseExpired')
          : reason === 'wrong-product'
            ? t('landing.crypto.licenseWrongProduct')
            : t('landing.crypto.licenseInvalid');
      setState({ kind: 'error', message });
    }
  };

  return (
    <div className="license">
      <h3 className="license__title">
        <LockIcon size={17} /> {t('landing.crypto.licenseTitle')}
      </h3>
      <p className="license__body">{t('landing.crypto.licenseBody')}</p>

      <div className="license__row">
        <label className="sr-only" htmlFor="license-input">
          {t('landing.crypto.licenseTitle')}
        </label>
        <input
          id="license-input"
          className="license__input mono"
          placeholder={t('landing.crypto.licensePlaceholder')}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setState({ kind: 'idle' });
          }}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={onVerify}
          disabled={!value.trim() || state.kind === 'checking'}
        >
          {state.kind === 'checking' ? t('common.loading') : t('landing.crypto.licenseActivate')}
        </button>
      </div>

      {state.kind === 'ok' && (
        <p className="license__result license__result--ok">
          <CheckIcon size={15} />
          {t('landing.crypto.licenseValid')} · {t('landing.crypto.licenseFingerprint')}:{' '}
          <span className="mono">{state.fingerprint}</span>
        </p>
      )}
      {state.kind === 'error' && (
        <p className="license__result license__result--err">
          <CrossIcon size={15} />
          {state.message}
        </p>
      )}

      <p className="license__hint">
        {locale === 'de'
          ? 'Diese Prüfung läuft vollständig in deinem Browser – kein Server, keine Übertragung deines Schlüssels.'
          : 'This check runs entirely in your browser – no server, your key is never transmitted.'}
      </p>

      <div className="license__order">
        <span>{t('landing.crypto.orderRef')}</span>
        <code className="mono">{orderRef}</code>
        <span className="license__order-help">{t('landing.crypto.orderRefHelp')}</span>
      </div>
    </div>
  );
}

export function Crypto() {
  const { t, locale } = useLocale();
  const { copy, isCopied } = useClipboard();
  const [tx, setTx] = useState('');
  const steps = useMemo(() => [1, 2, 3, 4].map((i) => ({ title: t(`landing.crypto.stepTitles.${i - 1}`), body: t(`landing.crypto.steps.${i - 1}`) })), [t]);
  const [orderRef] = useState(() => newOrderReference());

  const mailtoBody = useMemo(
    () =>
      encodeURIComponent(
        `${t('landing.crypto.orderRef')}: ${orderRef}\n${t('landing.crypto.txLabel')}: ${tx || '—'}\n\nwAI Pro – ${locale === 'de' ? 'Zahlung melden' : 'payment report'}`,
      ),
    [orderRef, tx, t, locale],
  );

  return (
    <section className="section crypto" id="crypto">
      <div className="container">
        <div className="section-head section-head--center">
          <span className="eyebrow reveal">{t('landing.crypto.eyebrow')}</span>
          <h2 className="section-title reveal" data-reveal-delay="60">
            {t('landing.crypto.title')}
          </h2>
          <p className="section-lead reveal" data-reveal-delay="100">
            {t('landing.crypto.lead')}
          </p>
        </div>

        <ol className="crypto__steps reveal">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="crypto__step-num">{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="crypto__grid">
          {WALLET_LIST.map((wallet, index) => (
            <div key={wallet.asset} className="reveal" data-reveal-delay={index * 60}>
              <WalletCard wallet={wallet} />
            </div>
          ))}
        </div>

        <div className="crypto__proof reveal">
          <div className="crypto__proof-main">
            <h3>
              <SparkIcon size={17} /> {t('landing.crypto.submitProof')}
            </h3>
            <p>{t('landing.crypto.proofMailBody')}</p>
            <div className="crypto__proof-row">
              <label className="field crypto__field">
                <span>{t('landing.crypto.txLabel')}</span>
                <input
                  type="text"
                  value={tx}
                  onChange={(e) => setTx(e.target.value)}
                  placeholder={t('landing.crypto.txPlaceholder')}
                  spellCheck={false}
                />
              </label>
              <div className="crypto__proof-actions">
                <a
                  className="btn btn--primary"
                  href={`mailto:${PRODUCT.contactEmail}?subject=${encodeURIComponent('wAI Pro – ' + orderRef)}&body=${mailtoBody}`}
                >
                  <MailIcon size={16} /> {t('landing.crypto.openMail')}
                </a>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => copy(`${t('landing.crypto.orderRef')}: ${orderRef}\nTX: ${tx}`, 'proof')}
                >
                  {isCopied('proof') ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                  {isCopied('proof') ? t('common.ctaCopied') : t('common.ctaCopy')}
                </button>
              </div>
            </div>
            <p className="crypto__meta">
              {t('landing.crypto.orderRef')}: <code className="mono">{orderRef}</code>
            </p>
          </div>

          <LicenseActivator />
        </div>

        <div className="crypto__support reveal">
          <div>
            <h3>{t('landing.crypto.supportTitle')}</h3>
            <p>{t('landing.crypto.supportBody')}</p>
          </div>
          <div className="crypto__support-actions">
            <a className="btn btn--sol btn--sm" href={WALLET_LIST[0].uri}>
              <SolanaIcon size={15} /> {t('landing.crypto.supportCta')}
            </a>
            <Link className="btn btn--ghost btn--sm" to="/legal/crypto-guide">
              {t('landing.crypto.howToBuy')} <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>

        <div className="crypto__notes reveal">
          <p className="callout callout--warn">
            <InfoIcon size={15} /> {t('landing.crypto.disclaimer')}
          </p>
          <p className="callout">
            <LockIcon size={15} /> {t('landing.crypto.refundNote')}
          </p>
          <p className="crypto__legal">
            <Link to="/legal/terms">{t('nav.terms')}</Link>
            <span aria-hidden="true">·</span>
            <Link to="/legal/privacy">{t('nav.privacy')}</Link>
            <span aria-hidden="true">·</span>
            <Link to="/legal/disclaimer">{t('nav.disclaimer')}</Link>
            <span aria-hidden="true">·</span>
            <Link to="/legal/imprint">{t('nav.imprint')}</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
