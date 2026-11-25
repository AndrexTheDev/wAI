import { useEffect, useState } from 'react';
import { LocaleProvider, useLocale } from './lib/locale';
import { RouterProvider, useRouter } from './lib/router';
import { useReveal } from './lib/useReveal';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { LegalPage } from './pages/LegalPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { DemoPage } from './pages/DemoPage';
import { SharePreviewPage } from './pages/SharePreviewPage';
import { loadLegalDocument, type LegalDocument } from '@wai/shared';

function RoutedContent() {
  const { path } = useRouter();
  const { locale } = useLocale();
  useReveal([path, locale]);

  const legalMatch = path.match(/^\/legal\/([\w-]+)\/?$/);
  const legalSlug = legalMatch?.[1];

  // Legal documents are code-split: only the requested document is fetched.
  const [legalDoc, setLegalDoc] = useState<LegalDocument | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!legalSlug) {
      setLegalDoc(null);
      return () => {
        cancelled = true;
      };
    }
    void loadLegalDocument(legalSlug).then((doc) => {
      if (!cancelled) setLegalDoc(doc ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [legalSlug]);

  useEffect(() => {
    const titles: Record<string, { de: string; en: string }> = {
      '/': {
        de: 'wAI – Umgebungs-Gedächtnisanker | Nie wieder suchen',
        en: 'wAI – Environmental Memory Anchor | Stop searching',
      },
      '/app/': { de: 'wAI App – Demo', en: 'wAI app – demo' },
      '/a/': { de: 'Geteilter Anker · wAI', en: 'Shared anchor · wAI' },
    };
    if (legalDoc) {
      document.title = `${legalDoc[locale].title} · wAI`;
      return;
    }
    if (path === '/app' || path === '/app/') {
      document.title = titles['/app/'][locale];
      return;
    }
    document.title = (titles[path] ?? titles['/'])[locale];
  }, [path, locale, legalDoc]);

  if (legalSlug) {
    if (!legalDoc) return <LegalSkeleton />;
    return <LegalPage doc={legalDoc} />;
  }
  // /a/#WAIX1.… – public preview of a shared anchor (code stays in the fragment).
  if (path === '/a' || path === '/a/') {
    return <SharePreviewPage />;
  }
  if (path === '/app' || path === '/app/' || path === '/demo') {
    return <DemoPage />;
  }
  if (path === '/' || path === '') {
    return <LandingPage />;
  }
  return <NotFoundPage />;
}

/** Placeholder while the requested legal document chunk loads (a few kB). */
function LegalSkeleton() {
  return (
    <div className="container legal legal--loading" aria-busy="true">
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line skeleton--short" />
    </div>
  );
}

function Shell() {
  const { path } = useRouter();
  const isDemo = path.startsWith('/app');

  if (isDemo) {
    return <RoutedContent />;
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Zum Inhalt springen
      </a>
      <Header />
      <main id="main">
        <RoutedContent />
      </main>
      <Footer />
    </>
  );
}

export function App() {
  return (
    <LocaleProvider>
      <RouterProvider>
        <Shell />
      </RouterProvider>
    </LocaleProvider>
  );
}
