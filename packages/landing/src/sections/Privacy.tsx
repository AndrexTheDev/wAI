import { tArray } from '@wai/shared';
import { useLocale } from '../lib/locale';
import { Link } from '../lib/router';
import { LockIcon, OfflineIcon, ShieldIcon, ArrowRightIcon } from '../components/Icons';
import './Privacy.css';

interface PrivacyPoint {
  title: string;
  body: string;
}

export function Privacy() {
  const { t, locale } = useLocale();
  const points = tArray<PrivacyPoint>(locale, 'landing.privacy.points');

  return (
    <section className="section privacy" id="privacy">
      <div className="container privacy__inner">
        <div className="privacy__copy">
          <span className="eyebrow reveal">{t('landing.privacy.eyebrow')}</span>
          <h2 className="section-title reveal" data-reveal-delay="60">
            {t('landing.privacy.title')}
          </h2>
          <p className="section-lead reveal" data-reveal-delay="100">
            {t('landing.privacy.lead')}
          </p>

          <div className="privacy__badges reveal" data-reveal-delay="140">
            <span className="badge badge--live">
              <ShieldIcon size={13} /> {t('landing.privacy.badge')}
            </span>
            <span className="badge">
              <OfflineIcon size={13} /> {t('common.noInternetNeeded')}
            </span>
            <span className="badge">
              <LockIcon size={13} /> {t('common.privacyByDesign')}
            </span>
          </div>

          <Link className="btn btn--quiet privacy__link reveal" to="/legal/privacy" data-reveal-delay="180">
            {t('nav.privacy')} <ArrowRightIcon size={15} />
          </Link>
        </div>

        <div className="privacy__grid">
          {points.map((point, index) => (
            <article key={point.title} className="privacy__point reveal" data-reveal-delay={index * 70}>
              <span className="privacy__dot" aria-hidden="true" />
              <h3>{point.title}</h3>
              <p>{point.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
