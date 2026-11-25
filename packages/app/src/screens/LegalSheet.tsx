import { useEffect, useState } from 'react';
import { PRODUCT, loadLegalDocument, type LegalBlock, type LegalDocument, type LegalSlug } from '@wai/shared';
import { useT } from '../i18n/useT';
import { Sheet } from '../ui/Sheet';
import { openExternal } from '../platform/links';

/**
 * Renders the legal documents *inside* the app, from the bundled shared module —
 * no network, no website, works in airplane mode. This matters for an offline
 * product: a user in a foreign car park with no data must still be able to read
 * the disclaimer and the terms they agreed to.
 */
export function LegalSheet({
  slug,
  open,
  onClose,
}: {
  slug: LegalSlug | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useT();
  const [doc, setDoc] = useState<LegalDocument | null>(null);

  // Documents are code-split, so they are fetched on demand. They ship inside the
  // bundle, which keeps the reader working in airplane mode.
  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setDoc(null);
      return () => {
        cancelled = true;
      };
    }
    void loadLegalDocument(slug).then((loaded) => {
      if (!cancelled) setDoc(loaded ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <Sheet
      open={open && Boolean(doc)}
      onClose={onClose}
      title={doc ? doc[locale].title : ''}
      footer={
        <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
          {t('common.ctaClose')}
        </button>
      }
    >
      {doc && <LegalDocumentView doc={doc} />}
    </Sheet>
  );
}

/**
 * Pure renderer for a legal document. Kept free of data loading so it can be
 * rendered and asserted in tests without a browser or an effect flush.
 */
export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  const { t, locale } = useT();
  const content = doc[locale];

  return (
    <article className="legal-doc" lang={locale}>
      <h2 className="legal-doc__title">{content.title}</h2>
      <p className="legal-doc__meta">
        {content.subtitle} · v{doc.version} · {doc.updated}
      </p>

      {content.intro.map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className="legal-doc__intro">
          {paragraph}
        </p>
      ))}

      {content.sections.map((section) => (
        <section key={section.id} className="legal-doc__section">
          <h3>{section.title}</h3>
          {section.blocks.map((block, index) => (
            <LegalBlockView key={`${section.id}-${index}`} block={block} />
          ))}
        </section>
      ))}

      {content.outro?.map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className="legal-doc__outro">
          {paragraph}
        </p>
      ))}

      <div className="legal-doc__foot">
        <p className="muted">
          {t('app.settings.aboutBody', {
            version: PRODUCT.version,
            developer: PRODUCT.legalBrand,
            email: PRODUCT.contactEmail,
          })}
        </p>
        <button
          type="button"
          className="btn btn--xs"
          onClick={() => openExternal(`mailto:${PRODUCT.contactEmail}`)}
        >
          {PRODUCT.contactEmail}
        </button>
      </div>
    </article>
  );
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case 'h3':
      return <h4 className="legal-doc__h4">{block.text}</h4>;
    case 'ul':
      return (
        <ul className="legal-doc__list">
          {block.items.map((item) => (
            <li key={item.slice(0, 40)}>{item}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="legal-doc__olist">
          {block.items.map((item, index) => (
            <li key={item.slice(0, 40)}>
              <span className="legal-doc__num">{index + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
    case 'note':
      return <p className="legal-doc__note">{block.text}</p>;
    case 'quote':
      return <blockquote className="legal-doc__quote">{block.text}</blockquote>;
    case 'table':
      return (
        <div className="legal-doc__tablewrap">
          <table className="legal-doc__table">
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
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return <p className="legal-doc__p">{block.text}</p>;
  }
}
