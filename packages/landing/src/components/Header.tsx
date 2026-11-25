import { useEffect, useState } from 'react';
import { useLocale } from '../lib/locale';
import { Link, useRouter } from '../lib/router';
import { AnchorIcon, GlobeIcon, MenuIcon, CrossIcon, CrownIcon } from './Icons';
import './Header.css';

const SECTION_LINKS = [
  { id: 'features', path: '/#features' },
  { id: 'how', path: '/#how' },
  { id: 'use-cases', path: '/#use-cases' },
  { id: 'pricing', path: '/#pricing' },
  { id: 'faq', path: '/#faq' },
] as const;

const NAV_KEYS: Record<(typeof SECTION_LINKS)[number]['id'], string> = {
  features: 'nav.features',
  how: 'nav.howItWorks',
  'use-cases': 'nav.useCases',
  pricing: 'nav.pricing',
  faq: 'nav.faq',
};

export function Header() {
  const { t, locale, setLocale } = useLocale();
  const { navigate, path } = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const go = (to: string) => {
    setMenuOpen(false);
    if (to.startsWith('/#')) {
      const id = to.slice(2);
      if (path !== '/') {
        navigate('/');
        window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 80);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    navigate(to);
  };

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container site-header__inner">
        <Link to="/" className="brand" aria-label="wAI">
          <span className="brand__mark" aria-hidden="true">
            <AnchorIcon size={19} />
          </span>
          <span className="brand__text">
            <span className="brand__name">wAI</span>
            <span className="brand__sub">Environmental Memory Anchor</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label={t('nav.features')}>
          {SECTION_LINKS.map((link) => (
            <button key={link.id} type="button" className="site-nav__link" onClick={() => go(link.path)}>
              {t(NAV_KEYS[link.id])}
            </button>
          ))}
          <button type="button" className="site-nav__link" onClick={() => go('/#download')}>
            {t('nav.download')}
          </button>
        </nav>

        <div className="site-header__actions">
          <button
            type="button"
            className="lang-switch"
            onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}
            aria-label={`${t('common.language')}: ${locale === 'de' ? 'English' : 'Deutsch'}`}
            title={locale === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
          >
            <GlobeIcon size={16} />
            <span>{locale === 'de' ? 'EN' : 'DE'}</span>
          </button>
          <button type="button" className="btn btn--primary btn--sm cta-pro" onClick={() => go('/#crypto')}>
            <CrownIcon size={15} />
            {t('common.ctaPro')}
          </button>
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {menuOpen ? <CrossIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>

      <div className={`mobile-menu ${menuOpen ? 'is-open' : ''}`} hidden={!menuOpen}>
        <nav className="mobile-menu__nav" aria-label={t('nav.features')}>
          {SECTION_LINKS.map((link) => (
            <button key={link.id} type="button" onClick={() => go(link.path)}>
              {t(NAV_KEYS[link.id])}
            </button>
          ))}
          <button type="button" onClick={() => go('/#download')}>
            {t('nav.download')}
          </button>
          <button type="button" onClick={() => go('/#crypto')}>
            {t('common.ctaSupport')}
          </button>
          <button type="button" onClick={() => go('/legal/disclaimer')}>
            {t('nav.legal')}
          </button>
        </nav>
        <div className="mobile-menu__footer">
          <button type="button" className="btn btn--ghost btn--block" onClick={() => setLocale(locale === 'de' ? 'en' : 'de')}>
            <GlobeIcon size={16} /> {locale === 'de' ? 'English' : 'Deutsch'}
          </button>
          <button type="button" className="btn btn--primary btn--block" onClick={() => go('/#download')}>
            {t('common.ctaPrimary')}
          </button>
        </div>
      </div>
    </header>
  );
}
