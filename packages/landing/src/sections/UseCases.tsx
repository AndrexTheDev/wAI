import { useState } from 'react';
import { tArray } from '@wai/shared';
import { useLocale } from '../lib/locale';
import { CarIcon, TentIcon, PinIcon, ToolIcon, TreeIcon, DoorIcon, CheckIcon } from '../components/Icons';
import './UseCases.css';

interface UseCase {
  id: string;
  tag: string;
  title: string;
  body: string;
  bullets: string[];
}

const CASE_ICONS: Record<string, typeof PinIcon> = {
  parking: CarIcon,
  city: PinIcon,
  outdoor: TreeIcon,
  festival: TentIcon,
  everyday: ToolIcon,
  emergency: DoorIcon,
};

export function UseCases() {
  const { t, locale } = useLocale();
  const cases = tArray<UseCase>(locale, 'landing.useCases.cases');
  const [active, setActive] = useState(0);
  const current = cases[active] ?? cases[0];
  const Icon = CASE_ICONS[current?.id ?? 'city'] ?? PinIcon;

  return (
    <section className="section use-cases" id="use-cases">
      <div className="container">
        <div className="section-head section-head--center">
          <span className="eyebrow reveal">{t('landing.useCases.eyebrow')}</span>
          <h2 className="section-title reveal" data-reveal-delay="60">
            {t('landing.useCases.title')}
          </h2>
        </div>

        <div className="use-cases__tabs reveal" role="tablist">
          {cases.map((item, index) => {
            const TabIcon = CASE_ICONS[item.id] ?? PinIcon;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active === index}
                className={active === index ? 'is-active' : ''}
                onClick={() => setActive(index)}
              >
                <TabIcon size={16} />
                <span>{item.tag}</span>
              </button>
            );
          })}
        </div>

        <div className="use-cases__panel reveal" data-reveal-delay="60">
          <div className="use-cases__panel-copy">
            <span className="use-cases__tag">{current.tag}</span>
            <h3>
              <Icon size={22} /> {current.title}
            </h3>
            <p>{current.body}</p>
            <ul>
              {current.bullets.map((bullet) => (
                <li key={bullet}>
                  <CheckIcon size={14} />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>

          <div className={`use-cases__art art-${current.id}`} aria-hidden="true">
            <div className="use-cases__art-grid" />
            <span className="use-cases__pin">
              <Icon size={26} />
            </span>
            <span className="use-cases__ring r1" />
            <span className="use-cases__ring r2" />
            <span className="use-cases__ring r3" />
            <div className="use-cases__chips">
              {current.bullets.map((bullet) => (
                <span key={bullet}>{bullet}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="use-cases__grid">
          {cases.map((item, index) => {
            const CardIcon = CASE_ICONS[item.id] ?? PinIcon;
            return (
              <button
                key={item.id}
                type="button"
                className={`use-cases__mini ${active === index ? 'is-active' : ''}`}
                onClick={() => setActive(index)}
              >
                <CardIcon size={16} />
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
