'use client'

import { useState } from 'react'

/* Installations-Seite für das Outlook-Add-in (live: /outlook).
   Erklärt Schritt für Schritt, wie man MailPilot in der echten Outlook-App
   installiert (Sideload des Manifests). Dunkles MailPilot-Branding inline,
   damit es unabhängig vom restlichen CSS korrekt aussieht. */

const MANIFEST_URL = 'https://mailpilot-ai.com/outlook/manifest.xml'

const STEPS = [
  {
    title: 'Neues Outlook & Outlook im Web',
    icon: '🌐',
    steps: [
      'Outlook öffnen und auf das Zahnrad (Einstellungen) oben rechts klicken.',
      'Nach „Add-Ins“ suchen bzw. „Add-Ins abrufen“ / „Get Add-ins“ öffnen.',
      'Links auf „Meine Add-Ins“ (My add-ins) gehen.',
      'Ganz unten bei „Benutzerdefinierte Add-Ins“ auf „Benutzerdefiniertes Add-In hinzufügen“ → „Aus URL hinzufügen“.',
      'Die MailPilot-Manifest-URL (oben) einfügen und bestätigen, dann „Installieren“.',
    ],
  },
  {
    title: 'Klassisches Outlook (Windows)',
    icon: '🪟',
    steps: [
      'Eine neue E-Mail öffnen (Schreibfenster).',
      'Im Menüband auf „Add-Ins abrufen“ bzw. „Alle Apps“ → „Add-Ins verwalten“ klicken.',
      '„Meine Add-Ins“ → „Benutzerdefiniertes Add-In hinzufügen“ → „Aus URL hinzufügen“.',
      'Die Manifest-URL einfügen und installieren.',
    ],
  },
  {
    title: 'Outlook (Mac)',
    icon: '🍎',
    steps: [
      'Eine neue E-Mail öffnen.',
      'Im Menüband auf „…“ / „Add-Ins abrufen“ klicken.',
      '„Meine Add-Ins“ → „Benutzerdefiniertes Add-In hinzufügen“ → „Aus URL“.',
      'Die Manifest-URL einfügen und installieren.',
    ],
  },
]

export default function OutlookInstall() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MANIFEST_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const C = {
    page: { maxWidth: 780, margin: '0 auto', padding: '48px 20px 80px', color: '#f3f0fa', fontFamily: 'Inter, Segoe UI, system-ui, sans-serif' },
    badge: { display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#a99fc0', marginBottom: 18 },
    h1: { fontSize: 34, fontWeight: 800, margin: '0 0 10px', lineHeight: 1.15 },
    lead: { fontSize: 17, color: '#c9bce8', margin: '0 0 28px', lineHeight: 1.5 },
    urlBox: { display: 'flex', gap: 10, alignItems: 'stretch', background: '#0d0916', border: '1px solid #2c2148', borderRadius: 12, padding: 10, marginBottom: 8, flexWrap: 'wrap' },
    url: { flex: 1, minWidth: 220, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 14, color: '#dcd5ef', padding: '10px 12px', wordBreak: 'break-all', alignSelf: 'center' },
    btn: { background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
    hint: { fontSize: 13, color: '#6e6388', margin: '0 0 36px' },
    card: { background: '#120c1d', border: '1px solid #2c2148', borderRadius: 14, padding: '20px 22px', marginBottom: 16 },
    cardTitle: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700, margin: '0 0 12px' },
    ol: { margin: 0, paddingLeft: 22, lineHeight: 1.65, fontSize: 15, color: '#e7e2f3' },
    after: { background: 'rgba(139,92,246,.12)', border: '1px solid #3a2d63', borderRadius: 14, padding: '18px 22px', marginTop: 28, fontSize: 15, lineHeight: 1.6, color: '#e7e2f3' },
    foot: { marginTop: 32, fontSize: 14, color: '#a99fc0' },
    a: { color: '#a78bfa' },
  }

  return (
    <main style={C.page}>
      <div style={C.badge}>
        <img src="/icons/mp-80.png" alt="" width="26" height="26" style={{ borderRadius: 7 }} />
        MailPilot für Outlook
      </div>

      <h1 style={C.h1}>MailPilot direkt in Outlook installieren</h1>
      <p style={C.lead}>
        Schreibe Stichpunkte ins Outlook-Seitenfenster, lass die KI eine perfekte E-Mail
        formulieren und füge sie mit einem Klick ein. Installation in ~2&nbsp;Minuten:
      </p>

      <div style={C.urlBox}>
        <span style={C.url}>{MANIFEST_URL}</span>
        <button style={C.btn} onClick={copy} type="button">{copied ? 'Kopiert ✓' : 'URL kopieren'}</button>
      </div>
      <p style={C.hint}>Diese Manifest-URL wird beim „Aus URL hinzufügen“-Schritt eingefügt.</p>

      {STEPS.map((s) => (
        <section key={s.title} style={C.card}>
          <div style={C.cardTitle}><span aria-hidden="true">{s.icon}</span>{s.title}</div>
          <ol style={C.ol}>
            {s.steps.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </section>
      ))}

      <div style={C.after}>
        <strong>Danach:</strong> Beim Schreiben einer E-Mail erscheint im Menüband der
        Knopf <strong>MailPilot</strong>. Öffnen → <strong>Anmelden</strong> (verbindet dein
        Konto für die echte KI) → Stichpunkte eintippen → <strong>E-Mail erzeugen</strong> →
        <strong> In die E-Mail einfügen</strong>. Ohne Anmeldung läuft ein Demo-Modus.
      </div>

      <p style={C.foot}>
        Klappt etwas nicht? Schreib an <a style={C.a} href="mailto:info@mailpilot-ai.com">info@mailpilot-ai.com</a>
        {' '}· <a style={C.a} href="/">Zurück zu MailPilot</a>
      </p>
    </main>
  )
}
