import { LEGAL_NAV, PRODUCT } from '@wai/shared';
import { useLocale } from '../lib/locale';
import { Link } from '../lib/router';
import { AnchorIcon, MailIcon, OfflineIcon, ShieldIcon, GlobeIcon, ArrowUpIcon } from './Icons';
import './Footer.css';

export function Footer() {
  const { t, locale, dict } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <div className="brand">
              <span className="brand__mark" aria-hidden="true">
                <AnchorIcon size={19} />
              </span>
              <span className="brand__text">
                <span className="brand__name">wAI</span>
                <span className="brand__sub">{dict.meta.productSub}</span>
              </span>
            </div>
            <p className="site-footer__tagline">{t('landing.footer.tagline')}</p>
            <div className="pill-row site-footer__badges">
              <span className="badge">
                <OfflineIcon size={13} /> {t('common.offlineReady')}
              </span>
              <span className="badge">
                <ShieldIcon size={13} /> {t('common.privacyByDesign')}
              </span>
              <span className="badge">
                <GlobeIcon size={13} /> DE / EN
              </span>
            </div>
          </div>

          <nav className="site-footer__col" aria-label={t('landing.footer.product')}>
            <h2 className="site-footer__heading">{t('landing.footer.product')}</h2>
            <Link to="/#features">{t('nav.features')}</Link>
            <Link to="/#how">{t('nav.howItWorks')}</Link>
            <Link to="/#use-cases">{t('nav.useCases')}</Link>
            <Link to="/#pricing">{t('nav.pricing')}</Link>
            <Link to="/#download">{t('nav.download')}</Link>
            <Link to="/#faq">{t('nav.faq')}</Link>
          </nav>

          <nav className="site-footer__col" aria-label={t('landing.footer.legalHeading')}>
            <h2 className="site-footer__heading">{t('landing.footer.legalHeading')}</h2>
            {LEGAL_NAV.map((doc) => (
              <Link key={doc.slug} to={doc.path}>
                {locale === 'de' ? doc.de : doc.en}
              </Link>
            ))}
            <Link to="/#crypto">{t('landing.crypto.supportCta')}</Link>
          </nav>

          <div className="site-footer__col">
            <h2 className="site-footer__heading">{t('landing.footer.supportHeading')}</h2>
            <p className="site-footer__meta">
              <span>{t('landing.footer.developer')}</span>
              <strong>{PRODUCT.legalBrand}</strong>
            </p>
            <a className="site-footer__mail" href={`mailto:${PRODUCT.contactEmail}`}>
              <MailIcon size={15} />
              {PRODUCT.contactEmail}
            </a>
            <p className="site-footer__meta">
              <span>{t('nav.download')}</span>
              <strong>Android 8.0+ · APK</strong>
            </p>
            <button
              type="button"
              className="btn btn--ghost btn--sm site-footer__top-btn"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <ArrowUpIcon size={14} /> {t('landing.footer.backToTop')}
            </button>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p>{t('landing.footer.copyright', { year })}</p>
          <p className="site-footer__note">{t('landing.footer.noCookies')}</p>
          <p className="site-footer__note">{t('landing.footer.madeWith')}</p>
        </div>
      </div>
    </footer>
  );
}
