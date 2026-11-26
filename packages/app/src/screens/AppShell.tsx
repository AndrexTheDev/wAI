import { useCallback, useEffect, useMemo, useState } from 'react';
import { extractShareCode, type Anchor } from '@wai/shared';
import { useApp } from '../store/AppStore';
import { anchorFromShareCode } from '../store/shareImport';
import { useT } from '../i18n/useT';
import { useToast } from '../ui/Toast';
import { AnchorEditor } from './AnchorEditor';
import { ArchiveScreen } from './ArchiveScreen';
import { FindScreen } from './FindScreen';
import { HomeScreen } from './HomeScreen';
import { ProScreen } from './ProScreen';
import { SettingsScreen } from './SettingsScreen';
import { ShareSheet } from './ShareSheet';
import { HelpSheet } from './HelpSheet';
import { ParkingTimerSheet } from './ParkingTimerSheet';
import { Onboarding } from './Onboarding';
import {
  Anchor as AnchorIcon,
  Archive,
  Compass,
  Crown,
  Globe,
  Info,
  Settings as SettingsIcon,

  Timer,
  Cross,
  Check,
} from '../ui/icons';
import { isNative, onParkingNotificationTap, vibrate } from '../platform/native';

type Tab = 'anchors' | 'find' | 'archive' | 'settings';

