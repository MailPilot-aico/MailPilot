import Script from 'next/script'
import legacyHome from './legacyHome.js'

/* Startseite: rendert das bestehende MailPilot-Design (Bridge-Schritt der
   Migration) und lädt die vorhandene Logik (i18n + script.js) aus public/.
   Nächste Schritte: Abschnitt für Abschnitt in echte React-Komponenten
   überführen und Clerk/Stripe React-nativ verdrahten. */
export default function Home() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: legacyHome }} />
      {/* Reihenfolge wichtig: i18n.js definiert das globale I18N vor script.js */}
      <Script src="/assets/js/i18n.js" strategy="afterInteractive" />
      <Script src="/assets/js/script.js" strategy="afterInteractive" />
    </>
  )
}
