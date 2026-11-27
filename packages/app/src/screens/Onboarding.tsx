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
  /** Gesetzt, wenn nach dem Antrag kein einziges Recht erteilt wurde. */
  const [denied, setDenied] = useState<Record<'location' | 'camera' | 'microphone', string> | null>(null);
  const slides = tArray<{ title: string; body: string }>(locale, 'app.onboarding.slides');

  const finish = async () => {
    updateSettings({ onboardingDone: true });
    onDone();
  };

  /**
   * Berechtigungen anfragen – und danach ehrlich berichten.
   *
   * Vorher fragte diese Funktion dreimal hintereinander, schloss die Einführung
   * in jedem Fall und zeigte danach dieselbe App wie vorher. Auf einem Gerät, auf
   * dem der Nutzer „Ablehnen" tippte, war das Ergebnis nicht unterscheidbar von
   * „Erlauben". Jetzt bleibt der Bildschirm stehen, wenn nichts erteilt wurde,
   * und sagt welches Recht fehlt und was ohne es trotzdem geht.
   */
  const grantPermissions = async () => {
    setAsking(true);
    await requestMotionPermission();
    await requestPermissions();
    const state = await getPermissions();
    setAsking(false);
    const granted = (['location', 'camera', 'microphone'] as const).filter(
      (key) => state[key] === 'granted',
    );
    if (granted.length === 0) {
      setDenied({ location: state.location, camera: state.camera, microphone: state.microphone });
      return;
    }
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
            {/**
              * Vorher standen hier vier Häkchen, bevor irgendetwas gefragt wurde –
              * ein Versprechen, kein Zustand. Solange nichts erteilt ist, sagt die
              * Liste, was die Sensoren *können* (nicht: was schon erlaubt ist), und
              * nach einer Ablehnung steht der echte Zustand da.
              */}
            <div className="card" style={{ display: 'grid', gap: 6 }}>
              {[
                t('app.settings.gpsStatus'),
                t('app.settings.magStatus'),
                t('app.settings.accelStatus'),
                t('app.settings.gyroStatus'),
              ].map((label) => (
                <div key={label} className="row row--between">
                  <span className="muted">{label}</span>
                  {denied ? (
                    <span className="muted" style={{ fontSize: 11 }}>
                      {label === t('app.settings.gpsStatus')
                        ? denied.location === 'denied'
                          ? t('app.onboarding.stateDenied')
                          : denied.location === 'granted'
                            ? t('app.onboarding.stateGranted')
                            : t('app.onboarding.stateNotAsked')
                        : t('app.onboarding.stateNotAsked')}
                    </span>
                  ) : (
                    <Check size={14} style={{ color: 'var(--mint)' }} />
                  )}
                </div>
              ))}
            </div>
            {denied && <p className="muted">{t('app.onboarding.permissionDenied')}</p>}
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
              {denied ? t('app.onboarding.permissionContinue') : t('app.onboarding.permissionLater')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
