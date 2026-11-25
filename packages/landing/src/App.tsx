import { useEffect } from 'react';
import { LocaleProvider, useLocale } from './lib/locale';
import { RouterProvider, useRouter } from './lib/router';
import { useReveal } from './lib/useReveal';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { LegalPage } from './pages/LegalPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { DemoPage } from './pages/DemoPage';
import { getLegalDocument } from '@wai/shared';

function RoutedContent() {
  const { path } = useRouter();
  const { locale } = useLocale();
  useReveal([path, locale]);

  const legalMatch = path.match(/^\/legal\/([\w-]+)\/?$/);

  useEffect(() => {
    const titles: Record<string, { de: string; en: string }> = {
      '/': {
        de: 'wAI – Umgebungs-Gedächtnisanker | Nie wieder suchen',
        en: 'wAI – Environmental Memory Anchor | Stop searching',
      },
      '/app/': { de: 'wAI App – Demo', en: 'wAI app – demo' },
    };
    if (legalMatch) {
      const doc = getLegalDocument(legalMatch[1]);
      if (doc) {
        document.title = `${doc[locale].title} · wAI`;
        return;
      }
    }
    if (path === '/app' || path === '/app/') {
      document.title = titles['/app/'][locale];
      return;
    }
    document.title = (titles[path] ?? titles['/'])[locale];
  }, [path, locale, legalMatch]);

  if (legalMatch) {
    const doc = getLegalDocument(legalMatch[1]);
    return doc ? <LegalPage doc={doc} /> : <NotFoundPage />;
  }
  if (path === '/app' || path === '/app/' || path === '/demo') {
    return <DemoPage />;
  }
  if (path === '/' || path === '') {
    return <LandingPage />;
  }
  return <NotFoundPage />;
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
