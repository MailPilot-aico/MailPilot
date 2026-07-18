/* Eigenständige Datenschutz-Seite (live: /privacy).
   Inhalt identisch zum bestehenden Datenschutz-Pop-up (public/assets/js/i18n.js),
   nur als feste, verlinkbare URL — von Microsoft AppSource für die
   Add-in-Veröffentlichung verlangt. Englisch zuerst (für die Zertifizierungs-
   prüfer), Deutsch darunter (rechtlich maßgeblich, Verantwortlicher in DE). */

export const metadata = {
  title: 'Privacy Policy — MailPilot',
  description: 'How MailPilot processes your data and your rights under the GDPR.',
}

const EN = {
  title: 'Privacy Policy',
  intro:
    'We take the protection of your personal data seriously. This policy explains what data we process when you use MailPilot, and your rights under the GDPR.',
  sections: [
    ['1. Controller',
      'The controller responsible for data processing is Henrik Boye, Esinger Weg 65, 25436 Tornesch, Germany. Email: info@mailpilot-ai.com.'],
    ['2. Hosting, accounts & service providers',
      "To provide MailPilot we use carefully selected processors. Hosting is provided by Netlify, Inc. (San Francisco, USA); when you access the site, Netlify automatically processes technical data such as your IP address and browser information (server logs) to deliver the site securely. Registration and login are handled by Clerk (Clerk, Inc., USA), which processes account data such as your email address, name and sign-in information. Paid subscriptions are processed by Stripe (Stripe Payments Europe Ltd. / Stripe, Inc.); you enter payment details directly with Stripe and we never store full card data. Subscription and device data are stored in a database hosted by Supabase, and your daily free quota is counted server-side via Netlify Blobs. In your browser we only store your language preference. Transfers to the USA are based on the EU Standard Contractual Clauses. Legal basis: Art. 6(1)(b) and (f) GDPR."],
    ['3. AI processing (API)',
      "The text drafts you enter are transmitted over an encrypted connection to Anthropic's AI API (Anthropic PBC, USA) solely to generate your optimized or translated email. This data is used only to provide the service and is NOT used to train AI models or shared for advertising. Drafts are not stored permanently beyond the processing required to return your result. Transfers to the USA are based on the EU Standard Contractual Clauses. Legal basis: Art. 6(1)(b) GDPR (performance of the service you request)."],
    ['4. Your rights',
      'Under the GDPR you have the right to access your data (Art. 15), to rectification (Art. 16), to erasure (Art. 17), to restriction of processing (Art. 18), to data portability (Art. 20) and to object (Art. 21). To exercise these rights, contact us at info@mailpilot-ai.com. You also have the right to lodge a complaint with a data protection supervisory authority — for us this is the Independent Centre for Data Protection Schleswig-Holstein (ULD), Kiel, Germany.'],
  ],
  note: 'Template text — please have it reviewed by a legal professional before going live. Last updated: June 2026.',
}

const DE = {
  title: 'Datenschutzerklärung',
  intro:
    'Der Schutz deiner personenbezogenen Daten ist uns wichtig. Diese Erklärung beschreibt, welche Daten wir bei der Nutzung von MailPilot verarbeiten und welche Rechte du nach der DSGVO hast.',
  sections: [
    ['1. Verantwortlicher',
      'Verantwortlich für die Datenverarbeitung ist Henrik Boye, Esinger Weg 65, 25436 Tornesch, Deutschland. E-Mail: info@mailpilot-ai.com.'],
    ['2. Hosting, Konten & Dienstleister',
      'Zur Bereitstellung von MailPilot setzen wir sorgfältig ausgewählte Auftragsverarbeiter ein. Das Hosting erfolgt durch Netlify, Inc. (San Francisco, USA); beim Aufruf verarbeitet Netlify automatisch technische Daten wie IP-Adresse und Browser-Informationen (Server-Logs), um die Seite sicher auszuliefern. Registrierung und Login wickeln wir über Clerk (Clerk, Inc., USA) ab, wobei Konto-Daten wie E-Mail-Adresse, Name und Anmeldeinformationen verarbeitet werden. Bezahlte Abos werden über Stripe (Stripe Payments Europe Ltd. / Stripe, Inc.) abgewickelt; deine Zahlungsdaten gibst du direkt bei Stripe ein – wir speichern keine vollständigen Kartendaten. Abonnement- und Gerätedaten speichern wir in einer Datenbank bei Supabase, und dein tägliches Gratis-Kontingent zählen wir serverseitig über Netlify Blobs. In deinem Browser speichern wir lediglich deine Sprachwahl. Eine Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln. Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO.'],
    ['3. KI-Verarbeitung (API)',
      'Die von dir eingegebenen Textentwürfe werden über eine verschlüsselte Verbindung an die KI-API von Anthropic (Anthropic PBC, USA) übermittelt, ausschließlich um deine optimierte oder übersetzte E-Mail zu erzeugen. Diese Daten werden nur zur Erbringung des Dienstes genutzt und NICHT zum Training von KI-Modellen verwendet oder zu Werbezwecken weitergegeben. Entwürfe werden über die zur Antwort nötige Verarbeitung hinaus nicht dauerhaft gespeichert. Die Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des angefragten Dienstes).'],
    ['4. Deine Rechte',
      'Nach der DSGVO hast du das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Zur Ausübung dieser Rechte genügt eine formlose Nachricht an info@mailpilot-ai.com. Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren – für uns ist das Unabhängige Landeszentrum für Datenschutz Schleswig-Holstein (ULD) in Kiel zuständig.'],
  ],
  // Hinweis an Henrik (nicht öffentlich): Text bei Gelegenheit fachkundig prüfen lassen.
  note: 'Stand: Juni 2026.',
}

const S = {
  page: { maxWidth: 800, margin: '0 auto', padding: '48px 22px 80px', color: '#e7e2f3', fontFamily: 'Inter, Segoe UI, system-ui, sans-serif', lineHeight: 1.65 },
  brand: { fontSize: 14, color: '#a99fc0', marginBottom: 6 },
  h1: { fontSize: 30, fontWeight: 800, margin: '0 0 6px', color: '#f3f0fa' },
  intro: { fontSize: 16, color: '#c9bce8', margin: '0 0 30px' },
  h2: { fontSize: 18, fontWeight: 700, margin: '26px 0 8px', color: '#f3f0fa' },
  p: { fontSize: 15, margin: '0 0 14px' },
  note: { fontSize: 13, color: '#6e6388', borderTop: '1px solid #2c2148', paddingTop: 16, marginTop: 24 },
  hr: { border: 0, borderTop: '1px solid #2c2148', margin: '44px 0' },
  foot: { marginTop: 36, fontSize: 14, color: '#a99fc0' },
  a: { color: '#a78bfa' },
}

function Block({ d }) {
  return (
    <section>
      <h1 style={S.h1}>{d.title}</h1>
      <p style={S.intro}>{d.intro}</p>
      {d.sections.map(([h, b]) => (
        <div key={h}>
          <h2 style={S.h2}>{h}</h2>
          <p style={S.p}>{b}</p>
        </div>
      ))}
      <p style={S.note}>{d.note}</p>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <main style={S.page}>
      <div style={S.brand}>MailPilot · mailpilot-ai.com</div>
      <Block d={EN} />
      <hr style={S.hr} />
      <Block d={DE} />
      <p style={S.foot}><a style={S.a} href="/">← Back to MailPilot</a></p>
    </main>
  )
}
