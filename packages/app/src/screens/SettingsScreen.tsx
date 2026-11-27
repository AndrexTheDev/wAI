import { useState } from 'react';
import {
  LEGAL_NAV,
  PRODUCT,
  WALLET_LIST,
  formatBytes,
  type AppSettings,
  type LegalSlug,
} from '@wai/shared';
import { useApp } from '../store/AppStore';
import { useT } from '../i18n/useT';
import { useToast } from '../ui/Toast';
import {
  sensorAvailability,
  saveExportFile,
  setTorch,
  getPermissions,
  isDemo,
} from '../platform/native';
import { openExternal } from '../platform/links';
import { LegalSheet } from './LegalSheet';
import { ConfirmDialog } from '../ui/Confirm';
import {
  Check,
  Copy,
  Crown,
  Download,
  Globe,
  Info,
  Mail,
  Moon,
  Shield,
  Sun,
  Torch,
  WALLET_ICONS,
  ChevronRight,
  Compass,
} from '../ui/icons';

const SITE = import.meta.env.VITE_WEBSITE_URL ?? PRODUCT.website;

export function SettingsScreen({ onOpenPro }: { onOpenPro: (reason: string) => void }) {
  // Legal documents render inside the app from the bundled texts, so they are
  // readable offline. The website link stays available as a secondary option.
  const [legalSlug, setLegalSlug] = useState<LegalSlug | null>(null);
  const { t, locale } = useT();
  const {
    settings,
    updateSettings,
    plan,
    license,
    exportData,
    clearAllData,
    storageBytes,
    importAnchors,
    anchors,
    setLocale,
  } = useApp();
  const toast = useToast();
  const [showSensors, setShowSensors] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const sensors = sensorAvailability();

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    updateSettings({ [key]: value } as Partial<AppSettings>);

  const doExport = async () => {
    const filename = `wai-export-${new Date().toISOString().slice(0, 10)}.json`;
    const path = await saveExportFile(filename, exportData());
    toast.show(path ? t('app.share.fileSaved', { path }) : t('app.errors.generic'), path ? 'ok' : 'err');
  };

  const doImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as { anchors?: unknown[] };
        if (!Array.isArray(parsed.anchors)) throw new Error('invalid');
        importAnchors(parsed.anchors as never[]);
        toast.show(t('app.share.imported'), 'ok');
      } catch {
        toast.show(t('app.share.invalid'), 'err');
      }
    };
    input.click();
  };

  return (
    <>
      <div className="topbar" style={{ paddingTop: 8 }}>
        <div className="topbar__titles">
          <span className="topbar__name">{t('app.settings.title')}</span>
          <span className="topbar__sub">
            wAI {PRODUCT.version} · {plan === 'pro' ? t('app.settings.licenseStatusPro') : t('app.settings.licenseStatusFree')}
          </span>
        </div>
        <button
          type="button"
          className={`icon-btn ${torchOn ? 'is-active' : ''}`}
          onClick={async () => {
            const ok = await setTorch(!torchOn);
            if (!ok) toast.show(t('app.errors.generic'), 'warn');
            setTorchOn(ok ? !torchOn : false);
          }}
          aria-label={t('app.features.night')}
          title={t('common.ctaPrimary')}
        >
          <Torch size={18} />
        </button>
      </div>

      {/* Language */}
      <div className="card">
        <div className="card__head">
          <span className="card__title">
            <Globe size={14} /> {t('app.settings.language')}
          </span>
        </div>
        <div className="segmented">
          <button type="button" className={settings.locale === 'auto' ? 'is-active' : ''} onClick={() => set('locale', 'auto')}>
            {t('app.settings.languageAuto')}
          </button>
          <button
            type="button"
            className={settings.locale === 'de' ? 'is-active' : ''}
            onClick={() => {
              set('locale', 'de');
              setLocale('de');
            }}
          >
            Deutsch
          </button>
          <button
            type="button"
            className={settings.locale === 'en' ? 'is-active' : ''}
            onClick={() => {
              set('locale', 'en');
              setLocale('en');
            }}
          >
            English
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="card__head">
          <span className="card__title">
            <Moon size={14} /> {t('app.settings.theme')}
          </span>
        </div>
        <div className="segmented">
          {(['system', 'light', 'dark', 'night'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              className={settings.theme === theme ? 'is-active' : ''}
              onClick={() => set('theme', theme)}
            >
              {theme === 'system'
                ? t('app.settings.themeSystem')
                : theme === 'light'
                  ? t('app.settings.themeLight')
                  : theme === 'dark'
                    ? t('app.settings.themeDark')
                    : t('app.settings.themeNight')}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      <div className="card">
        <div className="card__head">
          <span className="card__title">{t('app.find.proximity')}</span>
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-row__label">{t('app.find.proximity')}</div>
            <div className="setting-row__sub">{t('app.pro.proximityBanner')}</div>
          </div>
          <button
            type="button"
            className={`switch setting-row__control ${settings.proximityFeedback ? 'is-on' : ''}`}
            role="switch"
            aria-checked={settings.proximityFeedback}
            onClick={() => set('proximityFeedback', !settings.proximityFeedback)}
            aria-label={t('app.find.proximity')}
          />
        </div>
        <div className="setting-row">
          <div>
            <div className="setting-row__label">{t('app.settings.units')}</div>
            <div className="setting-row__sub">{settings.units === 'metric' ? t('app.settings.unitsMetric') : t('app.settings.unitsImperial')}</div>
          </div>
          <div className="segmented setting-row__control" style={{ width: 130 }}>
            <button type="button" className={settings.units === 'metric' ? 'is-active' : ''} onClick={() => set('units', 'metric')}>
              m
            </button>
            <button type="button" className={settings.units === 'imperial' ? 'is-active' : ''} onClick={() => set('units', 'imperial')}>
              ft
            </button>
          </div>
        </div>
      </div>

      {/* Sensors */}
      <div className="card">
        <div className="card__head">
          <span className="card__title">
            <Compass size={14} /> {t('app.settings.sensorsTitle')}
          </span>
          <button type="button" className="btn btn--xs" onClick={() => setShowSensors((value) => !value)}>
            {showSensors ? t('common.ctaClose') : t('app.settings.sensorsCheck')}
          </button>
        </div>
        {showSensors && (
          <div style={{ display: 'grid', gap: 6 }}>
            {sensors.map((sensor) => (
              <div key={sensor.kind} className="row row--between">
                <span className="muted">{t(`app.settings.${sensor.kind === 'gps' ? 'gpsStatus' : sensor.kind === 'magnetometer' ? 'magStatus' : sensor.kind === 'accelerometer' ? 'accelStatus' : sensor.kind === 'gyroscope' ? 'gyroStatus' : 'baroStatus'}`)}</span>
                <span className={`mini-badge ${sensor.available ? 'mini-badge--pro' : ''}`}>
                  {sensor.available ? t('app.settings.available') : t('app.settings.unavailable')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Licence */}
      <div className="card">
        <div className="card__head">
          <span className="card__title">
            <Crown size={14} /> {t('app.settings.licenseTitle')}
          </span>
          <span className={`mini-badge ${plan === 'pro' ? 'mini-badge--pro' : ''}`}>
            {plan === 'pro' ? t('app.settings.licenseStatusPro') : t('app.settings.licenseStatusFree')}
          </span>
        </div>
        {plan === 'pro' ? (
          <div className="row row--between">
            <span className="muted">{license.fingerprint}</span>
            <button type="button" className="btn btn--xs" onClick={() => onOpenPro('')}>
              {t('app.settings.licenseTitle')}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--primary btn--block" onClick={() => onOpenPro('')}>
            {t('app.settings.licenseActivate')}
          </button>
        )}
      </div>

      {/* Privacy / data */}
      <div className="card">
        <div className="card__head">
          <span className="card__title">
            <Shield size={14} /> {t('app.settings.privacy')}
          </span>
          <span className="mono">{formatBytes(storageBytes, locale)}</span>
        </div>
        <p className="muted">{t('app.settings.privacyBody')}</p>
        <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
          <button type="button" className="btn btn--xs" onClick={() => void doExport()}>
            <Download size={12} /> {t('app.settings.exportData')}
          </button>
          <button type="button" className="btn btn--xs" onClick={doImport}>
            {t('app.settings.importData')}
          </button>
          <button type="button" className="btn btn--xs btn--danger" onClick={() => setConfirmWipe(true)}>
            {t('app.settings.deleteAll')}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          {anchors.length} · {t('app.settings.storageBody', { bytes: formatBytes(storageBytes, locale) })}
        </p>
      </div>

      {/* Support */}
      <div className="card">
        <div className="card__head">
          <span className="card__title">{t('app.settings.supportTitle')}</span>
        </div>
        <p className="muted">{t('app.settings.supportBody')}</p>
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {WALLET_LIST.map((wallet) => {
            const Icon = WALLET_ICONS[wallet.asset];
            return (
              <div key={wallet.asset} className="row row--between">
                <span className="row" style={{ gap: 6, color: wallet.accent }}>
                  <Icon size={14} />
                  <span className="mono" style={{ color: 'var(--text-2)', fontSize: 10 }}>
                    {wallet.address.slice(0, 10)}…{wallet.address.slice(-4)}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn--xs"
                  onClick={() => {
                    void navigator.clipboard?.writeText(wallet.address);
                    toast.show(t('common.copiedToClipboard'), 'ok');
                  }}
                >
                  <Copy size={11} /> {wallet.asset}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legal */}
      <div className="card">
        <div className="card__head">
          <span className="card__title">
            <Info size={14} /> {t('app.settings.legalTitle')}
          </span>
        </div>
        <div style={{ display: 'grid', gap: 2 }}>
          {LEGAL_NAV.map((item) => (
            <button
              key={item.slug}
              type="button"
              className="setting-row"
              onClick={() => setLegalSlug(item.slug)}
              style={{ textAlign: 'left', width: '100%' }}
            >
              <span className="setting-row__label" style={{ fontWeight: 500 }}>
                {locale === 'de' ? item.de : item.en}
              </span>
              <ChevronRight size={15} style={{ marginLeft: 'auto', color: 'var(--text-3)' }} />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn--quiet btn--xs"
          style={{ justifySelf: 'start', marginTop: 4 }}
          onClick={() => openExternal(`${SITE}/legal/imprint`)}
        >
          <Globe size={11} /> {locale === 'de' ? 'Impressum auf der Website' : 'Imprint on the website'}
        </button>
        <p className="muted" style={{ marginTop: 8 }}>
          {t('app.settings.aboutBody', { version: PRODUCT.version, developer: PRODUCT.legalBrand, email: PRODUCT.contactEmail })}
        </p>
        <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <a className="btn btn--xs" href={`mailto:${PRODUCT.contactEmail}`}>
            <Mail size={12} /> {PRODUCT.contactEmail}
          </a>
          <button type="button" className="btn btn--xs" onClick={() => set('onboardingDone', false)}>
            {t('app.settings.resetOnboarding')}
          </button>
        </div>
      </div>

      <LegalSheet slug={legalSlug} open={Boolean(legalSlug)} onClose={() => setLegalSlug(null)} />

      {isDemo && <p className="muted" style={{ textAlign: 'center' }}>{t('app.demo.body')}</p>}
      <ConfirmDialog
        open={confirmWipe}
        title={t('app.settings.deleteAll')}
        body={t('app.settings.deleteAllConfirm')}
        confirmLabel={t('app.settings.deleteAll')}
        cancelLabel={t('common.ctaCancel')}
        danger
        onCancel={() => setConfirmWipe(false)}
        onConfirm={() => {
          setConfirmWipe(false);
          clearAllData();
          toast.show(t('app.settings.deleteAll'), 'ok');
        }}
      />
    </>
  );
}
