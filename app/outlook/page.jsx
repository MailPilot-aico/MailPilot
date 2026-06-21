'use client'

import { useState } from 'react'

/* Marketing- + Installations-Landingpage für das Outlook-Add-in (live: /outlook).
   Verkauft das Add-in (Hero, Screenshots, Features, So-funktioniert's) und
   enthält darunter die Sideload-Anleitung mit kopierbarer Manifest-URL.
   Dunkles MailPilot-Branding inline (unabhängig vom restlichen CSS). */

const MANIFEST_URL = 'https://mailpilot-ai.com/outlook/manifest.xml'

const FEATURES = [
  ['ti', 'From notes to email', 'Type a few bullet points — get a finished, well-written email in seconds.'],
  ['ti', 'Reply mode', 'Paste the email you received and your key points; MailPilot drafts a fitting reply.'],
  ['ti', 'Your tone & length', 'Professional, friendly, formal or casual — fine-tune with simple sliders.'],
  ['ti', 'One-click refine', 'Make it friendlier, shorter, more formal or more assertive instantly.'],
  ['ti', '15+ languages', 'Send your email translated, with the structure preserved.'],
  ['ti', 'Name & signature', 'Set them once — inserted automatically. No more [Name].'],
]

const STEPS = [
  ['Neues Outlook & Outlook im Web', ['Zahnrad (Einstellungen) öffnen und „Add-Ins abrufen“ suchen.', 'Links auf „Meine Add-Ins“.', 'Unten „Benutzerdefiniertes Add-In hinzufügen“ → „Aus Datei/URL“.', 'Die Manifest-URL (oben) einfügen und installieren.']],
  ['Klassisches Outlook (Windows)', ['Neue E-Mail öffnen.', '„Add-Ins abrufen“ / „Add-Ins verwalten“.', '„Meine Add-Ins“ → „Benutzerdefiniertes Add-In“ → „Aus URL“.', 'Manifest-URL einfügen, installieren.']],
]

