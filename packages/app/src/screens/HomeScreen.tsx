import { useMemo, useState } from 'react';
import {
  formatDistance,
  formatDuration,
  parkingStatus,
  tArray,
  type Anchor,
  type AnchorCategory,
} from '@wai/shared';
import { useApp } from '../store/AppStore';
import { useToast } from '../ui/Toast';
import { useT } from '../i18n/useT';
import {
  Anchor as AnchorIcon,
  CATEGORY_ICONS,
  ChevronRight,
  Crown,
  Search,
  StarFilled,
  Timer,
  Camera,
  Mic,
  Trail,
  Plus,
} from '../ui/icons';
import { EmptyState } from './EmptyState';

type Sort = 'newest' | 'oldest' | 'nearest' | 'name';

export function HomeScreen({
  onOpenAnchor,
  onNewAnchor,
  onOpenPro,
  onFind,
}: {
  onOpenAnchor: (anchor: Anchor) => void;
  onNewAnchor: () => void;
  onOpenPro: () => void;
  onFind: (anchor: Anchor) => void;
}) {
  const { t, locale } = useT();
  const { anchors, activeAnchors, plan, limits, fix, search, demo } = useApp();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<AnchorCategory | 'all'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('newest');

  const categories = useMemo(
    () => ['car', 'tent', 'meeting', 'tool', 'entrance', 'nature', 'other'] as AnchorCategory[],
    [],
  );

  const visible = useMemo(
    () =>
      search({
        query,
        sort,
        origin: fix ?? undefined,
        category,
        filter: favoritesOnly ? 'favorites' : 'all',
      }),
    [search, query, sort, fix, category, favoritesOnly],
  );

  const limitReached = plan === 'free' && activeAnchors.length >= limits.activeAnchors;

  const categoryCounts = useMemo(() => {
    const map = new Map<AnchorCategory, number>();
    for (const anchor of anchors) map.set(anchor.category, (map.get(anchor.category) ?? 0) + 1);
    return map;
  }, [anchors]);

  const doSet = () => {
    if (limitReached) {
      toast.show(t('app.home.limitReached'), 'warn');
      onOpenPro();
      return;
    }
    onNewAnchor();
  };

  return (
    <>
      <div className="anchor-hero">
        <button type="button" className="anchor-btn" onClick={doSet} aria-label={t('app.home.setAnchor')}>
          <span className="anchor-btn__ring" />
          <span className="anchor-btn__ring anchor-btn__ring--2" />
          <span className="anchor-btn__inner">
            <AnchorIcon size={40} />
            <span className="anchor-btn__label">{t('app.home.setAnchor')}</span>
            <span className="anchor-btn__hint">{t('app.home.setAnchorHint')}</span>
          </span>
        </button>
        <p className="anchor-hero__hint">
          {fix
            ? t('app.home.accuracy', { meters: Math.round(fix.accuracy ?? 0) })
            : t('app.home.noGps')}
        </p>
      </div>

      {limitReached && (
        <div className="banner" style={{ marginBottom: 12 }}>
          <Crown size={16} />
          <div className="banner__body">
            <span className="banner__title">{t('app.home.limitReached')}</span>
            <span>{t('app.home.limitBody', { limit: limits.activeAnchors })}</span>
            <button type="button" className="btn btn--xs" style={{ justifySelf: 'start' }} onClick={onOpenPro}>
              {t('app.pro.what')} <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('app.home.searchPlaceholder')}
            aria-label={t('app.home.searchPlaceholder')}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label={t('common.ctaClose')}>
              <Plus size={14} style={{ rotate: '45deg' }} />
            </button>
          )}
        </div>

        <div className="chips" role="tablist" aria-label={t('app.anchor.category')}>
          <button
            type="button"
            role="tab"
            aria-selected={category === 'all' && !favoritesOnly}
            className={`chip ${category === 'all' && !favoritesOnly ? 'is-active' : ''}`}
            onClick={() => {
              setCategory('all');
              setFavoritesOnly(false);
            }}
          >
            {t('app.home.filterAll')} <span className="chip__count">{activeAnchors.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={favoritesOnly}
            className={`chip ${favoritesOnly ? 'is-active' : ''}`}
            onClick={() => {
              setFavoritesOnly((value) => !value);
              setCategory('all');
            }}
          >
            <StarFilled size={12} /> {t('app.home.filterFavorites')}
          </button>
          {categories.map((value) => {
            const Icon = CATEGORY_ICONS[value];
            const count = categoryCounts.get(value) ?? 0;
            if (!count && category !== value) return null;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={category === value}
                className={`chip ${category === value ? 'is-active' : ''}`}
                onClick={() => setCategory(category === value ? 'all' : value)}
              >
                <Icon size={12} /> {t(`app.anchor.categories.${value}`)}
                {count > 0 && <span className="chip__count">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="row row--between">
          <span className="muted">
            {t('app.home.activeCount', { count: activeAnchors.length })}
            {plan === 'free' ? ` / ${limits.activeAnchors}` : ''}
          </span>
          <select
            className="btn btn--xs"
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            aria-label={t('app.home.sortNewest')}
            style={{ background: 'var(--surface)' }}
          >
            <option value="newest">{t('app.home.sortNewest')}</option>
            <option value="oldest">{t('app.home.sortOldest')}</option>
            <option value="nearest">{t('app.home.sortNearest')}</option>
            <option value="name">{t('app.home.sortName')}</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<AnchorIcon size={26} />}
          title={query || category !== 'all' || favoritesOnly ? t('app.home.emptyTitle') : t('app.anchor.untitled')}
          body={t('app.home.emptyBody')}
        />
      ) : (
        <div className="anchor-list">
          {visible.map((anchor) => (
            <AnchorCard
              key={anchor.id}
              anchor={anchor}
              onOpen={() => onOpenAnchor(anchor)}
              onFind={() => onFind(anchor)}
              originLat={fix?.lat}
              originLng={fix?.lng}
              locale={locale}
              t={t}
            />
          ))}
        </div>
      )}

      {demo && (
        <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
          {t('app.demo.body')}
        </p>
      )}
    </>
  );
}

export function AnchorCard({
  anchor,
  onOpen,
  onFind,
  originLat,
  originLng,
  locale,
  t,
}: {
  anchor: Anchor;
  onOpen: () => void;
  onFind: () => void;
  originLat?: number;
  originLng?: number;
  locale: 'de' | 'en';
  t: ReturnType<typeof useT>['t'];
}) {
  const Icon = CATEGORY_ICONS[anchor.category] ?? CATEGORY_ICONS.other;
  const distance =
    originLat !== undefined && originLng !== undefined
      ? formatDistance(
          Math.hypot(
            (anchor.lat - originLat) * 111132,
            (anchor.lng - originLng) * 111320 * Math.cos((originLat * Math.PI) / 180),
          ),
          locale,
        )
      : null;
  const parking = parkingStatus(anchor);
  const hasMedia = anchor.photos.length > 0 || anchor.voices.length > 0;
  const trail = (anchor.trail?.length ?? 0) > 1;

  return (
    <div className={`anchor-card ${anchor.archived ? 'is-archived' : ''}`}>
      {/* Main tap target: opens the editor. Kept as a real <button> for a11y, but
          the distance shortcut below is a sibling so we never nest buttons. */}
      <button
        type="button"
        className="anchor-card__tap"
        onClick={onOpen}
        aria-label={`${anchor.name || t('app.anchor.untitled')} – ${t('app.anchor.edit')}`}
      >
        <span className="anchor-card__icon">
          <Icon size={20} />
        </span>
        <span className="anchor-card__main">
          <span className="anchor-card__title">{anchor.name || t('app.anchor.untitled')}</span>
          <span className="anchor-card__meta">
            <span>{t(`app.anchor.categories.${anchor.category}`)}</span>
            {anchor.parking && (
              <span>
                <Timer size={10} /> {formatDuration(parking.elapsed, locale)}
              </span>
            )}
            {anchor.zone && <span>· {anchor.zone.slice(0, 22)}</span>}
          </span>
        </span>
      </button>

      <div className="anchor-card__right">
        {distance && onFind ? (
          <button
            type="button"
            className="anchor-card__distance"
            onClick={onFind}
            aria-label={`${t('app.find.title')}: ${anchor.name || t('app.anchor.untitled')}`}
          >
            {distance}
          </button>
        ) : (
          <span className="anchor-card__distance">{distance ?? ''}</span>
        )}
        <span className="anchor-card__badges">
          {anchor.favorite && (
            <span className="mini-badge mini-badge--fav" title={t('app.anchor.favorite')}>
              ★
            </span>
          )}
          {anchor.photos.length > 0 && (
            <span className="mini-badge">
              <Camera size={9} />
            </span>
          )}
          {anchor.voices.length > 0 && (
            <span className="mini-badge">
              <Mic size={9} />
            </span>
          )}
          {trail && (
            <span className="mini-badge">
              <Trail size={9} />
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
