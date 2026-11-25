import { tArray } from '@wai/shared';
import { useLocale } from '../lib/locale';
import { useRouter } from '../lib/router';
import { PhoneDemo } from '../components/PhoneDemo';
import { ArrowRightIcon, CheckIcon, DownloadIcon, PlayIcon, ShieldIcon } from '../components/Icons';
import './Hero.css';

export function Hero() {
  const { t, locale, dict } = useLocale();
  const { navigate } = useRouter();
  const bullets = tArray<string>(locale, 'landing.hero.bullets');

  return (
    <section className="hero" id="top">
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__grid" />
        <div className="hero__glow hero__glow--mint" />
        <div className="hero__glow hero__glow--sky" />
        <div className="hero__glow hero__glow--violet" />
        <svg className="hero__rings" viewBox="0 0 600 600" fill="none" aria-hidden="true">
          <circle cx="300" cy="300" r="120" />
          <circle cx="300" cy="300" r="210" />
          <circle cx="300" cy="300" r="300" />
        </svg>
      </div>

      <div className="container hero__inner">
        <div className="hero__copy">
          <span className="eyebrow reveal">{t('landing.hero.eyebrow')}</span>
          <h1 className="hero__title reveal" data-reveal-delay="60">
            {t('landing.hero.title')}
            <span className="hero__title-accent gradient-text">{t('landing.hero.titleAccent')}</span>
          </h1>
          <p className="hero__lead reveal" data-reveal-delay="120">
            {t('landing.hero.lead')}
          </p>

          <ul className="hero__bullets reveal" data-reveal-delay="180">
            {bullets.map((bullet) => (
              <li key={bullet}>
                <CheckIcon size={15} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <div className="hero__actions reveal" data-reveal-delay="240">
            <button type="button" className="btn btn--primary btn--lg" onClick={() => navigate('/#download')}>
              <DownloadIcon size={18} />
              {t('common.ctaPrimary')}
            </button>
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => navigate('/#how')}>
              <PlayIcon size={16} />
              {t('common.ctaSecondary')}
            </button>
          </div>

          <div className="hero__trust reveal" data-reveal-delay="300">
            <ShieldIcon size={15} />
            <span>{t('landing.hero.trust')}</span>
            <span className="hero__trust-sep" aria-hidden="true">
              ·
            </span>
            <span className="hero__install">{t('landing.hero.installHint')}</span>
          </div>

          <dl className="hero__stats reveal" data-reveal-delay="360">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <dt>{t(`landing.hero.stat${i}`)}</dt>
                <dd>{t(`landing.hero.stat${i}Value`)}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hero__device reveal" data-reveal-delay="200">
          <PhoneDemo />
        </div>
      </div>

      <div className="hero__marquee" aria-hidden="true">
        <div className="hero__marquee-track">
          {[0, 1].map((copy) => (
            <span key={copy}>
              {dict.landing.useCases.cases.map((c) => (
                <span key={c.id} className="hero__marquee-item">
                  {c.title}
                  <span className="hero__marquee-dot">◆</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
