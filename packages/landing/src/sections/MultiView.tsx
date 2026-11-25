import { useState } from 'react';
import { tArray } from '@wai/shared';
import { useLocale } from '../lib/locale';
import { CameraIcon, CompassIcon, ElevationIcon, TrailIcon, LayersIcon } from '../components/Icons';
import './MultiView.css';

const VIEW_ICONS = [CompassIcon, TrailIcon, ElevationIcon, CameraIcon];
const VIEW_BODIES: Record<string, { de: string; en: string }> = {
  compass: {
    de: 'Ein Pfeil, der sich mit deiner Blickrichtung dreht, plus Entfernung in Metern – der schnellste Weg zurück.',
    en: 'An arrow that turns with your heading, plus distance in metres – the fastest route back.',
  },
  trail: {
    de: 'Dein Weg ab dem Anker als Linie: Zäune, Abzweigungen und Sackgassen werden sichtbar, statt neu erraten zu werden.',
    en: 'Your path from the anchor as a line: fences, junctions and dead ends become visible instead of guessed.',
  },
  elevation: {
    de: 'Höhenmeter und Etagen im Klartext: „Ebene 3, 8 m höher“ statt drei Runden durchs Parkhaus.',
    en: 'Altitude and floors in plain words: “level 3, 8 m up” instead of three laps through the car park.',
  },
  media: {
    de: 'Foto und Sprachnotiz erscheinen genau dann, wenn du die letzten Meter gehst – als Abgleich mit der Wirklichkeit.',
    en: 'Photo and voice note appear exactly when you walk the last metres – as a match against reality.',
  },
};

export function MultiView() {
  const { t, locale } = useLocale();
  const views = tArray<string>(locale, 'landing.multiview.views');
  const [active, setActive] = useState(0);

  return (
    <section className="section multiview" id="multi-view">
      <div className="container multiview__inner">
        <div className="multiview__visual reveal">
          <div className="multiview__stack">
            {views.map((view, index) => {
              const Icon = VIEW_ICONS[index] ?? CompassIcon;
              return (
                <button
                  key={view}
                  type="button"
                  className={`multiview__pane pane-${index} ${active === index ? 'is-active' : ''}`}
                  onClick={() => setActive(index)}
                  aria-pressed={active === index}
                >
                  <span className="multiview__pane-head">
                    <Icon size={16} />
                    {view}
                  </span>
                  <span className="multiview__pane-art" aria-hidden="true">
                    {index === 0 && (
                      <svg viewBox="0 0 120 80" fill="none">
                        <circle cx="60" cy="40" r="30" stroke="rgba(110,231,183,0.5)" strokeDasharray="3 4" />
                        <path d="M60 40 L60 12" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M54 18 L60 11 L66 18" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
                        <circle cx="60" cy="40" r="3.4" fill="#38bdf8" />
                      </svg>
                    )}
                    {index === 1 && (
                      <svg viewBox="0 0 120 80" fill="none">
                        <path d="M14 62 C34 62 36 34 58 34 S86 54 106 24" stroke="#a78bfa" strokeWidth="2.4" strokeDasharray="5 4" />
                        <circle cx="14" cy="62" r="3" fill="#6ee7b7" />
                        <circle cx="106" cy="24" r="3" fill="#38bdf8" />
                      </svg>
                    )}
                    {index === 2 && (
                      <svg viewBox="0 0 120 80" fill="none">
                        {[0, 1, 2, 3].map((i) => (
                          <rect key={i} x={20 + i * 4} y={62 - i * 13} width={80 - i * 8} height="9" rx="2" fill={`rgba(110,231,183,${0.15 + i * 0.14})`} />
                        ))}
                        <path d="M60 22 L60 8" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                    {index === 3 && (
                      <svg viewBox="0 0 120 80" fill="none">
                        <rect x="34" y="18" width="52" height="44" rx="6" stroke="rgba(255,255,255,0.35)" />
                        <circle cx="60" cy="40" r="11" stroke="#38bdf8" />
                        <path d="M60 8v8M60 64v8M18 40h8M94 40h8" stroke="rgba(255,255,255,0.3)" strokeLinecap="round" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="multiview__copy">
          <span className="eyebrow reveal">{t('landing.multiview.eyebrow')}</span>
          <h2 className="section-title reveal" data-reveal-delay="60">
            {t('landing.multiview.title')}
          </h2>
          <p className="section-lead reveal" data-reveal-delay="100">
            {t('landing.multiview.lead')}
          </p>

          <div className="multiview__tabs reveal" data-reveal-delay="140" role="tablist">
            {views.map((view, index) => {
              const Icon = VIEW_ICONS[index] ?? CompassIcon;
              return (
                <button
                  key={view}
                  type="button"
                  role="tab"
                  aria-selected={active === index}
                  className={active === index ? 'is-active' : ''}
                  onClick={() => setActive(index)}
                >
                  <Icon size={15} />
                  {view}
                </button>
              );
            })}
          </div>

          <p className="multiview__body reveal" data-reveal-delay="180">
            {VIEW_BODIES[['compass', 'trail', 'elevation', 'media'][active]]?.[locale]}
          </p>

          <p className="multiview__note reveal" data-reveal-delay="220">
            <LayersIcon size={15} />
            {t('landing.multiview.note')}
          </p>
        </div>
      </div>
    </section>
  );
}
