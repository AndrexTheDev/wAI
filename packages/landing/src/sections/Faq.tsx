import { PRODUCT, tArray } from '@wai/shared';
import { useLocale } from '../lib/locale';
import { Accordion, type AccordionItem } from '../components/Accordion';
import { MailIcon } from '../components/Icons';
import './Faq.css';

export function Faq() {
  const { t, locale } = useLocale();
  const items = tArray<AccordionItem>(locale, 'landing.faq.items');

  return (
    <section className="section faq" id="faq">
      <div className="container faq__inner">
        <div className="faq__aside">
          <span className="eyebrow reveal">{t('landing.faq.eyebrow')}</span>
          <h2 className="section-title reveal" data-reveal-delay="60">
            {t('landing.faq.title')}
          </h2>
          <p className="section-lead reveal" data-reveal-delay="100">
            {locale === 'de'
              ? 'Noch eine Frage offen? Schreib direkt an den Entwickler – keine Ticket-Systeme, keine Bots.'
              : 'Still have a question? Write directly to the developer – no ticket systems, no bots.'}
          </p>
          <a className="btn btn--ghost reveal" href={`mailto:${PRODUCT.contactEmail}`} data-reveal-delay="140">
            <MailIcon size={16} /> {PRODUCT.contactEmail}
          </a>
        </div>

        <div className="faq__list reveal" data-reveal-delay="80">
          <Accordion items={items} />
        </div>
      </div>
    </section>
  );
}
