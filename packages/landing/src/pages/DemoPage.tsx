import { useEffect, useState } from 'react';
import { useLocale } from '../lib/locale';
import { useRouter } from '../lib/router';
import { ArrowRightIcon, GlobeIcon, InfoIcon } from '../components/Icons';
import './DemoPage.css';

/**
 * Hosts the actual wAI app build (identical code base as the Android APK) inside
 * the marketing site. The build script copies packages/app/dist to /app, so the
 * demo is served from the same origin and works completely offline.
 */
export function DemoPage() {
  const { t, locale, setLocale } = useLocale();
  const { navigate } = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);

  const src = `${import.meta.env.VITE_WEBAPP_URL ?? './app/'}?embed=1&lang=${locale}`;

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  // Allow the embedded app to switch the site language or navigate back.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; locale?: string } | null;
      if (data?.type === 'wai:locale' && (data.locale === 'de' || data.locale === 'en')) {
        setLocale(data.locale);
      }
      if (data?.type === 'wai:exit') navigate('/');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [setLocale, navigate]);

  return (
    <div className="demo-page">
      <header className="demo-page__bar">
        <button type="button" className="btn btn--quiet btn--sm" onClick={() => navigate('/')}>
          ← wAI
        </button>
        <span className="demo-page__title">
          {t('common.demo')} · {t('landing.hero.installHint')}
        </span>
        <div className="demo-page__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}
          >
            <GlobeIcon size={14} /> {locale === 'de' ? 'EN' : 'DE'}
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/#download')}>
            {t('common.ctaPrimary')} <ArrowRightIcon size={14} />
          </button>
        </div>
      </header>

      <div className="demo-page__note">
        <InfoIcon size={14} /> {t('app.demo.body')}
      </div>

      <div className="demo-page__frame-wrap">
        {!loaded && (
          <div className="demo-page__loading">
            {slow
              ? locale === 'de'
                ? 'Die App wird geladen … falls nichts erscheint, starte die App lokal mit „npm run dev:app“.'
                : 'Loading the app … if nothing appears, run it locally with “npm run dev:app”.'
              : t('common.loading')}
          </div>
        )}
        <iframe
          className="demo-page__frame"
          src={src}
          title={t('common.demo')}
          onLoad={() => setLoaded(true)}
          allow="geolocation; camera; microphone"
        />
      </div>
    </div>
  );
}
