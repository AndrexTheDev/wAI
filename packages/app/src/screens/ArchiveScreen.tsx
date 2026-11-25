import { useMemo } from 'react';
import { formatDuration, type Anchor } from '@wai/shared';
import { useApp } from '../store/AppStore';
import { useT } from '../i18n/useT';
import { useToast } from '../ui/Toast';
import { AnchorCard } from './HomeScreen';
import { EmptyState } from './EmptyState';
import { Archive, Crown, Timer } from '../ui/icons';

export function ArchiveScreen({
  onOpenAnchor,
  onOpenPro,
}: {
  onOpenAnchor: (anchor: Anchor) => void;
  onOpenPro: (reason: string) => void;
}) {
  const { t, locale } = useT();
  const { plan, archivedAnchors, anchors, fix, archiveAnchor } = useApp();
  const toast = useToast();

  const parkedTotal = useMemo(
    () => anchors.reduce((sum, anchor) => sum + (Date.now() - anchor.createdAt), 0),
    [anchors],
  );

  if (plan !== 'pro') {
    return (
      <>
        <div className="topbar" style={{ paddingTop: 8 }}>
          <div className="topbar__titles">
            <span className="topbar__name">{t('app.tabs.archive')}</span>
            <span className="topbar__sub">{t('app.settings.licenseStatusFree')}</span>
          </div>
        </div>
        <EmptyState
          icon={<Crown size={26} />}
          title={t('app.tabs.archive')}
          body={t('app.pro.limitBannerBody')}
          action={
            <button type="button" className="btn btn--primary btn--sm" onClick={() => onOpenPro(t('app.pro.limitBannerBody'))}>
              {t('common.ctaPro')}
            </button>
          }
        />
      </>
    );
  }

  return (
    <>
      <div className="topbar" style={{ paddingTop: 8 }}>
        <div className="topbar__titles">
          <span className="topbar__name">{t('app.tabs.archive')}</span>
          <span className="topbar__sub">{archivedAnchors.length} · {anchors.length}</span>
        </div>
      </div>

      <div className="card">
        <div className="row row--between">
          <span className="card__title">
            <Timer size={14} /> {t('app.timer.title')}
          </span>
          <span className="mono">{formatDuration(parkedTotal, locale)}</span>
        </div>
        <p className="muted">{t('app.anchor.parkedFor', { duration: formatDuration(parkedTotal, locale) })}</p>
      </div>

      {archivedAnchors.length === 0 ? (
        <EmptyState icon={<Archive size={26} />} title={t('app.tabs.archive')} body={t('app.home.emptyBody')} />
      ) : (
        <div className="anchor-list" style={{ marginTop: 12 }}>
          {archivedAnchors.map((anchor) => (
            <div key={anchor.id} style={{ display: 'grid', gap: 6 }}>
              <AnchorCard
                anchor={anchor}
                onOpen={() => onOpenAnchor(anchor)}
                onFind={() => {}}
                originLat={fix?.lat}
                originLng={fix?.lng}
                locale={locale}
                t={t}
              />
              <button
                type="button"
                className="btn btn--xs"
                onClick={() => {
                  archiveAnchor(anchor.id, false);
                  toast.show(t('app.anchor.archive'), 'ok');
                }}
              >
                {t('app.anchor.archive')} ↺
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
