import { useLocale } from '../lib/locale';
import { useRouter } from '../lib/router';
import { AnchorIcon, ArrowRightIcon } from '../components/Icons';

export function NotFoundPage() {
  const { t } = useLocale();
  const { navigate } = useRouter();
  return (
    <section className="section" style={{ textAlign: 'center' }}>
      <div className="container-narrow" style={{ display: 'grid', gap: '1rem', justifyItems: 'center' }}>
        <span style={{ color: 'var(--c-mint)' }}>
          <AnchorIcon size={44} />
        </span>
        <h1 className="section-title" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)' }}>
          {t('landing.notFound.title')}
        </h1>
        <p className="section-lead" style={{ textAlign: 'center' }}>
          {t('landing.notFound.body')}
        </p>
        <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
          {t('landing.notFound.cta')} <ArrowRightIcon size={16} />
        </button>
      </div>
    </section>
  );
}
