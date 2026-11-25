import type { LegalDocument } from './types';

/**
 * Privacy Notice / Datenschutzhinweis. Written to describe an app that has no
 * backend: the only processing happens on-device, plus an email channel for
 * support and licence delivery.
 */
export const privacy: LegalDocument = {
  slug: 'privacy',
  updated: '2026-11-25',
  version: '1.0',
  de: {
    title: 'Datenschutzhinweis',
    subtitle: 'Wie wAI mit deinen Daten umgeht – kurz gesagt: so wenig wie möglich, so lokal wie möglich.',
    intro: [
      'Diese Datenschutzhinweise informieren dich gemäß Art. 13 und 14 DSGVO darüber, welche personenbezogenen Daten beim Besuch dieser Website und bei der Nutzung der Android-App „wAI“ verarbeitet werden, zu welchem Zweck und auf welcher Rechtsgrundlage.',
      'Kurzfassung: wAI hat kein Nutzerkonto, keinen Server, keine Cloud, kein Tracking und keine Werbung. Deine Anker, Fotos, Sprachnotizen und Verläufe bleiben auf deinem Gerät. Wir erhalten sie nicht.',
      'Verantwortlicher im Sinne der DSGVO ist AndrexTheDev, Kontakt: hippie.highho@gmail.com.',
    ],
    sections: [
      {
        id: 'controller',
        title: '1. Verantwortlicher',
        blocks: [
          {
            type: 'p',
            text: 'AndrexTheDev (Einzelentwickler), Kontakt: hippie.highho@gmail.com. Vollständige Anbieterangaben findest du im Impressum.',
          },
          {
            type: 'p',
            text: 'Ein Datenschutzbeauftragter ist gesetzlich nicht erforderlich und nicht bestellt. Datenschutzanfragen kannst du direkt an die genannte E-Mail-Adresse richten.',
          },
        ],
      },
      {
        id: 'principles',
        title: '2. Grundprinzipien: lokal, sparsam, offline',
        blocks: [
          {
            type: 'ul',
            items: [
              'Keine Konten, keine Registrierung, kein Login.',
              'Keine Übertragung von Ankerdaten, Fotos, Sprachnotizen oder Verläufen an uns oder Dritte.',
              'Keine Analyse-, Werbe- oder Crash-Reporting-SDKs von Drittanbietern.',
              'Keine Cloud-Synchronisation. Backups erfolgen nur, wenn du sie selbst über dein Android-System einrichtest.',
              'Die Kernfunktionen arbeiten vollständig offline.',
            ],
          },
          {
            type: 'note',
            text: 'Wenn du ein Android-Backup (z. B. Google Drive) für deine Gerätedaten aktiviert hast, können App-Daten im Rahmen dieses Systembackups gesichert werden. Das ist eine Funktion deines Betriebssystems, nicht der App; die Kontrolle darüber liegt bei dir in den Android-Einstellungen.',
          },
        ],
      },
      {
        id: 'app-data',
        title: '3. Datenverarbeitung in der App',
        blocks: [
          {
            type: 'h3',
            text: '3.1 Lokal gespeicherte Daten',
          },
          {
            type: 'p',
            text: 'Die App speichert auf deinem Gerät: Ankerpunkte (Breiten- und Längengrad, Höhe, Genauigkeit), Titel, Kategorien, Textnotizen, Fotos, Sprachnotizen, Zonen- und Parkinformationen, optional aufgezeichnete Wegspuren, Favoriten, Archivstatus sowie Zeitstempel. Diese Daten werden in einer lokalen Datenbank und im app-eigenen Dateispeicher abgelegt.',
          },
          {
            type: 'ul',
            items: [
              'Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der von dir angeforderten Funktion) bzw. deine Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO für die Nutzung von Standort, Kamera und Mikrofon.',
              'Speicherdauer: bis du den Anker löschst, die App deinstallierst oder die Daten in den Einstellungen entfernst. Wir haben keinen Zugriff und keine Kopie.',
              'Empfänger: keine. Es findet keine Übermittlung an uns oder an Dritte statt.',
            ],
          },
          {
            type: 'h3',
            text: '3.2 Standortdaten',
          },
          {
            type: 'p',
            text: 'Beim Setzen eines Ankers und bei der Rückführung wird der Gerätestandort über GPS, WLAN- und Mobilfunk-basierte Ortung des Betriebssystems ermittelt. Die Ortung wird durch dich ausgelöst (Anker setzen, Rückführung starten). Es gibt keine Hintergrund-Ortung, kein Geofencing im Hintergrund und keine Weitergabe an uns.',
          },
          {
            type: 'p',
            text: 'Bewegungs- und Lagesensoren (Beschleunigung, Gyroskop, Magnetometer, Barometer, Schrittzähler) werden während der Nutzung der Rückführung ausgelesen, um Richtung und Höhe zu schätzen. Auch diese Werte bleiben lokal.',
          },
          {
            type: 'h3',
            text: '3.3 Kamera und Fotos',
          },
          {
            type: 'p',
            text: 'Die Kamera wird nur geöffnet, wenn du eine Fotonotiz erstellen willst. Fotos werden im app-eigenen Speicher abgelegt und nicht hochgeladen. Bei Nutzung der Systemgalerie erhält die App nur Zugriff auf die von dir ausgewählten Bilder.',
          },
          {
            type: 'h3',
            text: '3.4 Mikrofon und Sprachnotizen',
          },
          {
            type: 'p',
            text: 'Das Mikrofon wird ausschließlich beim Aufnehmen einer Sprachnotiz aktiviert. Sprachnotizen werden lokal im app-eigenen Speicher gespeichert. Es findet keine Spracherkennung in der Cloud und keine Übermittlung an Dritte statt.',
          },
          {
            type: 'h3',
            text: '3.5 Benachrichtigungen',
          },
          {
            type: 'p',
            text: 'Für den Park-Timer können lokale Benachrichtigungen geplant werden. Diese werden vom Betriebssystem auf deinem Gerät ausgelöst; es werden keine Push-Server genutzt.',
          },
        ],
      },
      {
        id: 'permissions',
        title: '4. Berechtigungen im Überblick',
        blocks: [
          {
            type: 'table',
            head: ['Berechtigung', 'Zweck', 'Erforderlich für'],
            rows: [
              ['Standort (grob/genau)', 'Anker setzen, Richtung und Entfernung berechnen', 'Anker & Rückführung'],
              ['Kamera', 'Referenzfotos erstellen', 'Fotonotiz (optional)'],
              ['Mikrofon', 'Sprachnotizen aufnehmen', 'Sprachnotiz (optional, Pro)'],
              ['Benachrichtigungen', 'Park-Timer-Erinnerungen', 'Timer (optional, Pro)'],
              ['Fotomediathek (ausgewählt)', 'Vorhandene Fotos hinzufügen', 'Fotonotiz (optional)'],
              ['Sensoren', 'Kompass, Höhe, Bewegungsschätzung', 'Immer, ohne separate Abfrage'],
              ['Vibration', 'Näher-dran-Feedback', 'Proximity (optional, Pro)'],
            ],
          },
          {
            type: 'p',
            text: 'Berechtigungen werden erst abgefragt, wenn du die jeweilige Funktion zum ersten Mal nutzt. Du kannst sie jederzeit in den Android-Einstellungen entziehen; einzelne Funktionen stehen dann nicht zur Verfügung, die App bleibt aber nutzbar.',
          },
        ],
      },
      {
        id: 'license',
        title: '5. Lizenzaktivierung und Krypto-Zahlungen',
        blocks: [
          {
            type: 'p',
            text: 'Für die Pro-Freischaltung verarbeitest du einen Lizenzschlüssel. Die Prüfung erfolgt kryptografisch und vollständig offline auf deinem Gerät. Wir erhalten dabei keine Information darüber, wann und wie oft du die App nutzt.',
          },
          {
            type: 'p',
            text: 'Wenn du per Krypto zahlst, ist die Blockchain öffentlich: Transaktions-ID, Betrag, Zeitpunkt und Wallet-Adressen sind für jeden einsehbar. Das liegt in der Natur der Blockchain und nicht in unserem Einflussbereich.',
          },
          {
            type: 'ul',
            items: [
              'Wir verarbeiten die von dir übermittelte Transaktions-ID und die von dir angegebene E-Mail-Adresse, um die Zahlung zu prüfen und dir den Lizenzschlüssel zuzusenden.',
              'Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. c DSGVO (steuer- und handelsrechtliche Aufbewahrungspflichten).',
              'Speicherdauer: für die Dauer des Lizenzverhältnisses und darüber hinaus im Rahmen gesetzlicher Aufbewahrungsfristen (in der Regel bis zu 10 Jahre für Buchungsbelege).',
              'Empfänger: ggf. Steuerberatung und Finanzbehörden im Rahmen gesetzlicher Pflichten; E-Mail-Anbieter als Auftragsverarbeiter.',
            ],
          },
        ],
      },
      {
        id: 'contact-processing',
        title: '6. Kontaktanfragen und Support',
        blocks: [
          {
            type: 'p',
            text: 'Wenn du uns per E-Mail kontaktierst, verarbeiten wir deine E-Mail-Adresse, deinen Namen (sofern angegeben) und den Inhalt der Nachricht, um die Anfrage zu beantworten.',
          },
          {
            type: 'ul',
            items: [
              'Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO bei vertragsbezogenen Anfragen, sonst Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung von Anfragen).',
              'Speicherdauer: bis zur Erledigung der Anfrage, danach Löschung, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.',
              'Empfänger: E-Mail-Dienstleister. Eine Übermittlung in Drittländer kann stattfinden, wenn der E-Mail-Dienstleister dort hostet; Grundlage sind dann Standardvertragsklauseln bzw. ein Angemessenheitsbeschluss.',
            ],
          },
        ],
      },
      {
        id: 'website',
        title: '7. Diese Website',
        blocks: [
          {
            type: 'p',
            text: 'Die wAI-Website ist eine statische Seite. Sie setzt keine Cookies zu Analyse- oder Marketingzwecken, bindet keine externen Schriftarten, keine Werbenetzwerke und keine Social-Media-Plugins ein.',
          },
          {
            type: 'ul',
            items: [
              'Beim Aufruf der Seite verarbeitet der Hosting-Anbieter technisch notwendige Verbindungsdaten (IP-Adresse, Zeitpunkt, User-Agent, angeforderte Ressource) in Server-Logs. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (sicherer, stabiler Betrieb).',
              'Wir setzen kein Google Analytics, keinen Facebook-Pixel und keine vergleichbaren Dienste ein.',
              'Deine Sprachauswahl wird ausschließlich lokal in deinem Browser (localStorage) gespeichert und nicht übertragen.',
              'Die Seite lädt keine Inhalte von Drittservern. QR-Codes werden lokal im Browser erzeugt.',
            ],
          },
          {
            type: 'note',
            text: 'Wenn du die Seite über einen Hosting-Anbieter mit eigener Datenschutzerklärung erreichst, gelten ergänzend dessen Informationen. Bitte prüfe die konkrete Hosting-Konfiguration vor dem Livegang.',
          },
        ],
      },
      {
        id: 'rights',
        title: '8. Deine Rechte',
        blocks: [
          {
            type: 'p',
            text: 'Du hast nach der DSGVO folgende Rechte: Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21). Erteilte Einwilligungen kannst du jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3).',
          },
          {
            type: 'ul',
            items: [
              'Für lokal gespeicherte App-Daten kannst du Auskunft, Berichtigung und Löschung direkt in der App vornehmen (Datenexport und „Alle Daten löschen“ in den Einstellungen).',
              'Für Anfragen zu Support-Mails und Lizenzdaten wende dich an hippie.highho@gmail.com.',
              'Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, insbesondere in dem Mitgliedstaat deines Aufenthaltsorts, deines Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes (Art. 77 DSGVO).',
            ],
          },
        ],
      },
      {
        id: 'security',
        title: '9. Datensicherheit',
        blocks: [
          {
            type: 'p',
            text: 'Lokale Daten sind durch die Sicherheitsmechanismen deines Android-Geräts geschützt (App-Sandbox, Geräteverschlüsselung, Sperrbildschirm). Wir empfehlen, eine Bildschirmsperre zu verwenden und regelmäßige Backups einzurichten.',
          },
          {
            type: 'p',
            text: 'E-Mail-Kommunikation ist grundsätzlich nicht Ende-zu-Ende-verschlüsselt. Sende uns keine sensiblen Daten wie private Schlüssel, Seed-Phrasen oder Ausweiskopien.',
          },
        ],
      },
      {
        id: 'children',
        title: '10. Kinder und Jugendliche',
        blocks: [
          {
            type: 'p',
            text: 'Die App richtet sich nicht vorrangig an Kinder. Für die Nutzung durch Minderjährige gelten die Regeln des jeweiligen App-Marktplatzes und die elterliche Verantwortung. Da keine Konten und keine Datenübertragung an uns stattfinden, ist die Datenverarbeitung auf das Gerät beschränkt.',
          },
        ],
      },
      {
        id: 'changes',
        title: '11. Änderungen dieses Hinweises',
        blocks: [
          {
            type: 'p',
            text: 'Wir passen diesen Datenschutzhinweis an, wenn sich die Verarbeitung, die Rechtslage oder die App-Funktionen ändern. Es gilt die jeweils auf dieser Seite veröffentlichte Fassung mit dem angegebenen Datum.',
          },
        ],
      },
      {
        id: 'contact',
        title: '12. Kontakt',
        blocks: [
          {
            type: 'p',
            text: 'Fragen zum Datenschutz: AndrexTheDev, hippie.highho@gmail.com. Wir antworten in der Regel innerhalb weniger Werktage.',
          },
        ],
      },
    ],
    outro: [
      'Dieser Datenschutzhinweis beschreibt die aktuelle App-Version ohne Backend. Sobald Server-, Konto- oder Analysefunktionen hinzukommen, muss er aktualisiert und rechtlich geprüft werden.',
    ],
  },
  en: {
    title: 'Privacy Notice',
    subtitle: 'How wAI handles your data – in short: as little as possible, as locally as possible.',
    intro: [
      'This Privacy Notice explains, pursuant to Art. 13 and 14 GDPR, which personal data is processed when you visit this website and when you use the “wAI” Android app, for which purpose and on which legal basis.',
      'In short: wAI has no user account, no server, no cloud, no tracking and no advertising. Your anchors, photos, voice notes and trails stay on your device. We never receive them.',
      'The controller under the GDPR is AndrexTheDev, contact: hippie.highho@gmail.com.',
    ],
    sections: [
      {
        id: 'controller',
        title: '1. Controller',
        blocks: [
          {
            type: 'p',
            text: 'AndrexTheDev (independent developer), contact: hippie.highho@gmail.com. Full provider details are available in the imprint.',
          },
          {
            type: 'p',
            text: 'A data protection officer is not legally required and has not been appointed. You can address privacy requests directly to the email address above.',
          },
        ],
      },
      {
        id: 'principles',
        title: '2. Core principles: local, minimal, offline',
        blocks: [
          {
            type: 'ul',
            items: [
              'No accounts, no registration, no login.',
              'No transfer of anchor data, photos, voice notes or trails to us or to third parties.',
              'No third-party analytics, advertising or crash-reporting SDKs.',
              'No cloud synchronisation. Backups happen only if you set them up yourself through your Android system.',
              'The core features work fully offline.',
            ],
          },
          {
            type: 'note',
            text: 'If you have enabled an Android backup (e.g. Google Drive) for your device data, app data may be included in that system backup. This is a feature of your operating system, not of the app; you control it in the Android settings.',
          },
        ],
      },
      {
        id: 'app-data',
        title: '3. Data processing in the app',
        blocks: [
          { type: 'h3', text: '3.1 Locally stored data' },
          {
            type: 'p',
            text: 'The app stores on your device: anchor points (latitude and longitude, altitude, accuracy), titles, categories, text notes, photos, voice notes, zone and parking information, optionally recorded trails, favourites, archive status and timestamps. This data is kept in a local database and in the app’s own file storage.',
          },
          {
            type: 'ul',
            items: [
              'Legal basis: Art. 6(1)(b) GDPR (provision of the requested feature) and your consent under Art. 6(1)(a) GDPR for the use of location, camera and microphone.',
              'Retention: until you delete the anchor, uninstall the app or remove the data in settings. We have no access and no copy.',
              'Recipients: none. No transfer to us or to third parties takes place.',
            ],
          },
          { type: 'h3', text: '3.2 Location data' },
          {
            type: 'p',
            text: 'When you drop an anchor and during guidance, the device location is determined via GPS and the operating system’s Wi-Fi/mobile-based positioning. Positioning is triggered by you (dropping an anchor, starting guidance). There is no background location tracking, no background geofencing and no disclosure to us.',
          },
          {
            type: 'p',
            text: 'Motion and orientation sensors (accelerometer, gyroscope, magnetometer, barometer, step counter) are read while guidance is active in order to estimate direction and elevation. These values also stay local.',
          },
          { type: 'h3', text: '3.3 Camera and photos' },
          {
            type: 'p',
            text: 'The camera opens only when you want to create a photo note. Photos are stored in the app’s own storage and are not uploaded. When using the system gallery, the app only accesses the images you select.',
          },
          { type: 'h3', text: '3.4 Microphone and voice notes' },
          {
            type: 'p',
            text: 'The microphone is activated exclusively while recording a voice note. Voice notes are stored locally in the app’s own storage. There is no cloud speech recognition and no transfer to third parties.',
          },
          { type: 'h3', text: '3.5 Notifications' },
          {
            type: 'p',
            text: 'Local notifications can be scheduled for the parking timer. They are triggered by the operating system on your device; no push servers are used.',
          },
        ],
      },
      {
        id: 'permissions',
        title: '4. Permissions at a glance',
        blocks: [
          {
            type: 'table',
            head: ['Permission', 'Purpose', 'Required for'],
            rows: [
              ['Location (coarse/fine)', 'Drop anchors, compute direction and distance', 'Anchors & guidance'],
              ['Camera', 'Create reference photos', 'Photo note (optional)'],
              ['Microphone', 'Record voice notes', 'Voice note (optional, Pro)'],
              ['Notifications', 'Parking timer reminders', 'Timer (optional, Pro)'],
              ['Photo library (selected)', 'Add existing photos', 'Photo note (optional)'],
              ['Sensors', 'Compass, elevation, motion estimation', 'Always, without separate prompt'],
              ['Vibration', 'Getting-closer feedback', 'Proximity (optional, Pro)'],
            ],
          },
          {
            type: 'p',
            text: 'Permissions are requested only when you first use the relevant feature. You can revoke them at any time in the Android settings; individual functions will then be unavailable, but the app remains usable.',
          },
        ],
      },
      {
        id: 'license',
        title: '5. Licence activation and crypto payments',
        blocks: [
          {
            type: 'p',
            text: 'To unlock Pro you use a licence key. Verification is cryptographic and entirely offline on your device. We do not learn when or how often you use the app.',
          },
          {
            type: 'p',
            text: 'If you pay with crypto, the blockchain is public: transaction ID, amount, timestamp and wallet addresses are visible to anyone. This is inherent to the blockchain and outside our control.',
          },
          {
            type: 'ul',
            items: [
              'We process the transaction ID you provide and the email address you specify in order to verify the payment and send you the licence key.',
              'Legal basis: Art. 6(1)(b) GDPR (performance of contract) and Art. 6(1)(c) GDPR (statutory retention obligations).',
              'Retention: for the duration of the licence relationship and beyond that within statutory retention periods (generally up to 10 years for accounting records).',
              'Recipients: possibly tax advisers and tax authorities within statutory obligations; the email provider as processor.',
            ],
          },
        ],
      },
      {
        id: 'contact-processing',
        title: '6. Contact requests and support',
        blocks: [
          {
            type: 'p',
            text: 'If you contact us by email, we process your email address, your name (if given) and the content of the message in order to answer the request.',
          },
          {
            type: 'ul',
            items: [
              'Legal basis: Art. 6(1)(b) GDPR for contract-related requests, otherwise Art. 6(1)(f) GDPR (legitimate interest in responding to enquiries).',
              'Retention: until the request is resolved, then deletion unless statutory retention applies.',
              'Recipients: email service providers. A transfer to third countries may occur if the provider hosts there; the basis is then standard contractual clauses or an adequacy decision.',
            ],
          },
        ],
      },
      {
        id: 'website',
        title: '7. This website',
        blocks: [
          {
            type: 'p',
            text: 'The wAI website is a static site. It sets no cookies for analytics or marketing, loads no external fonts, no ad networks and no social media plugins.',
          },
          {
            type: 'ul',
            items: [
              'When you access the site, the hosting provider processes technically necessary connection data (IP address, timestamp, user agent, requested resource) in server logs. The legal basis is Art. 6(1)(f) GDPR (secure, stable operation).',
              'We use no Google Analytics, no Facebook pixel and no comparable services.',
              'Your language choice is stored only locally in your browser (localStorage) and is not transmitted.',
              'The site loads no content from third-party servers. QR codes are generated locally in the browser.',
            ],
          },
          {
            type: 'note',
            text: 'If you reach this site through a hosting provider with its own privacy notice, that notice applies in addition. Please review the specific hosting configuration before going live.',
          },
        ],
      },
      {
        id: 'rights',
        title: '8. Your rights',
        blocks: [
          {
            type: 'p',
            text: 'Under the GDPR you have the following rights: access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and objection to processing based on Art. 6(1)(f) GDPR (Art. 21). You may withdraw consent at any time with effect for the future (Art. 7(3)).',
          },
          {
            type: 'ul',
            items: [
              'For locally stored app data you can exercise access, rectification and erasure directly in the app (data export and “Delete all data” in settings).',
              'For requests regarding support emails and licence data, contact hippie.highho@gmail.com.',
              'You have the right to lodge a complaint with a supervisory authority, in particular in the member state of your habitual residence, place of work or the place of the alleged infringement (Art. 77 GDPR).',
            ],
          },
        ],
      },
      {
        id: 'security',
        title: '9. Data security',
        blocks: [
          {
            type: 'p',
            text: 'Local data is protected by the security mechanisms of your Android device (app sandbox, device encryption, screen lock). We recommend using a screen lock and setting up regular backups.',
          },
          {
            type: 'p',
            text: 'Email communication is generally not end-to-end encrypted. Do not send us sensitive data such as private keys, seed phrases or copies of identity documents.',
          },
        ],
      },
      {
        id: 'children',
        title: '10. Children and adolescents',
        blocks: [
          {
            type: 'p',
            text: 'The app is not primarily aimed at children. Use by minors is subject to the rules of the relevant app marketplace and parental responsibility. Since there are no accounts and no transfer of data to us, data processing is confined to the device.',
          },
        ],
      },
      {
        id: 'changes',
        title: '11. Changes to this notice',
        blocks: [
          {
            type: 'p',
            text: 'We update this Privacy Notice when processing, the legal situation or app features change. The version published on this page with the stated date applies.',
          },
        ],
      },
      {
        id: 'contact',
        title: '12. Contact',
        blocks: [
          {
            type: 'p',
            text: 'Privacy questions: AndrexTheDev, hippie.highho@gmail.com. We usually reply within a few business days.',
          },
        ],
      },
    ],
    outro: [
      'This Privacy Notice describes the current app version without a backend. It must be updated and legally reviewed as soon as server, account or analytics features are added.',
    ],
  },
};
