import type { LegalDocument } from './types';

/**
 * Standalone withdrawal notice (Widerrufsbelehrung) for consumers in the EU.
 * Kept separate from the AGB so it can be linked, printed and archived on its
 * own – a legal requirement in Germany (§ 312d, § 355 BGB, Art. 246a EGBGB) and
 * useful for every EU market.
 */
export const withdrawal: LegalDocument = {
  slug: 'withdrawal',
  updated: '2026-11-25',
  version: '1.0',
  de: {
    title: 'Widerrufsbelehrung',
    subtitle:
      'Für Verbraucherinnen und Verbraucher in der Europäischen Union – gilt für den Kauf der wAI-Pro-Lizenz.',
    intro: [
      'Diese Belehrung informiert dich über dein gesetzliches Widerrufsrecht beim Kauf der digitalen Pro-Lizenz für die App „wAI“. Sie ergänzt die Allgemeinen Geschäftsbedingungen (AGB).',
      'Die Free-Version der App ist kostenlos. Für sie entsteht kein Vertrag über eine kostenpflichtige Leistung, und es gibt nichts zu widerrufen.',
    ],
    sections: [
      {
        id: 'right',
        title: '1. Widerrufsrecht',
        blocks: [
          {
            type: 'p',
            text: 'Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.',
          },
          {
            type: 'p',
            text: 'Um dein Widerrufsrecht auszuüben, musst du uns mittels einer eindeutigen Erklärung (zum Beispiel ein per E-Mail versandter Brief) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das untenstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.',
          },
          {
            type: 'ul',
            items: [
              'Empfänger: AndrexTheDev, wAI – Umgebungs-Gedächtnisanker',
              'E-Mail: hippie.highho@gmail.com',
              'Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.',
            ],
          },
        ],
      },
      {
        id: 'early-expiry',
        title: '2. Vorzeitiges Erlöschen des Widerrufsrechts bei digitalen Inhalten',
        blocks: [
          {
            type: 'p',
            text: 'Die Pro-Lizenz ist ein digitaler Inhalt, der nicht auf einem körperlichen Datenträger geliefert wird. Dein Widerrufsrecht erlischt daher vorzeitig, wenn wir mit der Ausführung des Vertrags begonnen haben, nachdem du',
          },
          {
            type: 'ol',
            items: [
              'ausdrücklich zugestimmt hast, dass wir mit der Ausführung des Vertrags vor Ablauf der Widerrufsfrist beginnen, und',
              'deine Kenntnis davon bestätigt hast, dass du durch deine Zustimmung mit Beginn der Ausführung des Vertrags dein Widerrufsrecht verlierst.',
            ],
          },
          {
            type: 'p',
            text: 'Diese Zustimmung gibst du in der App aktiv, bevor dir die Zahlungswege angezeigt werden. Ohne Zustimmung wird keine Zahlung angebahnt; die App bleibt im kostenlosen Funktionsumfang nutzbar.',
          },
          {
            type: 'note',
            text: 'Der Zeitpunkt deiner Zustimmung wird ausschließlich lokal auf deinem Gerät gespeichert und nicht an uns übertragen. Du kannst ihn in den Einstellungen einsehen und mit dem Export ausgeben.',
          },
          {
            type: 'p',
            text: 'Wir beginnen mit der Ausführung, sobald der Lizenzschlüssel ausgestellt ist – in der Regel unmittelbar nach Prüfung der Zahlung, spätestens innerhalb von 24 Stunden. Ab diesem Zeitpunkt ist der Widerruf ausgeschlossen. Erfolgt die Freischaltung wider Erwarten nicht innerhalb von 14 Tagen, bleibt dein Widerrufsrecht bestehen.',
          },
        ],
      },
      {
        id: 'voluntary',
        title: '3. Freiwillige Kulanz über das gesetzliche Widerrufsrecht hinaus',
        blocks: [
          {
            type: 'p',
            text: 'Unabhängig von deinem gesetzlichen Widerrufsrecht bieten wir freiwillig Folgendes an:',
          },
          {
            type: 'ul',
            items: [
              'Ist die Pro-Lizenz auf deinem Gerät innerhalb von 14 Tagen nach Freischaltung technisch nicht nutzbar und können wir das Problem nicht beheben, erstatten wir den Kaufpreis.',
              'Bei Doppelzahlung oder versehentlicher Überweisung auf ein falsches Netzwerk erstatten wir den Betrag abzüglich der tatsächlich angefallenen Netzwerkgebühren, soweit die Mittel noch zuordenbar sind.',
              'Wir erstatten immer an eine von dir benannte Wallet-Adresse oder – wo technisch möglich – über den ursprünglichen Zahlungsweg. Netzwerkgebühren für die Rücküberweisung trägt der Empfänger der Erstattung, sofern nicht gesetzlich anders vorgeschrieben.',
            ],
          },
        ],
      },
      {
        id: 'consequences',
        title: '4. Folgen des Widerrufs',
        blocks: [
          {
            type: 'p',
            text: 'Wenn du diesen Vertrag widerrufst, erstatten wir dir alle Zahlungen, die wir von dir erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag, an dem die Mitteilung über deinen Widerruf bei uns eingegangen ist. Für die Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, ausdrücklich etwas anderes wurde vereinbart.',
          },
          {
            type: 'p',
            text: 'Da Krypto-Überweisungen technisch nicht rückgängig gemacht werden können, erfolgt die Erstattung als neue Überweisung an eine von dir benannte Adresse im selben Netzwerk. Dadurch können zusätzliche Netzwerkgebühren entstehen, die nicht erstattet werden.',
          },
          {
            type: 'p',
            text: 'Nach wirksamem Widerruf darfst du die Pro-Funktionen nicht weiter nutzen. Wir können den Lizenzschlüssel in diesem Fall sperren; die App fällt auf den Free-Umfang zurück. Deine lokal gespeicherten Anker bleiben dabei erhalten.',
          },
        ],
      },
      {
        id: 'form',
        title: '5. Muster-Widerrufsformular',
        blocks: [
          {
            type: 'p',
            text: 'Wenn du den Vertrag widerrufen willst, kannst du dieses Formular ausfüllen und per E-Mail an hippie.highho@gmail.com senden. Die Verwendung ist freiwillig.',
          },
          {
            type: 'quote',
            text: 'An AndrexTheDev, wAI – Umgebungs-Gedächtnisanker, hippie.highho@gmail.com:\n\nHiermit widerrufe ich den von mir abgeschlossenen Vertrag über den Kauf der folgenden digitalen Inhalte: wAI Pro-Lizenz.\n\nBestellt am: ______________________\nErhalten am / freigeschaltet am: ______________________\nBestellreferenz (WAI-…): ______________________\nName des Verbrauchers: ______________________\nAnschrift (optional): ______________________\nWallet-Adresse für die Erstattung (Netzwerk): ______________________\nDatum: ______________________\nUnterschrift (nur bei Mitteilung auf Papier): ______________________',
          },
          {
            type: 'note',
            text: 'Ein Widerruf per E-Mail ist ohne Unterschrift wirksam. Bewahre eine Kopie deiner Nachricht auf.',
          },
        ],
      },
      {
        id: 'notes',
        title: '6. Hinweise',
        blocks: [
          {
            type: 'ul',
            items: [
              'Diese Belehrung gilt für Verbraucher im Sinne des § 13 BGB. Unternehmer sind vom Widerrufsrecht ausgenommen.',
              'Für Fragen zum Widerruf erreichst du uns unter hippie.highho@gmail.com – in der Regel antworten wir innerhalb von zwei Werktagen.',
              'Es gilt das Recht der Bundesrepublik Deutschland, soweit dem keine zwingenden Verbraucherschutzvorschriften deines Aufenthaltsstaates entgegenstehen.',
              'Die übrigen Vertragsbestimmungen, insbesondere zu Leistungsumfang, Haftung und Verfügbarkeit, findest du in den AGB.',
            ],
          },
        ],
      },
    ],
    outro: [
      'Hinweis: Diese Widerrufsbelehrung ist ein sorgfältig erstellter Entwurf. Vor dem kommerziellen Einsatz sollte sie gemeinsam mit den AGB von einer Rechtsanwältin oder einem Rechtsanwalt für das tatsächliche Vertriebsland geprüft werden.',
    ],
  },
  en: {
    title: 'Withdrawal Notice',
    subtitle:
      'For consumers in the European Union — applies to the purchase of the wAI Pro licence.',
    intro: [
      'This notice explains your statutory right of withdrawal when buying the digital Pro licence for the app “wAI”. It supplements the Terms of Service.',
      'The free version of the app costs nothing. No paid contract is formed for it, so there is nothing to withdraw.',
    ],
    sections: [
      {
        id: 'right',
        title: '1. Right of withdrawal',
        blocks: [
          {
            type: 'p',
            text: 'You have the right to withdraw from this contract within fourteen days without giving any reason. The withdrawal period is fourteen days from the day the contract is concluded.',
          },
          {
            type: 'p',
            text: 'To exercise your right of withdrawal, you must inform us by means of a clear statement (for example an email) of your decision to withdraw from this contract. You may use the model withdrawal form below, but it is not mandatory.',
          },
          {
            type: 'ul',
            items: [
              'Recipient: AndrexTheDev, wAI – Environmental Memory Anchor',
              'Email: hippie.highho@gmail.com',
              'To meet the withdrawal deadline, it is sufficient that you send your communication before the withdrawal period expires.',
            ],
          },
        ],
      },
      {
        id: 'early-expiry',
        title: '2. Early expiry of the right of withdrawal for digital content',
        blocks: [
          {
            type: 'p',
            text: 'The Pro licence is digital content not supplied on a tangible medium. Your right of withdrawal therefore expires early once we have begun performance, provided that you have',
          },
          {
            type: 'ol',
            items: [
              'expressly consented to us beginning performance before the withdrawal period expires, and',
              'confirmed your awareness that, by consenting, you lose your right of withdrawal upon the start of performance.',
            ],
          },
          {
            type: 'p',
            text: 'You give this consent actively in the app before any payment route is displayed. Without consent no payment is initiated and the app remains usable in its free tier.',
          },
          {
            type: 'note',
            text: 'The time of your consent is stored only locally on your device and is never transmitted to us. You can view it in the settings and include it in your export.',
          },
          {
            type: 'p',
            text: 'We begin performance as soon as the licence key is issued — normally right after payment verification, at the latest within 24 hours. From that moment withdrawal is excluded. If activation unexpectedly does not happen within 14 days, your right of withdrawal remains intact.',
          },
        ],
      },
      {
        id: 'voluntary',
        title: '3. Voluntary goodwill beyond the statutory right',
        blocks: [
          {
            type: 'p',
            text: 'Independently of your statutory right, we voluntarily offer the following:',
          },
          {
            type: 'ul',
            items: [
              'If the Pro licence is technically unusable on your device within 14 days of activation and we cannot fix the problem, we refund the purchase price.',
              'In case of a double payment or a transfer sent on the wrong network, we refund the amount minus the network fees actually incurred, as far as the funds remain attributable.',
              'Refunds are always sent to a wallet address you nominate, or via the original payment route where technically possible. Network fees for the refund transfer are borne by the recipient unless mandatory law provides otherwise.',
            ],
          },
        ],
      },
      {
        id: 'consequences',
        title: '4. Consequences of withdrawal',
        blocks: [
          {
            type: 'p',
            text: 'If you withdraw from this contract, we shall reimburse all payments received from you without undue delay and at the latest within fourteen days from the day on which we received your withdrawal notice. We use the same means of payment you used for the original transaction unless expressly agreed otherwise.',
          },
          {
            type: 'p',
            text: 'Because crypto transfers cannot technically be reversed, reimbursement is made as a new transfer to an address you nominate in the same network. This may incur additional network fees which are not reimbursed.',
          },
          {
            type: 'p',
            text: 'After an effective withdrawal you may no longer use the Pro features. We may block the licence key; the app then returns to the free tier. Anchors stored locally on your device remain intact.',
          },
        ],
      },
      {
        id: 'form',
        title: '5. Model withdrawal form',
        blocks: [
          {
            type: 'p',
            text: 'If you wish to withdraw from the contract, you may complete this form and email it to hippie.highho@gmail.com. Using it is optional.',
          },
          {
            type: 'quote',
            text: 'To AndrexTheDev, wAI – Environmental Memory Anchor, hippie.highho@gmail.com:\n\nI hereby withdraw from the contract concluded by me for the purchase of the following digital content: wAI Pro licence.\n\nOrdered on: ______________________\nReceived / activated on: ______________________\nOrder reference (WAI-…): ______________________\nConsumer name: ______________________\nAddress (optional): ______________________\nRefund wallet address (network): ______________________\nDate: ______________________\nSignature (only for paper notices): ______________________',
          },
          {
            type: 'note',
            text: 'Withdrawal by email is valid without a signature. Keep a copy of your message.',
          },
        ],
      },
      {
        id: 'notes',
        title: '6. Notes',
        blocks: [
          {
            type: 'ul',
            items: [
              'This notice applies to consumers. Businesses are not entitled to a right of withdrawal.',
              'For questions about withdrawal write to hippie.highho@gmail.com — we normally reply within two working days.',
              'German law applies unless mandatory consumer-protection rules of your country of residence prevail.',
              'The remaining contractual terms, in particular scope of services, liability and availability, are set out in the Terms of Service.',
            ],
          },
        ],
      },
    ],
    outro: [
      'Note: this withdrawal notice is a carefully drafted template. Before commercial use it should be reviewed together with the Terms of Service by a lawyer qualified in the actual country of distribution.',
    ],
  },
};
