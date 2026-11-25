import { tArray } from '@wai/shared';
import { useLocale } from '../lib/locale';
import { useRouter } from '../lib/router';
import { ArrowRightIcon, AnchorIcon, CameraIcon, CompassIcon } from '../components/Icons';
import './HowItWorks.css';

interface Step {
  step: string;
  title: string;
  body: string;
  detail: string;
}

const STEP_ICONS = [AnchorIcon, CameraIcon, CompassIcon];

export function HowItWorks() {
  const { t, locale } = useLocale();
  const { navigate } = useRouter();
  const steps = tArray<Step>(locale, 'landing.how.steps');

  return (
    <section className="section how" id="how">
      <div className="container">
        <div className="section-head section-head--center">
          <span className="eyebrow reveal">{t('landing.how.eyebrow')}</span>
          <h2 className="section-title reveal" data-reveal-delay="60">
            {t('landing.how.title')}
          </h2>
          <p className="section-lead reveal" data-reveal-delay="100">
            {t('landing.how.lead')}
          </p>
        </div>

        <ol className="how__steps">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[index] ?? AnchorIcon;
            return (
              <li key={step.step} className="how__step reveal" data-reveal-delay={index * 90}>
                <div className="how__num" aria-hidden="true">
                  {step.step}
                </div>
                <span className="how__icon" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <p className="how__detail">{step.detail}</p>
              </li>
            );
          })}
        </ol>

        <div className="how__cta reveal">
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/app/')}>
            {t('landing.how.cta')} <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
