/* Eigenständige Impressum-Seite (live: /impressum).
   Inhalt identisch zum bestehenden Impressum-Pop-up — als feste, verlinkbare
   URL, damit Crawler, Google-Ads-Prüfer und Nutzer, die die in Deutschland
   übliche Adresse /impressum eintippen, nicht auf einer 404 landen.
   Zweisprachige Beschriftung wie im Pop-up (EN / DE). */

export const metadata = {
  title: 'Impressum / Legal Notice — MailPilot',
  description: 'Legal notice (Impressum) for MailPilot — provider identification under German law.',
  robots: { index: true, follow: true },
}

const ROWS = [
  ['Operator / Betreiber', 'Henrik Boye'],
  ['Business Address / Anschrift', 'Esinger Weg 65, 25436 Tornesch, Germany'],
  ['Contact / Kontakt', 'info@mailpilot-ai.com'],
  ['Phone / Telefon', '+49 151 41252600'],
  ['Tax Number / Steuernummer', '13/088/04627'],
  ['Regulatory Authority / Aufsichtsbehörde', 'Gewerbeamt Tornesch'],
]

const S = {
  page: { maxWidth: 800, margin: '0 auto', padding: '48px 22px 80px', color: '#e7e2f3', fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', lineHeight: 1.65 },
  brand: { fontSize: 14, color: '#a99fc0', marginBottom: 6 },
  h1: { fontSize: 30, fontWeight: 800, margin: '0 0 6px', color: '#f3f0fa' },
  intro: { fontSize: 16, color: '#c9bce8', margin: '0 0 30px' },
  dl: { margin: 0 },
  dt: { fontSize: 12, textTransform: 'uppercase', letterSpacing: '.08em', color: '#a99fc0', marginTop: 18 },
  dd: { fontSize: 16, margin: '2px 0 0', color: '#f3f0fa' },
  note: { fontSize: 13, color: '#857aa0', borderTop: '1px solid #2c2148', paddingTop: 16, marginTop: 30 },
  foot: { marginTop: 36, fontSize: 14, color: '#a99fc0' },
  a: { color: '#a78bfa' },
}

export default function ImpressumPage() {
  return (
    <main style={S.page}>
      <div style={S.brand}>MailPilot · mailpilot-ai.com</div>
      <h1 style={S.h1}>Impressum / Legal Notice</h1>
      <p style={S.intro}>Angaben gemäß § 5 DDG (Anbieterkennzeichnung). / Provider identification under German law.</p>
      <dl style={S.dl}>
        {ROWS.map(([label, value]) => (
          <div key={label}>
            <dt style={S.dt}>{label}</dt>
            <dd style={S.dd}>{value}</dd>
          </div>
        ))}
      </dl>
      <p style={S.note}>
        Verantwortlich für den Inhalt: Henrik Boye (Anschrift wie oben). /
        Responsible for content: Henrik Boye (address as above).
      </p>
      <p style={S.foot}>
        <a style={S.a} href="/privacy">Datenschutz / Privacy</a>
        {' · '}
        <a style={S.a} href="/terms">Nutzungsbedingungen / Terms</a>
        {' · '}
        <a style={S.a} href="/">← Zurück zu MailPilot</a>
      </p>
    </main>
  )
}