export default function OutlookLanding() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(MANIFEST_URL); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const C = {
    page: { maxWidth: 1040, margin: '0 auto', padding: '40px 20px 90px', color: '#e7e2f3', fontFamily: 'Inter, Segoe UI, system-ui, sans-serif' },
    badge: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#c9bce8', background: 'rgba(139,92,246,.14)', border: '1px solid #3a2d63', borderRadius: 999, padding: '6px 14px', marginBottom: 22 },
    h1: { fontSize: 44, lineHeight: 1.1, fontWeight: 800, margin: '0 0 16px', color: '#fff', letterSpacing: '-1px' },
    accent: { color: '#a78bfa' },
    lead: { fontSize: 19, color: '#c9bce8', lineHeight: 1.55, maxWidth: 680, margin: '0 0 30px' },
    ctaRow: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 },
    btnP: { background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 26px', fontSize: 16, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
    btnG: { background: 'transparent', color: '#e7e2f3', border: '1px solid #3a2d63', borderRadius: 12, padding: '14px 26px', fontSize: 16, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
    hint: { fontSize: 13, color: '#6e6388', margin: '0 0 36px' },
    shot: { width: '100%', borderRadius: 16, border: '1px solid #2c2148', display: 'block', margin: '0 auto' },
    section: { margin: '72px 0 0' },
    h2: { fontSize: 30, fontWeight: 800, color: '#fff', textAlign: 'center', margin: '0 0 10px' },
    sub: { fontSize: 17, color: '#c9bce8', textAlign: 'center', margin: '0 0 34px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 },
    card: { background: '#140d22', border: '1px solid #2c2148', borderRadius: 16, padding: '22px 24px' },
    dot: { width: 30, height: 30, borderRadius: 9, background: '#8b5cf6', display: 'inline-block', marginBottom: 12 },
    cardT: { fontSize: 19, fontWeight: 700, color: '#f3f0fa', margin: '0 0 6px' },
    cardB: { fontSize: 15, color: '#c4b8e6', lineHeight: 1.55, margin: 0 },
    urlBox: { display: 'flex', gap: 10, alignItems: 'stretch', background: '#0d0916', border: '1px solid #2c2148', borderRadius: 12, padding: 10, marginBottom: 8, flexWrap: 'wrap', maxWidth: 640 },
    url: { flex: 1, minWidth: 220, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 14, color: '#dcd5ef', padding: '10px 12px', wordBreak: 'break-all', alignSelf: 'center' },
    copyBtn: { background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
    ol: { margin: '8px 0 0', paddingLeft: 22, lineHeight: 1.65, fontSize: 15, color: '#e7e2f3' },
    foot: { marginTop: 60, paddingTop: 22, borderTop: '1px solid #2c2148', fontSize: 14, color: '#a99fc0', textAlign: 'center' },
    a: { color: '#a78bfa' },
  }

  return (
    <main style={C.page}>
      {/* Hero */}
      <div style={{ textAlign: 'center' }}>
        <div style={C.badge}>
          <img src="/icons/mp-80.png" alt="" width="20" height="20" style={{ borderRadius: 5 }} />
          MailPilot for Outlook · coming to the Outlook add-in store
        </div>
        <h1 style={C.h1}>Turn notes into <span style={C.accent}>perfect emails</span><br />— without leaving Outlook.</h1>
        <p style={{ ...C.lead, margin: '0 auto 30px' }}>
          MailPilot's AI sits right in your Outlook compose window. Type a few bullet points,
          get a complete, professional email — then review, tweak and send.
        </p>
        <div style={{ ...C.ctaRow, justifyContent: 'center' }}>
          <a style={C.btnP} href="https://mailpilot-ai.com" target="_blank" rel="noreferrer">Try MailPilot free</a>
          <a style={C.btnG} href="#install">Install in Outlook</a>
        </div>
        <p style={C.hint}>Free daily quota · works on Microsoft 365 &amp; Outlook.com mailboxes</p>
      </div>

      <img style={C.shot} src="/outlook/shot-overview.png" alt="MailPilot inside Outlook: bullet points become a finished email" />

      {/* Features */}
      <section style={C.section}>
        <h2 style={C.h2}>Everything you need to write better emails, faster</h2>
        <p style={C.sub}>One small panel, a lot less typing.</p>
        <div style={C.grid}>
          {FEATURES.map(([, t, b]) => (
            <div key={t} style={C.card}>
              <span style={C.dot} aria-hidden="true" />
              <p style={C.cardT}>{t}</p>
              <p style={C.cardB}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={C.section}>
        <h2 style={C.h2}>Three steps inside your inbox</h2>
        <p style={C.sub}>Notes in. Perfect email out.</p>
        <img style={{ ...C.shot, maxWidth: 920 }} src="/outlook/shot-pane.png" alt="The MailPilot panel: type notes, generate, insert" />
      </section>

      {/* Install */}
      <section style={C.section} id="install">
        <h2 style={C.h2}>Install MailPilot in Outlook</h2>
        <p style={C.sub}>Bald per Ein-Klick im Outlook-Store. Schon jetzt selbst hinzufügen:</p>
        <div style={{ ...C.urlBox, margin: '0 auto 8px' }}>
          <span style={C.url}>{MANIFEST_URL}</span>
          <button style={C.copyBtn} onClick={copy} type="button">{copied ? 'Kopiert ✓' : 'URL kopieren'}</button>
        </div>
        <p style={{ ...C.hint, textAlign: 'center' }}>Diese Manifest-URL wird beim „Aus URL/Datei hinzufügen“-Schritt eingefügt.</p>
        <div style={C.grid}>
          {STEPS.map(([title, steps]) => (
            <div key={title} style={C.card}>
              <p style={C.cardT}>{title}</p>
              <ol style={C.ol}>{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
          ))}
        </div>
        <p style={{ ...C.hint, textAlign: 'center', marginTop: 18 }}>
          Hinweis: Add-ins funktionieren auf Microsoft-365-/Outlook.com-Postfächern (nicht auf IMAP/Gmail).
        </p>
      </section>

      <p style={C.foot}>
        Fragen? <a style={C.a} href="mailto:info@mailpilot-ai.com">info@mailpilot-ai.com</a>
        {' '}· <a style={C.a} href="/">MailPilot home</a>
        {' '}· <a style={C.a} href="/privacy">Privacy</a>
        {' '}· <a style={C.a} href="/terms">Terms</a>
      </p>
    </main>
  )
}
