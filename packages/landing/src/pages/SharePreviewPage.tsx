import { useEffect, useMemo, useState } from 'react';
import {
  PRODUCT,
  buildAppLink,
  buildIntentLink,
  decodeSharePayload,
  extractShareCode,
  sanitizeImportedAnchor,
  type AnchorCategory,
} from '@wai/shared';
import { useLocale } from '../lib/locale';
import { Link } from '../lib/router';
import { ArrowRightIcon, CheckIcon, DownloadIcon, InfoIcon } from '../components/Icons';
import './SharePreviewPage.css';

const SITE = import.meta.env.VITE_WEBSITE_URL ?? PRODUCT.website;

/** Coordinates as a polite, readable pair – the only location data we render. */
function formatCoords(lat: number, lng: number, locale: 'de' | 'en') {
  const nf = new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  });
  return `${nf.format(lat)}, ${nf.format(lng)}`;
}

const CATEGORY_ICON: Record<AnchorCategory, string> = {
  car: '🚗',
  tent: '⛺',
  meeting: '📍',
  tool: '🧰',
  entrance: '🚪',
  nature: '🌲',
  other: '📌',
};

/**
 * Public preview of a shared anchor (`/a/#WAIX1.…`).
 *
 * The code lives in the fragment, so it never reaches the hosting server —
 * neither GitHub Pages nor any proxy sees where the anchor is. Everything on
 * this page is decoded locally in the browser; nothing is stored or sent.
 *
 * Without the app installed the page still answers the two questions that
 * matter: which anchor is it, and where is it. With the app installed the
 * intent link hands the code straight over, no typing needed.
 */
/**
 * Reads the code from the address bar. Deliberately a hook of its own so the
 * rendering half stays a pure component that can be tested without a browser
 * (see test/renderSmoke.tsx).
 */
export function useShareCodeFromUrl(): string | null {
  const [code, setCode] = useState<string | null>(null);

  // The fragment is readable before hydration and can change without a reload.
  useEffect(() => {
    const read = () => {
      const { hash, search } = window.location;
      setCode(extractShareCode(`${hash}${search}`) ?? extractShareCode(hash) ?? extractShareCode(search));
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  return code;
}

export function SharePreviewPage() {
  const code = useShareCodeFromUrl();
  return <SharePreview code={code} />;
}

/** Pure renderer: everything except the URL plumbing. */
export function SharePreview({ code }: { code: string | null }) {
  const { t, locale } = useLocale();
  const [copied, setCopied] = useState(false);
  const [showRough, setShowRough] = useState(false);

  const anchor = useMemo(() => {
    if (!code) return null;
    const payload = decodeSharePayload(code);
    return payload ? sanitizeImportedAnchor(payload.a) : null;
  }, [code]);

  useEffect(() => {
    document.title = `${t('landing.sharePreview.title')} · wAI`;
    // A shared anchor is private by nature: keep it out of search engines.
    const robots = document.querySelector('meta[name="robots"]');
    robots?.setAttribute('content', 'noindex, nofollow');
    return () => robots?.setAttribute('content', 'index, follow');
  }, [t, locale, anchor]);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  if (!code) {
    return (
      <main className="share">
        <div className="container share__inner">
          <p className="callout callout--warn">
            <InfoIcon size={15} />
            <span>{t('landing.sharePreview.noCode')}</span>
          </p>
          <p>{t('landing.sharePreview.noCodeBody')}</p>
          <Link className="btn btn--primary" to="/">
            {t('landing.sharePreview.toLanding')} <ArrowRightIcon size={15} />
          </Link>
        </div>
      </main>
    );
  }

  if (!anchor) {
    return (
      <main className="share">
        <div className="container share__inner">
          <h1>{t('landing.sharePreview.title')}</h1>
          <p className="callout callout--warn">
            <InfoIcon size={15} />
            <span>{t('landing.sharePreview.invalid')}</span>
          </p>
          <p className="muted">{t('landing.sharePreview.invalidBody')}</p>
          <Link className="btn btn--ghost" to="/">
            {t('landing.sharePreview.toLanding')}
          </Link>
        </div>
      </main>
    );
  }

  const name = anchor.n?.trim() || t('landing.sharePreview.untitled');
  const category = t(`app.anchor.categories.${anchor.cat ?? 'other'}`);
  const intent = buildIntentLink(code, SITE);
  const appLink = buildAppLink(code);

  return (
    <main className="share">
      <div className="container share__inner">
        <p className="share__eyebrow">
          <span aria-hidden="true">{CATEGORY_ICON[anchor.cat ?? 'other']}</span> {t('landing.sharePreview.eyebrow')}
        </p>
        <h1 className="share__title">{name}</h1>
        <p className="share__meta">
          <span className="badge">{category}</span>
          {typeof anchor.alt === 'number' && <span className="badge">⛰ {Math.round(anchor.alt)} m</span>}
          {anchor.zone && <span className="badge">{anchor.zone}</span>}
        </p>

        {anchor.note && (
          <blockquote className="share__note">
            <span className="share__note-label">{t('landing.sharePreview.note')}</span>
            {anchor.note}
          </blockquote>
        )}

        <section className="share__card" aria-labelledby="share-coords">
          <h2 id="share-coords" className="share__card-title">
            {t('landing.sharePreview.location')}
          </h2>
          <p className="share__coords mono">{showRough ? t('landing.sharePreview.hidden') : formatCoords(anchor.lat, anchor.lng, locale)}</p>
          <div className="share__row">
            <a
              className="btn btn--primary"
              href={intent}
              // The intent URI is Android-only; on desktop it is a no-op link.
              onClick={(event) => {
                if (!/android/i.test(navigator.userAgent)) event.preventDefault();
              }}
            >
              <DownloadIcon size={15} /> {t('landing.sharePreview.openApp')}
            </a>
            <button type="button" className="btn btn--ghost" onClick={() => setShowRough((value) => !value)}>
              {showRough ? t('landing.sharePreview.showCoords') : t('landing.sharePreview.hideCoords')}
            </button>
          </div>
          <p className="muted share__hint">{t('landing.sharePreview.openAppHint')}</p>
          <p className="muted share__hint">
            {t('landing.sharePreview.noApp')}{' '}
            <Link to="/#download">{t('landing.sharePreview.getApp')}</Link>
          </p>
        </section>

        <details className="share__raw">
          <summary>{t('landing.sharePreview.rawTitle')}</summary>
          <code className="mono">{code}</code>
          <div className="share__row">
            <button type="button" className="btn btn--sm" onClick={() => void copy()}>
              {copied ? <CheckIcon size={13} /> : null} {copied ? t('landing.sharePreview.copied') : t('landing.sharePreview.copyCode')}
            </button>
            <a className="btn btn--sm btn--quiet" href={appLink}>
              {t('landing.sharePreview.deepLink')}
            </a>
          </div>
        </details>

        <p className="share__privacy">{t('landing.sharePreview.privacy')}</p>
      </div>
    </main>
  );
}
