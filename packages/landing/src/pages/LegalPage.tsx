import { LEGAL_NAV, PRODUCT, type LegalBlock, type LegalDocument } from '@wai/shared';
import { useLocale } from '../lib/locale';
import { Link, useRouter } from '../lib/router';
import { ArrowRightIcon, CheckIcon, InfoIcon, MailIcon, PrinterIcon } from '../components/Icons';
import './LegalPage.css';

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case 'h3':
      return <h3 className="legal__h3">{block.text}</h3>;
    case 'ul':
      return (
        <ul className="legal__list">
          {block.items.map((item) => (
            <li key={item}>
              <CheckIcon size={14} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="legal__olist">
          {block.items.map((item, i) => (
            <li key={item}>
              <span className="legal__olist-num">{i + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
    case 'note':
      return (
        <p className="callout callout--info legal__note">
          <InfoIcon size={15} />
          <span>{block.text}</span>
        </p>
      );
    case 'quote':
      return <blockquote className="legal__quote">{block.text}</blockquote>;
    case 'table':
      return (
        <div className="table-wrap legal__table">
          <table className="clean">
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th key={cell} scope="col">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'p':
    default:
      return <p className="legal__p">{block.text}</p>;
  }
}

export function LegalPage({ doc }: { doc: LegalDocument }) {
  const { t, locale } = useLocale();
  const { navigate } = useRouter();
  const content = doc[locale];
  const updated = new Date(doc.updated).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="legal">
      <div className="container legal__inner">
        <nav className="legal__crumbs" aria-label="Breadcrumb">
          <Link to="/">wAI</Link>
          <span aria-hidden="true">/</span>
          <Link to="/#faq">{t('nav.legal')}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{content.title}</span>
        </nav>

        <header className="legal__head">
          <h1>{content.title}</h1>
          <p className="legal__subtitle">{content.subtitle}</p>
          <div className="legal__meta">
            <span className="badge">
              {t('landing.legalPage.updated')}: {updated}
            </span>
            <span className="badge">v{doc.version}</span>
            <span className="badge">DE / EN</span>
            <button type="button" className="btn btn--quiet btn--sm no-print" onClick={() => window.print()}>
              <PrinterIcon size={14} /> {t('landing.legalPage.print')}
            </button>
          </div>
        </header>

        <div className="legal__layout">
          <aside className="legal__toc no-print">
            <h2>{t('landing.legalPage.toc')}</h2>
            <ol>
              {content.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
            <div className="legal__toc-other">
              <h2>{t('landing.legalPage.relatedTitle')}</h2>
              {LEGAL_NAV.filter((item) => item.slug !== doc.slug).map((item) => (
                <Link key={item.slug} to={item.path}>
                  {locale === 'de' ? item.de : item.en}
                </Link>
              ))}
            </div>
          </aside>

          <div className="legal__content">
            {content.intro.map((paragraph) => (
              <p key={paragraph} className="legal__intro">
                {paragraph}
              </p>
            ))}

            {content.sections.map((section) => (
              <section key={section.id} id={section.id} className="legal__section">
                <h2>{section.title}</h2>
                {section.blocks.map((block, index) => (
                  <Block key={index} block={block} />
                ))}
              </section>
            ))}

            {content.outro?.map((paragraph) => (
              <p key={paragraph} className="legal__outro">
                {paragraph}
              </p>
            ))}

            <div className="callout callout--warn legal__advice no-print">
              <InfoIcon size={16} />
              <span>{t('landing.legalPage.legalAdvice')}</span>
            </div>

            <div className="legal__contact">
              <h2>{t('nav.contact')}</h2>
              <p>
                {PRODUCT.legalBrand} ·{' '}
                <a href={`mailto:${PRODUCT.contactEmail}`}>{PRODUCT.contactEmail}</a>
              </p>
              <div className="legal__actions no-print">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate('/')}>
                  {locale === 'de' ? 'Zur Startseite' : 'Back to home'} <ArrowRightIcon size={14} />
                </button>
                <a className="btn btn--quiet btn--sm" href={`mailto:${PRODUCT.contactEmail}`}>
                  <MailIcon size={14} /> {PRODUCT.contactEmail}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