export function AppShell() {
  const { t, locale } = useT();
  const {
    ready,
    settings,
    plan,
    anchors,
    activeAnchors,
    fix,
    estimated,
    sensors,
    locationError,
    demo,
    setAnchor,
    archiveAnchor,
    setLocale,
    updateSettings,
    importAnchors,
  } = useApp();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('anchors');
  const [selected, setSelected] = useState<Anchor | null>(null);
  const [editing, setEditing] = useState<{ anchor: Anchor | null; mode: 'create' | 'edit' }>({
    anchor: null,
    mode: 'create',
  });
  const [proOpen, setProOpen] = useState(false);
  const [proReason, setProReason] = useState<string | undefined>();
  const [shareAnchor, setShareAnchor] = useState<Anchor | null>(null);
  const [timerAnchor, setTimerAnchor] = useState<Anchor | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setSelected((current) => {
      if (!current) return current;
      return activeAnchors.find((anchor) => anchor.id === current.id) ?? null;
    });
  }, [activeAnchors]);

  /**
   * Receives anchors from share links and deep links.
   *
   * Three entry points, all funnelled through the same parser and sanitiser as
   * the manual import in the share sheet:
   *   - https://<site>/a/#<code>     (App Link / web preview → "In der App öffnen")
   *   - wai://anchor/<code>          (explicit hand-off from the browser)
   *   - anything pasted into the import field
   * The code is stripped from the address bar afterwards, so a reload cannot
   * import the same anchor twice.
   */
  const handleIncomingShare = useCallback(
    (raw: string) => {
      const anchor = anchorFromShareCode(raw);
      if (!anchor) {
        toast.show(t('app.share.invalid'), 'err');
        return;
      }
      importAnchors([anchor]);
      toast.show(t('app.share.imported'), 'ok');
      setTab('anchors');
      if (window.location.hash.includes('WAIX1.')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    },
    [importAnchors, t, toast],
  );

  useEffect(() => {
    if (!ready) return;
    const incoming = extractShareCode(window.location.hash) ?? extractShareCode(window.location.search);
    if (incoming) handleIncomingShare(incoming);
  }, [ready, handleIncomingShare]);

  /* A tapped parking reminder opens the anchor it belongs to. */
  useEffect(() => {
    if (!isNative || !ready) return;
    let remove: (() => void) | undefined;
    void onParkingNotificationTap((anchorId) => {
      const anchor = anchors.find((item) => item.id === anchorId);
      if (!anchor) return;
      // The timer notification is about *time*, so show the timer first, then
      // let the user continue to the compass with one tap.
      setTimerAnchor(anchor);
      setSelected(anchor);
      setTab('find');
      void vibrate('tap');
    }).then((dispose) => {
      remove = dispose;
    });
    return () => remove?.();
  }, [ready, anchors]);

  useEffect(() => {
    if (!isNative) return;
    let remove: (() => void) | undefined;
    void (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('appUrlOpen', (event) => handleIncomingShare(event.url));
        remove = () => void listener.remove();
        // Cold start: the intent that started the app is not always re-emitted as
        // an event, so read it once explicitly.
        const launch = await App.getLaunchUrl();
        if (launch?.url) handleIncomingShare(launch.url);
      } catch {
        /* the plugin is absent in a plain web build — links then stay in the browser */
      }
    })();
    return () => remove?.();
  }, [handleIncomingShare]);

  const openPro = (reason = '') => {
    setProReason(reason || undefined);
    setProOpen(true);
  };

  const createAnchorNow = () => {
    if (!fix) {
      toast.show(t('app.permissions.noLocation'), 'warn');
      return;
    }
    const result = setAnchor({ fix });
    if (!result.ok || !result.anchor) {
      openPro(t('app.home.limitBody', { limit: 3 }));
      return;
    }
    void vibrate('strong');
    setEditing({ anchor: result.anchor, mode: 'create' });
    toast.show(t('app.home.saved'), 'ok', {
      label: t('app.home.undo'),
      onClick: () => {
        /* undo handled by editor delete */
      },
    });
  };

  const startFind = (anchor: Anchor) => {
    setSelected(anchor);
    setTab('find');
    void vibrate('tap');
  };

  const tabs = useMemo(
    () =>
      [
        { id: 'anchors' as const, label: t('app.tabs.anchors'), icon: AnchorIcon, badge: activeAnchors.length },
        { id: 'find' as const, label: t('app.tabs.find'), icon: Compass },
        { id: 'archive' as const, label: t('app.tabs.archive'), icon: Archive },
        { id: 'settings' as const, label: t('app.tabs.settings'), icon: SettingsIcon },
      ],
    [t, activeAnchors.length],
  );

  if (!ready) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100dvh' }}>
        <span className="muted">{t('common.loading')}</span>
      </div>
    );
  }

  if (!settings.onboardingDone) {
    return <Onboarding onDone={() => updateSettings({ onboardingDone: true })} />;
  }

  return (
    <div className={`app ${tab === 'find' && selected ? 'app--full' : ''}`}>
      {/* Header (hidden on the find tab, which brings its own) */}
      {tab !== 'find' && (
        <header className="topbar">
          <div className="topbar__brand">
            <span className="topbar__mark">
              <AnchorIcon size={17} />
            </span>
            <div className="topbar__titles">
              <span className="topbar__name">wAI</span>
              <span className="topbar__sub">{t('meta.productSub')}</span>
            </div>
          </div>
          <div className="topbar__actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}
              aria-label={t('common.language')}
            >
              <Globe size={17} />
            </button>
            {plan === 'pro' ? (
              <span className="mini-badge mini-badge--pro" style={{ padding: '4px 7px' }}>
                PRO
              </span>
            ) : (
              <button type="button" className="icon-btn" onClick={() => openPro()} aria-label={t('common.ctaPro')}>
                <Crown size={17} />
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              onClick={() => setHelpOpen(true)}
              aria-label={t('landing.how.eyebrow')}
            >
              <Info size={17} />
            </button>
          </div>
        </header>
      )}

      {/* Status strip */}
      {tab !== 'find' && (
        <div className="status-strip">
          <span
            className={`status-chip ${estimated ? 'status-chip--warn' : fix ? 'status-chip--ok' : 'status-chip--warn'}`}
          >
            <span className="dot" />
            {estimated ? t('app.home.estimated') : fix ? t('app.home.gpsOk') : t('app.home.noGps')}
          </span>
          {fix?.accuracy !== undefined && (
            <span className="status-chip">{t('app.home.accuracy', { meters: Math.round(fix.accuracy) })}</span>
          )}
          {sensors.heading !== null && (
            <span className="status-chip">
              <Compass size={10} /> {Math.round(sensors.heading)}°
            </span>
          )}
          {demo && <span className="status-chip status-chip--demo">{t('common.demo')}</span>}
          {locationError && <span className="status-chip status-chip--warn">{t('app.permissions.noLocation')}</span>}
        </div>
      )}

      <main className="app__body">
        {tab === 'anchors' && (
          <HomeScreen
            onOpenAnchor={(anchor) => setEditing({ anchor, mode: 'edit' })}
            onNewAnchor={createAnchorNow}
            onOpenPro={() => openPro()}
            onFind={startFind}
            onHelp={() => setHelpOpen(true)}
            onTimer={(anchor) => setTimerAnchor(anchor)}
          />
        )}

        {tab === 'find' && (
          <FindScreen
            anchor={selected}
            onBack={() => setTab('anchors')}
            onChooseAnother={() => {
              setSelected(null);
              setTab('anchors');
            }}
            onOpenPro={openPro}
            onArchive={(anchor) => {
              archiveAnchor(anchor.id, true);
              setSelected(null);
              setTab('anchors');
              toast.show(t('app.anchor.archive'), 'ok', {
                label: t('app.home.undo'),
                onClick: () => archiveAnchor(anchor.id, false),
              });
            }}
            onStopParking={(anchor) => setTimerAnchor(anchor)}
          />
        )}

        {tab === 'archive' && (
          <ArchiveScreen onOpenAnchor={(anchor) => setEditing({ anchor, mode: 'edit' })} onOpenPro={openPro} />
        )}

        {tab === 'settings' && <SettingsScreen onOpenPro={openPro} />}
      </main>

      <nav className="tabbar" aria-label={t('app.tabs.anchors')}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab ${tab === item.id ? 'is-active' : ''}`}
            onClick={() => {
              setTab(item.id);
              void vibrate('tap');
            }}
            aria-current={tab === item.id ? 'page' : undefined}
          >
            <span className="tab__icon">
              <item.icon size={20} />
              {item.badge ? <span className="tab__badge">{item.badge}</span> : null}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <AnchorEditor
        anchor={editing.anchor}
        mode={editing.mode}
        open={Boolean(editing.anchor)}
        onClose={() => setEditing({ anchor: null, mode: 'edit' })}
        onUpgrade={openPro}
        onShare={(anchor) => {
          setEditing({ anchor: null, mode: 'edit' });
          setShareAnchor(anchor);
        }}
        onTimer={(anchor) => {
          setEditing({ anchor: null, mode: 'edit' });
          setTimerAnchor(anchor);
        }}
      />

      <ProScreen open={proOpen} onClose={() => setProOpen(false)} reason={proReason} />

      <ShareSheet
        anchor={shareAnchor}
        open={Boolean(shareAnchor)}
        onClose={() => setShareAnchor(null)}
        onUpgrade={openPro}
      />

      <ParkingTimerSheet
        anchor={timerAnchor}
        open={Boolean(timerAnchor)}
        onClose={() => setTimerAnchor(null)}
        onUpgrade={openPro}
      />

      {helpOpen && (
        <HelpSheet
          onClose={() => setHelpOpen(false)}
          onOpenPro={() => {
            setHelpOpen(false);
            openPro();
          }}
        />
      )}
    </div>
  );
}
