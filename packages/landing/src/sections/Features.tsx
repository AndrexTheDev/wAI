import { useState } from 'react';
import { tArray } from '@wai/shared';
import { useLocale } from '../lib/locale';
import { ICON_MAP, CrownIcon, CheckIcon, type IconName } from '../components/Icons';
import './Features.css';

interface FeatureItem {
  id: string;
  title: string;
  body: string;
  pro: boolean;
}

type Filter = 'all' | 'free' | 'pro';

export function Features() {
  const { t, locale } = useLocale();
  const items = tArray<FeatureItem>(locale, 'landing.features.items');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = items.filter((item) =>
    filter === 'all' ? true : filter === 'pro' ? item.pro : !item.pro,
  );

  return (
    <section className="section features" id="features">
      <div className="container">
        <div className="features__head">
          <div className="section-head">
            <span className="eyebrow reveal">{t('landing.features.eyebrow')}</span>
            <h2 className="section-title reveal" data-reveal-delay="60">
              {t('landing.features.title')}
            </h2>
            <p className="section-lead reveal" data-reveal-delay="100">
              {t('landing.features.lead')}
            </p>
          </div>

          <div className="features__filter reveal" role="tablist" aria-label={t('landing.features.eyebrow')}>
            {(
              [
                ['all', t('common.all')],
                ['free', t('common.free')],
                ['pro', t('common.pro')],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={`features__filter-btn ${filter === key ? 'is-active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="features__grid">
          {visible.map((item, index) => {
            const Icon = ICON_MAP[(item.id as IconName) in ICON_MAP ? (item.id as IconName) : 'anchor'];
            return (
              <article
                key={item.id}
                className={`card card--hover features__card ${item.pro ? 'is-pro' : ''}`}
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="features__card-top">
                  <span className="card__icon">
                    <Icon size={21} />
                  </span>
                  {item.pro ? (
                    <span className="badge badge--pro">
                      <CrownIcon size={11} /> {t('landing.features.proBadge')}
                    </span>
                  ) : (
                    <span className="badge badge--free">
                      <CheckIcon size={11} /> {t('landing.features.freeBadge')}
                    </span>
                  )}
                </div>
                <h3 className="card__title">{item.title}</h3>
                <p className="card__body">{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
