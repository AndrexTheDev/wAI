import type { LegalDocument } from './types';

/**
 * Terms of Use / AGB – bilingual template. Reviewed structure follows German
 * B2C practice (§§ 305 ff. BGB) while remaining readable for end users.
 */
export const terms: LegalDocument = {
  slug: 'terms',
  updated: '2026-11-25',
  version: '1.0',
  de: {
    title: 'Allgemeine Geschäftsbedingungen (AGB)',
    subtitle: 'Nutzungsbedingungen für die Android-App „wAI“ und die zugehörige Website',
    intro: [
      'Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB“) regeln das Verhältnis zwischen AndrexTheDev (nachfolgend „Anbieter“, „wir“ oder „uns“) und den Nutzerinnen und Nutzern (nachfolgend „Nutzer“ oder „du“) der mobilen Anwendung „wAI – Umgebungs-Gedächtnisanker“ (nachfolgend „App“) sowie der Website wAI.',
      'Mit dem Herunterladen, Installieren, Öffnen oder Nutzen der App erklärst du dich mit diesen AGB einverstanden. Wenn du nicht einverstanden bist, darfst du die App nicht nutzen.',
      'Abweichende oder ergänzende Bedingungen des Nutzers gelten nur, wenn wir ihrer Geltung ausdrücklich schriftlich zugestimmt haben.',
    ],
    sections: [
      {
        id: 'scope',
        title: '1. Geltungsbereich und Vertragsgegenstand',
        blocks: [
          {
            type: 'p',
            text: 'Der Anbieter stellt die App als Werkzeug zur Verfügung, mit dem Nutzer an einem Ort einen sogenannten „Anker“ setzen, diesen mit freiwilligen Zusatzinformationen (u. a. Textnotiz, Foto, Sprachnotiz, Kategorie, Park- und Zoneninformationen) versehen und später offline wiederfinden können.',
          },
          {
            type: 'p',
            text: 'Die App ist ein Orientierungs- und Gedächtniswerkzeug. Sie ist keine Navigations-, Rettungs-, Sicherheits- oder Überwachungsanwendung und ersetzt keine amtlichen Karten, Rettungsdienste oder behördlichen Anweisungen.',
          },
          {
            type: 'ul',
            items: [
              'Vertragsgegenstand ist ausschließlich die Nutzung der App im jeweils bereitgestellten Funktionsumfang.',
              'Ein Anspruch auf Bereitstellung bestimmter Funktionen, auf dauerhafte Verfügbarkeit einzelner Sensoren oder auf eine bestimmte Genauigkeit besteht nicht.',
              'Die Nutzung der App begründet kein Arbeits-, Beratungs-, Rettungs- oder Betreuungsverhältnis.',
            ],
          },
        ],
      },
      {
        id: 'contract',
        title: '2. Vertragsschluss, Lizenzschlüssel und Freischaltung',
        blocks: [
          {
            type: 'p',
            text: 'Die Free-Version kann ohne Registrierung und ohne Zahlung genutzt werden. Der Vertrag über die Nutzung der Free-Version kommt durch die Installation und Nutzung der App zustande.',
          },
          {
            type: 'p',
            text: 'Die Pro-Version wird als Einmal-Lizenz („Lifetime“) angeboten. Der Lizenzvertrag kommt zustande, wenn wir die Zahlung geprüft und dir einen signierten Lizenzschlüssel ausgehändigt haben (per E-Mail oder in der App). Bis zur Freischaltung bleibt die App im Free-Funktionsumfang nutzbar.',
          },
          {
            type: 'ul',
            items: [
              'Lizenzschlüssel sind personengebunden und nicht zur Weitergabe oder zum Weiterverkauf bestimmt.',
              'Lizenzschlüssel werden für die Nutzung auf einer üblichen Anzahl eigener Geräte des Lizenznehmers ausgestellt (in der Regel ein Gerät, Wechsel auf ein Ersatzgerät möglich).',
              'Ein Missbrauch, insbesondere die öffentliche Verbreitung oder der Verkauf eines Lizenzschlüssels, berechtigt uns zur Sperrung des Schlüssels.',
              'Bei Verlust kann der Lizenzschlüssel über die bei der Bestellung verwendete E-Mail-Adresse erneut abgerufen werden.',
            ],
          },
          {
            type: 'note',
            text: 'Das Angebot richtet sich an Verbraucher. Für Unternehmer, Teams und Veranstalter können abweichende Bedingungen gelten; sprich uns dazu bitte an.',
          },
        ],
      },
      {
        id: 'free-pro',
        title: '3. Leistungsumfang Free und Pro',
        blocks: [
          {
            type: 'p',
            text: 'Der Funktionsumfang der Free- und Pro-Version ist in der App und auf der Website beschrieben. Maßgeblich ist die zum Zeitpunkt des Vertragsschlusses veröffentlichte Beschreibung.',
          },
          {
            type: 'table',
            head: ['Funktion', 'Free', 'Pro'],
            rows: [
              ['Offline-Nutzung der Kernfunktionen', 'Ja', 'Ja'],
              ['Gleichzeitige aktive Anker', 'bis 3', 'unbegrenzt'],
              ['Notizen pro Anker', '1 Foto oder Text', 'unbegrenzt'],
              ['Richtungs- und Distanz-Kompass', 'Ja', 'Ja'],
              ['Etagen- und Höhen-Lotse', 'Ja', 'Ja'],
              ['Brotkrumen-Spur', 'Nein', 'Ja'],
              ['Multi-Ansicht', 'Nein', 'Ja'],
              ['Sprachnotizen', 'Nein', 'Ja'],
              ['Näher-dran-Feedback (Vibration/Ton)', 'Nein', 'Ja'],
              ['Park-Timer mit Erinnerungen', 'Nein', 'Ja'],
              ['Teilen inkl. Medienpaket', 'Nein', 'Ja'],
              ['Favoriten und Archiv', 'Nein', 'Ja'],
            ],
          },
          {
            type: 'p',
            text: 'Wir behalten uns vor, den Funktionsumfang der Free-Version aus technischen oder wirtschaftlichen Gründen anzupassen. Eine bereits erworbene Pro-Lizenz bleibt in ihrem zum Kaufzeitpunkt zugesagten Umfang bestehen.',
          },
        ],
      },
      {
        id: 'crypto',
        title: '4. Zahlung mit Krypto-Währungen',
        blocks: [
          {
            type: 'p',
            text: 'Für die Pro-Lizenz sowie für freiwillige Unterstützungszahlungen bieten wir die direkte Zahlung in Krypto-Währungen (Solana/SOL, Bitcoin/BTC, Ethereum/ETH) an die im Bestellprozess genannten Wallet-Adressen des Anbieters an. Die Zahlung erfolgt non-custodial und direkt zwischen dir und dem Anbieter; ein Zahlungsdienstleister oder Treuhänder ist nicht beteiligt.',
          },
          {
            type: 'ol',
            items: [
              'Du wählst die Krypto-Währung und sendest den im Bestellprozess angezeigten Betrag an die angezeigte Adresse.',
              'Du prüfst Adresse und Netzwerk vor dem Absenden sorgfältig. Adressen sind lang und können nicht rückgängig gemacht werden.',
              'Du übermittelst uns die Transaktions-ID über das dafür vorgesehene Formular oder per E-Mail an hippie.highho@gmail.com.',
              'Nach Prüfung der Zahlung (in der Regel innerhalb von 1–3 Werktagen) erhältst du einen signierten Lizenzschlüssel.',
            ],
          },
          {
            type: 'ul',
            items: [
              'Der angezeigte Fiat-Gegenwert ist eine unverbindliche Orientierung. Maßgeblich ist der tatsächlich gesendete Betrag in der jeweiligen Krypto-Währung; Kursschwankungen zwischen Anzeige und Zahlung gehen zu deinen Lasten.',
              'Netzwerkgebühren (Gas, Transaktionsgebühren) trägt der Nutzer zusätzlich. Diese Gebühren erhält der Anbieter nicht.',
              'Krypto-Transaktionen sind technisch endgültig. Eine Rückabwicklung auf der Blockchain ist nicht möglich. Erstattungen erfolgen, wenn überhaupt, nur durch eine neue Transaktion des Anbieters.',
              'Bei Zahlung über ein falsches Netzwerk, eine falsche Adresse, einen falschen Betrag oder ohne ausreichende Transaktionsangaben kann eine Zuordnung unmöglich sein. Ein Anspruch auf Freischaltung besteht in diesem Fall nicht; wir bemühen uns jedoch um eine Lösung im Rahmen des technisch Möglichen.',
              'Du bist selbst dafür verantwortlich, die für dich geltenden steuerlichen Pflichten im Zusammenhang mit Krypto-Zahlungen zu erfüllen.',
              'Der Anbieter tauscht Krypto-Beträge nicht in Fiat-Währung und bietet keine Krypto-Verwahrung (keine Custody) an.',
            ],
          },
          {
            type: 'note',
            text: 'Sicherheitshinweis: Wir fragen niemals nach Seed-Phrasen, privaten Schlüsseln oder Passwörtern deiner Wallet. Ignoriere entsprechende Nachrichten, auch wenn sie scheinbar von uns stammen.',
          },
        ],
      },
      {
        id: 'withdrawal',
        title: '5. Widerrufsrecht für Verbraucher',
        blocks: [
          {
            type: 'p',
            text: 'Verbrauchern steht grundsätzlich ein gesetzliches Widerrufsrecht von vierzehn Tagen ab Vertragsschluss zu. Die vollständige Belehrung einschließlich Muster-Widerrufsformular ist als eigenständiges Dokument „Widerrufsbelehrung“ veröffentlicht und ist Bestandteil dieser AGB.',
          },
          {
            type: 'p',
            text: 'Die Pro-Lizenz ist ein digitaler Inhalt, der nicht auf einem körperlichen Datenträger geliefert wird. Dein Widerrufsrecht erlischt daher vorzeitig, wenn wir mit der Ausführung begonnen haben, nachdem du ausdrücklich zugestimmt hast, dass wir vor Ablauf der Widerrufsfrist beginnen, und du bestätigt hast, dass du dadurch dein Widerrufsrecht verlierst. Diese Zustimmung erteilst du in der App aktiv, bevor dir Zahlungswege angezeigt werden; der Zeitpunkt wird ausschließlich lokal gespeichert.',
          },
          {
            type: 'ul',
            items: [
              'Erstattungen erfolgen innerhalb von vierzehn Tagen nach Erhalt eines wirksamen Widerrufs an eine von dir benannte Wallet-Adresse im selben Netzwerk.',
              'Da Krypto-Überweisungen nicht rückgängig gemacht werden können, entstehen bei der Rücküberweisung gegebenenfalls zusätzliche Netzwerkgebühren; diese werden nicht erstattet.',
              'Der Erstattungsbetrag entspricht dem Gegenwert des zum Zeitpunkt des Widerrufs gesendeten Krypto-Betrags; netzwerkbedingte Wertveränderungen zwischen Zahlung und Rücküberweisung können nicht ausgeglichen werden.',
              'Unabhängig davon erstatten wir freiwillig, wenn die Lizenz innerhalb von 14 Tagen nach Freischaltung auf deinem Gerät technisch nicht nutzbar ist und wir das Problem nicht beheben können.',
            ],
          },
          {
            type: 'p',
            text: 'Freiwillige Unterstützungszahlungen ohne Gegenleistung sind keine entgeltlichen Verträge im Sinne des Widerrufsrechts; eine Rückerstattung erfolgt hier nur aus Kulanz.',
          },
        ],
      },
      {
        id: 'availability',
        title: '6. Verfügbarkeit, Updates und Änderungen',
        blocks: [
          {
            type: 'ul',
            items: [
              'Wir bemühen uns um eine hohe Verfügbarkeit der App, schulden aber keine ununterbrochene Bereitstellung.',
              'Updates können erforderlich sein, um die App mit neuen Android-Versionen, Sicherheitsanforderungen oder Geräten kompatibel zu halten.',
              'Wir können die App weiterentwickeln, Funktionen ändern oder einstellen. Wesentliche Einschränkungen bereits erworbener Pro-Funktionen werden wir vorab ankündigen, soweit dies zumutbar ist.',
              'Die Kernfunktionen sind auf Offline-Betrieb ausgelegt. Nur die eigentliche Zahlung findet außerhalb der App in deiner Wallet statt; die Lizenzaktivierung und alle App-Funktionen arbeiten ohne Internetverbindung. Eine Verbindung wird lediglich für den Bezug von Updates und für den Aufruf der Rechtstexte auf der Website benötigt.',
              'Wir können die Bereitstellung der App insgesamt einstellen. In diesem Fall bemühen wir uns, eine letzte, funktionsfähige Version und eine Exportmöglichkeit für deine Daten bereitzustellen.',
            ],
          },
        ],
      },
      {
        id: 'obligations',
        title: '7. Pflichten und Verhalten des Nutzers',
        blocks: [
          {
            type: 'ul',
            items: [
              'Du nutzt die App nur im Rahmen der geltenden Gesetze und dieser AGB.',
              'Du versuchst nicht, die Lizenzprüfung zu umgehen, die App zu dekompilieren (soweit nicht gesetzlich zulässig), Sicherheitsmechanismen zu entfernen oder Dritte unberechtigt freizuschalten.',
              'Du lädst keine rechtswidrigen, gewaltverherrlichenden, kinderpornografischen oder die Rechte Dritter verletzenden Inhalte in die App.',
              'Du beachtest bei der Nutzung im Straßenverkehr, im Gelände, auf Veranstaltungen und in fremden oder privaten Arealen die jeweils geltenden Regeln (u. a. StVO, Hausrecht, Naturschutzrecht, Betretungsverbote).',
              'Du bist für die Sicherung deiner Gerätedaten (Sperrbildschirm, Verschlüsselung, Backups) selbst verantwortlich.',
            ],
          },
        ],
      },
      {
        id: 'liability',
        title: '8. Haftung',
        blocks: [
          {
            type: 'p',
            text: 'Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit. Bei einfacher Fahrlässigkeit haften wir nur für die Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht), deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Nutzer regelmäßig vertrauen darf. In diesem Fall ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt.',
          },
          {
            type: 'p',
            text: 'Eine Haftung nach dem Produkthaftungsgesetz sowie für die Verletzung von Garantien bleibt unberührt. Eine weitergehende Haftung ist ausgeschlossen.',
          },
          {
            type: 'ul',
            items: [
              'Wir haften nicht für Schäden, die daraus entstehen, dass Angaben der App (Richtung, Entfernung, Höhe, Etage, Spur) ungenau, verzögert, unvollständig oder nicht verfügbar sind.',
              'Wir haften nicht für Entscheidungen, die der Nutzer auf Grundlage der App in Verkehr, Gelände, Wasser, Baustellen, Veranstaltungen oder Gefahrensituationen trifft.',
              'Wir haften nicht für den Verlust lokal gespeicherter Daten, insbesondere bei Geräteverlust, Defekt, Deinstallation, Werksreset, Speicherbereinigung durch das Betriebssystem oder fehlerhafte Backups.',
              'Wir haften nicht für Handlungen von Dritten, insbesondere für fehlerhafte oder betrügerische Krypto-Überweisungen an falsche Adressen.',
              'Die vorstehenden Beschränkungen gelten nicht, soweit wir einen Mangel arglistig verschwiegen oder eine Beschaffenheitsgarantie übernommen haben.',
            ],
          },
          {
            type: 'note',
            text: 'Für alle Fragen der Orientierung in gefährlichen Situationen gilt: Rufe den Rettungsdienst (in der EU 112), nutze offizielle Rettungsmittel und verlasse dich nicht allein auf eine App.',
          },
        ],
      },
      {
        id: 'privacy',
        title: '9. Datenschutz',
        blocks: [
          {
            type: 'p',
            text: 'Die App speichert Standortdaten, Notizen, Fotos und Sprachnotizen ausschließlich lokal auf deinem Gerät. Es besteht keine Kontopflicht, kein Server-Backend und keine Cloud-Synchronisation.',
          },
          {
            type: 'p',
            text: 'Einzelheiten zu Berechtigungen, Speicherfristen und deinen Rechten findest du im Datenschutzhinweis. Er ist Bestandteil dieser AGB, soweit er nicht abweicht; im Konfliktfall gehen die gesetzlichen Datenschutzvorschriften und der Datenschutzhinweis vor.',
          },
        ],
      },
      {
        id: 'ip',
        title: '10. Urheberrecht und Nutzungsrechte',
        blocks: [
          {
            type: 'p',
            text: 'Die App, ihr Code, ihre Gestaltung, Texte und Grafiken sind urheberrechtlich geschützt. Der Anbieter räumt dir ein einfaches, nicht übertragbares, nicht unterlizenzierbares Recht ein, die App auf deinen eigenen Geräten für private und berufliche Zwecke zu nutzen.',
          },
          {
            type: 'ul',
            items: [
              'Die vom Nutzer erstellten Inhalte (Notizen, Fotos, Sprachnotizen) bleiben Eigentum des Nutzers.',
              'Eine Weitergabe der App, eine öffentliche Zugänglichmachung oder eine kommerzielle Weiterverbreitung ist ohne Zustimmung nicht gestattet.',
              'Marke, Name und Logo „wAI“ dürfen nicht ohne Zustimmung für eigene Produkte oder Werbung verwendet werden.',
            ],
          },
        ],
      },
      {
        id: 'changes',
        title: '11. Änderung dieser AGB',
        blocks: [
          {
            type: 'p',
            text: 'Wir können diese AGB ändern, wenn dies aus rechtlichen, technischen oder organisatorischen Gründen erforderlich ist und der Nutzer hierdurch nicht unangemessen benachteiligt wird. Änderungen werden in der App oder auf der Website mit dem Datum der Aktualisierung veröffentlicht. Widerspricht der Nutzer nicht innerhalb von sechs Wochen nach Bekanntgabe, gelten die geänderten Bedingungen als angenommen. Auf die Widerspruchsmöglichkeit und die Frist wird bei Bekanntgabe gesondert hingewiesen.',
          },
          {
            type: 'p',
            text: 'Bereits erworbene Pro-Lizenzen bleiben von Änderungen unberührt, soweit nicht zwingende gesetzliche Gründe entgegenstehen.',
          },
        ],
      },
      {
        id: 'final',
        title: '12. Schlussbestimmungen',
        blocks: [
          {
            type: 'ul',
            items: [
              'Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Zwingende Verbraucherschutzvorschriften des Aufenthaltsstaats des Nutzers bleiben unberührt.',
              'Gerichtsstand für Kaufleute, juristische Personen des öffentlichen Rechts und Personen ohne allgemeinen Gerichtsstand in Deutschland ist der Sitz des Anbieters. Für Verbraucher gelten die gesetzlichen Gerichtsstände.',
              'Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit. Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
              'Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen Bestimmung tritt die gesetzliche Regelung.',
              'Sprache dieser AGB ist Deutsch. Die englische Fassung dient der Verständlichkeit; im Zweifel ist die deutsche Fassung maßgeblich, soweit zwingendes Recht nicht entgegensteht.',
            ],
          },
        ],
      },
      {
        id: 'contact',
        title: '13. Kontakt',
        blocks: [
          {
            type: 'p',
            text: 'Anbieter: AndrexTheDev. E-Mail: hippie.highho@gmail.com. Weitere Angaben findest du im Impressum.',
          },
        ],
      },
    ],
    outro: [
      'Diese AGB sind ein sorgfältig erstellter Entwurf für eine kommerzielle App. Vor dem produktiven Einsatz sollten sie anwaltlich geprüft werden, insbesondere im Hinblick auf die konkrete Ausgestaltung der Krypto-Zahlungen, die Zielmärkte und die jeweils anwendbaren Verbraucherschutzvorschriften.',
    ],
  },
  en: {
    title: 'Terms of Use',
    subtitle: 'Terms and conditions for the “wAI” Android app and the related website',
    intro: [
      'These Terms of Use (the “Terms”) govern the relationship between AndrexTheDev (the “provider”, “we”, “us”) and the users (the “user”, “you”) of the mobile application “wAI – Environmental Memory Anchor” (the “app”) and the wAI website.',
      'By downloading, installing, opening or using the app you agree to these Terms. If you do not agree, you may not use the app.',
      'Deviating or supplementary terms proposed by the user apply only if we have expressly agreed to them in writing.',
    ],
    sections: [
      {
        id: 'scope',
        title: '1. Scope and subject matter',
        blocks: [
          {
            type: 'p',
            text: 'The provider makes the app available as a tool that lets users drop a so-called “anchor” at a location, enrich it with optional information (including text notes, photos, voice notes, categories and parking/zone details) and find it again later, offline.',
          },
          {
            type: 'p',
            text: 'The app is an orientation and memory tool. It is not a navigation, rescue, safety or surveillance application and does not replace official maps, emergency services or authority instructions.',
          },
          {
            type: 'ul',
            items: [
              'The subject matter of the contract is solely the use of the app within the feature set provided at any given time.',
              'There is no entitlement to specific features, to the permanent availability of individual sensors, or to any particular level of accuracy.',
              'Use of the app does not create an employment, advisory, rescue or caretaking relationship.',
            ],
          },
        ],
      },
      {
        id: 'contract',
        title: '2. Formation of contract, licence keys and unlocking',
        blocks: [
          {
            type: 'p',
            text: 'The free version can be used without registration and without payment. The contract for use of the free version is concluded by installing and using the app.',
          },
          {
            type: 'p',
            text: 'The Pro version is offered as a one-time (lifetime) licence. The licence contract is concluded when we have verified the payment and provided you with a signed licence key (by email or in the app). Until the unlock is completed, the app remains usable with the free feature set.',
          },
          {
            type: 'ul',
            items: [
              'Licence keys are personal and are not intended for disclosure or resale.',
              'Licence keys are issued for use on a customary number of the licensee’s own devices (generally one device, with the option to move to a replacement device).',
              'Misuse – in particular publicly distributing or selling a licence key – entitles us to revoke the key.',
              'If a key is lost, it can be retrieved again using the email address used for the order.',
            ],
          },
          {
            type: 'note',
            text: 'The offer is aimed at consumers. Different terms may apply to businesses, teams and event organisers; please contact us.',
          },
        ],
      },
      {
        id: 'free-pro',
        title: '3. Scope of the free and Pro versions',
        blocks: [
          {
            type: 'p',
            text: 'The feature set of the free and Pro versions is described in the app and on the website. The description published at the time the contract is concluded is decisive.',
          },
          {
            type: 'table',
            head: ['Feature', 'Free', 'Pro'],
            rows: [
              ['Offline use of the core features', 'Yes', 'Yes'],
              ['Simultaneous active anchors', 'up to 3', 'unlimited'],
              ['Notes per anchor', '1 photo or text', 'unlimited'],
              ['Direction & distance compass', 'Yes', 'Yes'],
              ['Floor & elevation beam', 'Yes', 'Yes'],
              ['Breadcrumb trail', 'No', 'Yes'],
              ['Multi-view', 'No', 'Yes'],
              ['Voice notes', 'No', 'Yes'],
              ['Getting-closer feedback (vibration/tone)', 'No', 'Yes'],
              ['Parking timer with reminders', 'No', 'Yes'],
              ['Sharing incl. media pack', 'No', 'Yes'],
              ['Favourites and archive', 'No', 'Yes'],
            ],
          },
          {
            type: 'p',
            text: 'We reserve the right to adjust the scope of the free version for technical or commercial reasons. A Pro licence already purchased remains valid in the scope promised at the time of purchase.',
          },
        ],
      },
      {
        id: 'crypto',
        title: '4. Payment in cryptocurrencies',
        blocks: [
          {
            type: 'p',
            text: 'For the Pro licence and for voluntary support payments we offer direct payment in cryptocurrencies (Solana/SOL, Bitcoin/BTC, Ethereum/ETH) to the provider wallet addresses shown in the order process. Payment is non-custodial and made directly between you and the provider; no payment processor or escrow agent is involved.',
          },
          {
            type: 'ol',
            items: [
              'You choose the cryptocurrency and send the amount shown in the order process to the address displayed.',
              'You check the address and network carefully before sending. Crypto transfers cannot be reversed.',
              'You send us the transaction ID via the dedicated form or by email to hippie.highho@gmail.com.',
              'After the payment has been verified (usually within 1–3 business days) you receive a signed licence key.',
            ],
          },
          {
            type: 'ul',
            items: [
              'The displayed fiat equivalent is a non-binding guide. The amount actually sent in the relevant cryptocurrency is decisive; exchange-rate movements between display and payment are borne by you.',
              'Network fees (gas, transaction fees) are paid by the user in addition. The provider does not receive these fees.',
              'Crypto transactions are technically final. Reversal on the blockchain is not possible. Refunds, where granted, are made only by a new transaction from the provider.',
              'If a payment is made on the wrong network, to the wrong address, in the wrong amount or without sufficient transaction details, allocation may be impossible. There is no entitlement to unlocking in that case; we will nevertheless try to find a solution within what is technically possible.',
              'You are responsible for complying with any tax obligations that apply to you in connection with crypto payments.',
              'The provider does not exchange crypto amounts into fiat currency and does not provide crypto custody services.',
            ],
          },
          {
            type: 'note',
            text: 'Security notice: we never ask for seed phrases, private keys or wallet passwords. Ignore any message that does so, even if it appears to come from us.',
          },
        ],
      },
      {
        id: 'withdrawal',
        title: '5. Right of withdrawal for consumers',
        blocks: [
          {
            type: 'p',
            text: 'Consumers generally have a statutory right of withdrawal of fourteen days from conclusion of the contract. The full notice, including the model withdrawal form, is published as a separate document ("Withdrawal Notice") and forms part of these Terms.',
          },
          {
            type: 'p',
            text: 'The Pro licence is digital content not supplied on a tangible medium. Your right of withdrawal therefore expires early once we have begun performance, provided you have expressly consented to us starting before the withdrawal period expires and confirmed that you thereby lose your right of withdrawal. You give this consent actively in the app before any payment route is displayed; the time is stored locally only.',
          },
          {
            type: 'ul',
            items: [
              'Refunds are made within fourteen days of receiving an effective withdrawal to a wallet address you nominate in the same network.',
              'Because crypto transfers cannot be reversed, the refund transfer may incur additional network fees which are not reimbursed.',
              'The refund amount corresponds to the value of the crypto amount sent at the time of withdrawal; network-related value changes between payment and refund cannot be compensated.',
              'Independently of the above, we voluntarily refund if the licence is technically unusable on your device within 14 days of activation and we cannot resolve the problem.',
            ],
          },
          {
            type: 'p',
            text: 'Voluntary support payments without any return service are not paid contracts within the meaning of withdrawal rights; refunds here are granted on a goodwill basis only.',
          },
        ],
      },
      {
        id: 'availability',
        title: '6. Availability, updates and changes',
        blocks: [
          {
            type: 'ul',
            items: [
              'We strive for high availability of the app but do not owe uninterrupted provision.',
              'Updates may be required to keep the app compatible with new Android versions, security requirements or devices.',
              'We may further develop the app and change or discontinue features. Material reductions of already purchased Pro features will be announced in advance where reasonable.',
              'The core features are designed for offline operation. Only the payment itself happens outside the app (in your wallet); licence activation and all app functions work without an internet connection. An internet connection is only needed to download updates and to reach the legal pages on the website.',
              'We may discontinue distribution of the app entirely. In that case we will endeavour to provide a final working version and a way to export your data.',
            ],
          },
        ],
      },
      {
        id: 'obligations',
        title: '7. User obligations and conduct',
        blocks: [
          {
            type: 'ul',
            items: [
              'You use the app only in accordance with applicable law and these Terms.',
              'You do not attempt to circumvent the licence check, decompile the app (except where legally permitted), remove security mechanisms or unlock third parties without authorisation.',
              'You do not store unlawful content, content glorifying violence, child sexual abuse material or content infringing third-party rights in the app.',
              'When using the app in traffic, in the outdoors, at events or on third-party or private premises you comply with the applicable rules (including road traffic law, property rights, nature conservation law and access restrictions).',
              'You are responsible for securing your device data (screen lock, encryption, backups).',
            ],
          },
        ],
      },
      {
        id: 'liability',
        title: '8. Liability',
        blocks: [
          {
            type: 'p',
            text: 'We are liable without limitation for intent and gross negligence and for damage to life, body or health. For simple negligence we are liable only for breach of a material contractual obligation (cardinal duty) whose performance is essential to the proper execution of the contract and on whose observance the user may regularly rely. In that case liability is limited to the foreseeable damage typical for the contract.',
          },
          {
            type: 'p',
            text: 'Liability under the German Product Liability Act and for breach of guarantees remains unaffected. Any further liability is excluded.',
          },
          {
            type: 'ul',
            items: [
              'We are not liable for damage arising from app information (direction, distance, elevation, floor, trail) being inaccurate, delayed, incomplete or unavailable.',
              'We are not liable for decisions the user makes on the basis of the app in traffic, in the outdoors, on water, on construction sites, at events or in hazardous situations.',
              'We are not liable for loss of locally stored data, in particular in the event of device loss, defect, uninstallation, factory reset, operating-system storage clean-up or faulty backups.',
              'We are not liable for the acts of third parties, in particular incorrect or fraudulent crypto transfers to wrong addresses.',
              'The above limitations do not apply where we have fraudulently concealed a defect or assumed a guarantee of quality.',
            ],
          },
          {
            type: 'note',
            text: 'For any question of orientation in a dangerous situation: call the emergency services (112 in the EU), use official rescue resources and do not rely on an app alone.',
          },
        ],
      },
      {
        id: 'privacy',
        title: '9. Privacy',
        blocks: [
          {
            type: 'p',
            text: 'The app stores location data, notes, photos and voice notes exclusively on your device. There is no account requirement, no server backend and no cloud synchronisation.',
          },
          {
            type: 'p',
            text: 'Details on permissions, retention and your rights are set out in the Privacy Notice, which forms part of these Terms. In case of conflict, statutory data protection law and the Privacy Notice prevail.',
          },
        ],
      },
      {
        id: 'ip',
        title: '10. Copyright and rights of use',
        blocks: [
          {
            type: 'p',
            text: 'The app, its code, design, texts and graphics are protected by copyright. The provider grants you a simple, non-transferable, non-sublicensable right to use the app on your own devices for private and professional purposes.',
          },
          {
            type: 'ul',
            items: [
              'Content created by the user (notes, photos, voice notes) remains the property of the user.',
              'Redistribution of the app, making it publicly available or commercial re-distribution is not permitted without consent.',
              'The brand, name and logo “wAI” may not be used for your own products or advertising without consent.',
            ],
          },
        ],
      },
      {
        id: 'changes',
        title: '11. Changes to these Terms',
        blocks: [
          {
            type: 'p',
            text: 'We may amend these Terms where this is necessary for legal, technical or organisational reasons and the user is not unreasonably disadvantaged. Changes are published in the app or on the website with the date of update. If the user does not object within six weeks of notification, the amended terms are deemed accepted. The right to object and the deadline are pointed out separately when the change is announced.',
          },
          {
            type: 'p',
            text: 'Pro licences already purchased remain unaffected by changes unless mandatory statutory grounds require otherwise.',
          },
        ],
      },
      {
        id: 'final',
        title: '12. Final provisions',
        blocks: [
          {
            type: 'ul',
            items: [
              'The law of the Federal Republic of Germany applies, excluding the UN Convention on Contracts for the International Sale of Goods. Mandatory consumer protection rules of the user’s country of residence remain unaffected.',
              'The place of jurisdiction for merchants, legal entities under public law and persons without a general place of jurisdiction in Germany is the provider’s seat. Statutory jurisdictions apply to consumers.',
              'The European Commission provides a platform for online dispute resolution (ODR). We are neither obliged nor willing to participate in dispute resolution proceedings before a consumer arbitration board.',
              'Should any provision of these Terms be invalid, the validity of the remaining provisions remains unaffected. The statutory rule replaces the invalid provision.',
              'The governing language of these Terms is German. The English version is provided for convenience; in case of doubt the German version prevails, unless mandatory law provides otherwise.',
            ],
          },
        ],
      },
      {
        id: 'contact',
        title: '13. Contact',
        blocks: [
          {
            type: 'p',
            text: 'Provider: AndrexTheDev. Email: hippie.highho@gmail.com. Further details are available in the imprint.',
          },
        ],
      },
    ],
    outro: [
      'These Terms are a carefully drafted template for a commercial app. Before going live they should be reviewed by a lawyer, in particular with regard to the specific design of the crypto payments, the target markets and the consumer protection rules that apply.',
    ],
  },
};
