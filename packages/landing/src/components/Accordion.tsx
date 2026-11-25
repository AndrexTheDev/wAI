import { useId, useState } from 'react';
import { ChevronDownIcon } from './Icons';

export interface AccordionItem {
  q: string;
  a: string;
}

export function Accordion({ items, defaultOpen = 0 }: { items: AccordionItem[]; defaultOpen?: number }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const baseId = useId();

  return (
    <div className="accordion">
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `${baseId}-panel-${index}`;
        const triggerId = `${baseId}-trigger-${index}`;
        return (
          <div className="accordion__item" key={item.q}>
            <h3>
              <button
                type="button"
                id={triggerId}
                className="accordion__trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : index)}
              >
                <span>{item.q}</span>
                <ChevronDownIcon size={18} />
              </button>
            </h3>
            <div
              className="accordion__panel"
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              data-open={isOpen}
              hidden={!isOpen}
            >
              <div>
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
