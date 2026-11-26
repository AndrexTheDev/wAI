import { useState } from 'react';
import { PRODUCT, WALLET_LIST, tArray } from '@wai/shared';
import { useT } from '../i18n/useT';
import { Sheet } from '../ui/Sheet';
import { openExternal } from '../platform/links';
import { ChevronDown, Info, Mail, Shield } from '../ui/icons';

interface FaqItem {
  q: string;
  a: string;
}

/**
 * In-app help centre.
 *
 * Replaces the previous three marketing steps. Everything here is bundled, so it
 * works in a basement with no signal — which is exactly where people open it.
 * Structure: the four questions that actually block people, then the honesty
 * section about what the app cannot do.
 */
export function HelpSheet({ onClose, onOpenPro }: { onClose: () => void; onOpenPro?: () => void }) {
  const { t, locale } = useT();
  const [open, setOpen] = useState<number | null>(0);
  const steps = tArray<{ title: string; body: string }>(locale, 'landing.how.steps');
  const faq = tArray<FaqItem>(locale, 'landing.faq.items');

  return (
    <Sheet open onClose={onClose} title={t('app.help.title')} footer={<button type="button" className="btn btn--primary btn--block" onClick={onClose}>{t('common.ctaClose')}</button>}>
      <p className="muted">{t('app.help.intro')}</p>

      {/* The three-step path – what to do, in order. */}
      <div className="help-steps">
        {steps.map((step, index) => (
          <div key={step.title} className="help-step">
            <span className="help-step__num">{index + 1}</span>
            <div>
              <div className="help-step__title">{step.title}</div>
              <p className="help-step__body">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="help__section">{t('app.help.faqTitle')}</h3>
      <div className="help-accordion">
        {faq.map((item, index) => {
          const isOpen = open === index;
          return (
            <div key={item.q} className={`help-item ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="help-item__q"
                onClick={() => setOpen(isOpen ? null : index)}
                aria-expanded={isOpen}
              >
                <span>{item.q}</span>
                <ChevronDown size={15} />
              </button>
              {isOpen && <p className="help-item__a">{item.a}</p>}
            </div>
          );
        })}
      </div>

      {/* Honesty section: legally relevant and genuinely useful. */}
      <div className="card help-warning">
        <div className="card__head">
          <span className="card__title">
            <Shield size={14} /> {t('app.help.notTitle')}
          </span>
        </div>
        <ul className="help-list">
          {[0, 1, 2].map((index) => (
            <li key={index}>
              <Info size={12} />
              <span>{t(`app.help.not${index}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="card__head">
          <span className="card__title">{t('app.help.sensorsTitle')}</span>
        </div>
        <p className="muted">{t('app.help.sensorsBody')}</p>
      </div>

      {onOpenPro && (
        <button type="button" className="btn btn--ghost btn--block" onClick={onOpenPro}>
          {t('app.help.proCta')}
        </button>
      )}

      <button
        type="button"
        className="btn btn--quiet btn--block"
        onClick={() => void openExternal(`mailto:${PRODUCT.contactEmail}?subject=${encodeURIComponent('wAI')}`)}
      >
        <Mail size={14} /> {t('app.help.contact')}
      </button>
      <p className="help__meta">
        {t('app.help.version', { version: PRODUCT.version })} · {WALLET_LIST.length} {locale === 'de' ? 'Zahlungswege' : 'payment routes'}
      </p>
    </Sheet>
  );
}
