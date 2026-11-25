import { useState } from 'react';
import { tArray } from '@wai/shared';
import { useApp } from '../store/AppStore';
import { useT } from '../i18n/useT';
import { getPermissions, requestMotionPermission } from '../platform/native';
import { Anchor, Camera, Compass, ChevronRight, Check, Shield } from '../ui/icons';

const SLIDE_ICONS = [Anchor, Camera, Compass];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { t, locale } = useT();
  const { updateSettings, setLocale, requestPermissions } = useApp();
  const [step, setStep] = useState(0);
  const [asking, setAsking] = useState(false);
  const slides = tArray<{ title: string; body: string }>(locale, 'app.onboarding.slides');

  const finish = async () => {
    updateSettings({ onboardingDone: true });
    onDone();
  };

  const grantPermissions = async () => {
    setAsking(true);
    await requestMotionPermission();
    await getPermissions();
    await requestPermissions();
    setAsking(false);
    void finish();
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: '1fr auto',
        height: '100dvh',
        maxWidth: 560,
        marginInline: 'auto',
        padding: 'calc(18px + env(safe-area-inset-top, 0px)) 20px calc(20px + env(safe-area-inset-bottom, 0px))',
        gap: 18,
      }}
    >
      <div style={{ display: 'grid', alignContent: 'center', gap: 18 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="topbar__mark">
            <Anchor size={17} />
          </span>
          <div>
            <div style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>{t('app.onboarding.welcome')}</div>
            <div className="muted">{t('app.onboarding.subtitle')}</div>
          </div>
          <div className="segmented" style={{ marginLeft: 'auto', width: 122 }}>
            <button type="button" className={locale === 'de' ? 'is-active' : ''} onClick={() => setLocale('de')}>
              DE
            </button>
            <button type="button" className={locale === 'en' ? 'is-active' : ''} onClick={() => setLocale('en')}>
              EN
            </button>
          </div>
        </div>

        {step < slides.length ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 64,
                height: 64,
                borderRadius: 20,
                background: 'var(--grad-soft)',
                border: '1px solid rgba(110,231,183,0.3)',
                color: 'var(--mint)',
              }}
            >
              {(() => {
                const Icon = SLIDE_ICONS[step] ?? Anchor;
                return <Icon size={30} />;
              })()}
            </span>
            <h1 style={{ fontSize: 26 }}>{slides[step].title}</h1>
            <p style={{ color: 'var(--text-2)', fontSize: 14.5, lineHeight: 1.6 }}>{slides[step].body}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 64,
                height: 64,
                borderRadius: 20,
                background: 'var(--grad-soft)',
                border: '1px solid rgba(110,231,183,0.3)',
                color: 'var(--mint)',
              }}
            >
              <Shield size={30} />
            </span>
            <h1 style={{ fontSize: 24 }}>{t('app.onboarding.permissionTitle')}</h1>
            <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>{t('app.onboarding.permissionBody')}</p>
            <div className="card" style={{ display: 'grid', gap: 6 }}>
              {[
                t('app.settings.gpsStatus'),
                t('app.settings.magStatus'),
                t('app.settings.accelStatus'),
                t('app.settings.gyroStatus'),
              ].map((label) => (
                <div key={label} className="row row--between">
                  <span className="muted">{label}</span>
                  <Check size={14} style={{ color: 'var(--mint)' }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
          {[...slides, { title: 'perm' }].map((_, index) => (
            <span
              key={index}
              style={{
                width: index === step ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: index === step ? 'var(--mint)' : 'var(--surface-2)',
                transition: 'width 200ms',
              }}
            />
          ))}
        </div>
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => {
            if (step < slides.length) setStep(step + 1);
            else void grantPermissions();
          }}
          disabled={asking}
        >
          {step < slides.length ? t('common.ctaNext') : asking ? t('common.loading') : t('app.onboarding.permissionAllow')}
          <ChevronRight size={15} />
        </button>
        <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
          {step < slides.length && (
            <button type="button" className="btn btn--xs" onClick={() => void finish()}>
              {t('app.onboarding.skip')}
            </button>
          )}
          {step === slides.length && (
            <button type="button" className="btn btn--xs" onClick={() => void finish()}>
              {t('app.onboarding.permissionLater')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
