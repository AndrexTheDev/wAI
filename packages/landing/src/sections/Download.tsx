import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { PRODUCT } from '@wai/shared';
import { useLocale } from '../lib/locale';
import { useClipboard } from '../lib/useClipboard';
import { useRouter } from '../lib/router';
import {
  AndroidIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  InfoIcon,
  PhoneIcon,
  ShieldIcon,
  ArrowRightIcon,
} from '../components/Icons';
import './Download.css';

const APK_URL = import.meta.env.VITE_APK_URL ?? '';
const APK_SHA = import.meta.env.VITE_APK_SHA256 ?? '';
const WEBAPP_URL = import.meta.env.VITE_WEBAPP_URL ?? '/app/';
const VERSION = import.meta.env.VITE_APP_VERSION ?? PRODUCT.version;

export function Download() {
  const { t, locale } = useLocale();
  const { copy, isCopied } = useClipboard();
  const { navigate } = useRouter();
  const [qr, setQr] = useState<string | null>(null);

  const target = `${window.location.origin}${window.location.pathname.replace(/index\.html$/, '')}`;

  useEffect(() => {
    QRCode.toDataURL(target, { width: 260, margin: 1, color: { dark: '#07101c', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [target]);

  const steps = [0, 1, 2].map((i) => ({
    title: t(`landing.download.steps.${i}.title`),
    body: t(`landing.download.steps.${i}.body`),
  }));

  return (
    <section className="section download" id="download">
      <div className="container">
        <div className="download__panel">
          <div className="download__main">
            <span className="eyebrow reveal">{t('landing.download.eyebrow')}</span>
            <h2 className="section-title reveal" data-reveal-delay="60">
              {t('landing.download.title')}
            </h2>
            <p className="section-lead reveal" data-reveal-delay="100">
              {t('landing.download.lead')}
            </p>

            <ol className="download__steps reveal" data-reveal-delay="140">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className="download__step-num">{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="download__actions reveal" data-reveal-delay="180">
              {APK_URL ? (
                <a className="btn btn--primary btn--lg" href={APK_URL} download>
                  <DownloadIcon size={18} /> {t('landing.download.apkButton')} ({VERSION})
                </a>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary btn--lg"
                  onClick={() => navigate('/#crypto')}
                  title={t('landing.download.apkSoon')}
                >
                  <PhoneIcon size={18} /> {t('common.ctaPrimary')}
                </button>
              )}
              <button type="button" className="btn btn--ghost btn--lg" onClick={() => navigate('/app/')}>
                <AndroidIcon size={18} /> {t('landing.download.openWebApp')}
              </button>
            </div>

            <p className="download__apk-note reveal">
              <InfoIcon size={13} /> {t('landing.download.apkSoon')}
            </p>

            {APK_SHA && (
              <div className="download__sha reveal">
                <span>{t('landing.download.checksumLabel')}</span>
                <code className="mono">{APK_SHA}</code>
                <button type="button" className="btn btn--quiet btn--sm" onClick={() => copy(APK_SHA, 'sha')}>
                  {isCopied('sha') ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                </button>
              </div>
            )}

            <div className="download__cols reveal" data-reveal-delay="220">
              <div>
                <h3>{t('landing.download.requirementsTitle')}</h3>
                <ul>
                  {[0, 1, 2, 3].map((i) => (
                    <li key={i}>
                      <CheckIcon size={13} /> {t(`landing.download.requirements.${i}`)}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>{t('landing.download.alternativesTitle')}</h3>
                <ul>
                  {[0, 1, 2].map((i) => (
                    <li key={i}>
                      <ArrowRightIcon size={13} /> {t(`landing.download.alternatives.${i}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <aside className="download__aside reveal" data-reveal-delay="120">
            <h3>
              <ShieldIcon size={16} /> {t('landing.download.sidebarTitle')}
            </h3>
            <p>{t('landing.download.sidebarBody')}</p>
            {qr && (
              <div className="qr-frame download__qr">
                <img src={qr} alt={t('landing.download.sidebarTitle')} width={168} height={168} />
              </div>
            )}
            <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/app/')}>
              {t('landing.download.openWebApp')}
            </button>
            <a className="btn btn--ghost btn--block" href={`mailto:${PRODUCT.contactEmail}`}>
              {t('nav.contact')}
            </a>
            <p className="download__aside-note">
              <AndroidIcon size={13} /> Android 8.0+ · {locale === 'de' ? 'signierte APK' : 'signed APK'}
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
