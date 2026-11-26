import { PRICING, tArray } from '@wai/shared';
import { useLocale } from '../lib/locale';
import { useRouter } from '../lib/router';
import { CheckIcon, CrossIcon, CrownIcon, DownloadIcon, ShieldIcon, SparkIcon } from '../components/Icons';
import './Comparison.css';

interface Row {
  label: string;
  free: boolean | string;
  pro: boolean | string;
}

function Cell({ value }: { value: boolean | string }) {
  if (value === true)
    return (
      <span className="cmp__yes" aria-label="yes">
        <CheckIcon size={16} />
      </span>
    );
  if (value === false)
    return (
      <span className="cmp__no" aria-label="no">
        <CrossIcon size={15} />
      </span>
    );
  return <span className="cmp__val">{value}</span>;
}

export function Comparison() {
  const { t, locale } = useLocale();
  const { navigate } = useRouter();
  const rows = tArray<Row>(locale, 'landing.comparison.rows');
  /**
   * Die Plankarten waren als Ternäre im JSX verdrahtet – zwei Wahrheiten über
   * denselben Preis. Jetzt kommen sie aus denselben Wörterbüchern wie alles
   * andere, damit Free/Pro nirgends auseinanderlaufen kann.
   */
  const freeList = tArray<string>(locale, 'landing.comparison.freeIncludes');
  const proList = tArray<string>(locale, 'landing.comparison.proIncludes');

  return (
    <section className="section comparison" id="pricing">
      <div className="container">
        <div className="section-head section-head--center">
          <span className="eyebrow reveal">{t('landing.comparison.eyebrow')}</span>
          <h2 className="section-title reveal" data-reveal-delay="60">
            {t('landing.comparison.title')}
          </h2>
          <p className="section-lead reveal" data-reveal-delay="100">
            {t('landing.comparison.lead')}
          </p>
        </div>

        <div className="comparison__plans">
          <article className="plan plan--free reveal">
            <header>
              <span className="plan__name">{t('common.free')}</span>
              <p className="plan__price">
                0 €<small>/ {locale === 'de' ? 'für immer' : 'forever'}</small>
              </p>
              <p className="plan__tagline">
                {locale === 'de'
                  ? 'Vollwertiges Werkzeug – ohne Ablaufdatum, ohne Werbung.'
                  : 'A fully usable tool – no expiry, no ads.'}
              </p>
            </header>
            <ul className="plan__list">
              {freeList.map((item) => (
                <li key={item}><CheckIcon size={15} /> {item}</li>
              ))}
            </ul>
            <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('/#download')}>
              <DownloadIcon size={16} /> {locale === 'de' ? 'Kostenlos starten' : 'Start for free'}
            </button>
          </article>

          <article className="plan plan--pro reveal" data-reveal-delay="90">
            <span className="plan__ribbon">
              <SparkIcon size={13} /> {locale === 'de' ? 'Beliebteste Wahl' : 'Most popular'}
            </span>
            <header>
              <span className="plan__name">
                <CrownIcon size={17} /> {t('common.pro')}
              </span>
              <p className="plan__price">
                {PRICING.proPriceLabel[locale]}
                <small>{locale === 'de' ? 'Lebenslange Lizenz' : 'lifetime licence'}</small>
              </p>
              <p className="plan__tagline">{PRICING.proCompareLabel[locale]}</p>
            </header>
            <ul className="plan__list plan__list--pro">
              {proList.map((item) => (
                <li key={item}><CheckIcon size={15} /> {item}</li>
              ))}
            </ul>
            <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/#crypto')}>
              <CrownIcon size={16} /> {t('common.ctaPro')}
            </button>
            <p className="plan__note">
              <ShieldIcon size={13} /> {t('landing.comparison.priceNote')}
            </p>
          </article>
        </div>

        <div className="table-wrap comparison__table reveal">
          <table className="clean">
            <thead>
              <tr>
                <th scope="col">{t('landing.comparison.columns.feature')}</th>
                <th scope="col" className="is-centered">{t('landing.comparison.columns.free')}</th>
                <th scope="col" className="is-centered">{t('landing.comparison.columns.pro')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, background: 'transparent', color: 'var(--c-text)' }}>
                    {row.label}
                  </th>
                  <td className="is-centered"><Cell value={row.free} /></td>
                  <td className="is-centered"><Cell value={row.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="comparison__bulk reveal">{t('landing.comparison.bulkNote')}</p>
      </div>
    </section>
  );
}
