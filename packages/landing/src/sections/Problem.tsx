import { tArray } from '@wai/shared';
import { useLocale } from '../lib/locale';
import './Problem.css';

interface ProblemCard {
  title: string;
  body: string;
}

export function Problem() {
  const { t, locale } = useLocale();
  const cards = tArray<ProblemCard>(locale, 'landing.problem.cards');

  return (
    <section className="section problem" id="problem">
      <div className="container">
        <div className="problem__layout">
          <div className="section-head">
            <span className="eyebrow reveal">{t('landing.problem.eyebrow')}</span>
            <h2 className="section-title reveal" data-reveal-delay="60">
              {t('landing.problem.title')}
            </h2>
            <p className="section-lead reveal" data-reveal-delay="100">
              {t('landing.problem.lead')}
            </p>
            <blockquote className="problem__quote reveal" data-reveal-delay="160">
              <span aria-hidden="true">“</span>
              {t('landing.problem.quote')}
            </blockquote>
          </div>

          <div className="problem__grid">
            {cards.map((card, index) => (
              <article
                key={card.title}
                className="card card--hover problem__card reveal"
                data-reveal-delay={index * 70}
              >
                <span className="problem__index" aria-hidden="true">
                  0{index + 1}
                </span>
                <h3 className="card__title">{card.title}</h3>
                <p className="card__body">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
