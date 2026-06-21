/* =========================================================
   MailPilot — Social-Vorschaubild (Open Graph / Twitter Card)
   ---------------------------------------------------------
   Erzeugt eine realistische Outlook-Szene als 1200×630-Karte:
   links das Schreibfenster mit der fertigen E-Mail, rechts das
   angedockte MailPilot-Add-in (echte Pane-UI), plus klarer
   Call-to-Action. Zeigt die Notizen-→-perfekte-E-Mail-Story.
   Statisch gerendert → kein Laufzeit-/Deploy-Risiko.

   Erzeugt zwei Varianten:
     public/og.png     – Deutsch (Standard-Bild der Seite)
     public/og-en.png  – Englisch (für internationales Teilen)

   Neu erzeugen:  node scripts/make-og-image.mjs
   ========================================================= */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const W = 1200, H = 630;
const FF = "Segoe UI, Arial, sans-serif";
const TOP = 52;        // Höhe der Outlook-Titelleiste
const PANE_X = 828;    // linke Kante des MailPilot-Pane
const OL = "#0F6CBD";  // Outlook-Akzentblau

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Mehrzeiligen Text als einzelne <text>-Elemente (leere Strings = Absatz-Lücke).
const lines = (arr, x, y, lh, attrs) =>
  arr.map((t, i) => (t === "" ? "" : `<text x="${x}" y="${y + i * lh}" ${attrs}>${esc(t)}</text>`)).join("");

// Papierflieger-Marke (viewBox 0 0 32 32) – kleine Version fürs Pane-Branding.
const planeMark = (scale, tx, ty) => `
  <g transform="translate(${tx} ${ty}) scale(${scale})">
    <path d="M27.6 4.7 5.1 13.9l9.9 2.3z" fill="#fff"/>
    <path d="M27.6 4.7 15 16.2l-1 11z" fill="#fff" fill-opacity=".7"/>
  </g>`;

// Vorlagen-Chip im Pane
const chip = (x, w, label) => `
  <rect x="${x}" y="108" width="${w}" height="24" rx="12" fill="none" stroke="#2c2148"/>
  <text x="${x + w / 2}" y="124" text-anchor="middle" font-family="${FF}" font-size="12" fill="#a99fc0">${esc(label)}</text>`;

// Regler (Track + Knopf + Wert) im Pane
const slider = (y, label, knobX, val) => `
  <text x="850" y="${y + 4}" font-family="${FF}" font-size="12" fill="#a99fc0">${esc(label)}</text>
  <line x1="908" y1="${y}" x2="1118" y2="${y}" stroke="#2c2148" stroke-width="3" stroke-linecap="round"/>
  <line x1="908" y1="${y}" x2="${knobX}" y2="${y}" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"/>
  <circle cx="${knobX}" cy="${y}" r="6" fill="#8b5cf6"/>
  <text x="1178" y="${y + 4}" text-anchor="end" font-family="${FF}" font-size="11" fill="#c9bce8">${esc(val)}</text>`;

// ---- Sprachpakete (die „Story": Stichpunkte rechts → fertige Mail links) ----
const DE = {
  search: "Suchen", send: "Senden", to: "An", subjectLabel: "Betreff",
  subjectVal: "Ihr Angebot für das Webdesign", recipient: "Julia Berg", initials: "JB",
  signedIn: "Angemeldet", chips: ["Angebot", "Termin", "Absage"],
  notesLabel: "Stichpunkte (tippen oder reinsprechen)",
  toneLabel: "Tonfall", toneVal: "Professionell",
  lenLabel: "Länge", lenVal: "mittel", formLabel: "Förml.", formVal: "neutral",
  generate: "E-Mail erzeugen", resultLabel: "Ergebnis", insert: "In die E-Mail einfügen",
  cta: "Jetzt kostenlos testen  →",
  email: [
    "Sehr geehrte Frau Berg,", "",
    "vielen Dank für Ihre Anfrage. Gerne mache ich", "Ihnen folgendes Angebot:", "",
    "Gesamtpreis: 3.500 € — Fertigstellung in 3 Wochen.", "",
    "Möchten Sie zusätzlich ein passendes Logo?", "Geben Sie mir gern bis Freitag Bescheid.", "",
    "Mit freundlichen Grüßen", "Thomas Berger",
  ],
  notes: ["Angebot Webdesign", "3.500 €, in 3 Wochen fertig", "Logo zusätzlich? Bis Fr. Bescheid"],
  result: [
    "Sehr geehrte Frau Berg,", "",
    "vielen Dank für Ihre Anfrage.", "Gerne mache ich Ihnen folgendes",
    "Angebot: 3.500 €, fertig in 3", "Wochen. Möchten Sie zusätzlich…",
  ],
};
const EN = {
  search: "Search", send: "Send", to: "To", subjectLabel: "Subject",
  subjectVal: "Your quote for the website", recipient: "Julia Berg", initials: "JB",
  signedIn: "Signed in", chips: ["Quote", "Meeting", "Decline"],
  notesLabel: "Notes (type or speak)",
  toneLabel: "Tone", toneVal: "Professional",
  lenLabel: "Length", lenVal: "medium", formLabel: "Formality", formVal: "neutral",
  generate: "Generate email", resultLabel: "Result", insert: "Insert into email",
  cta: "Try it free  →",
  email: [
    "Dear Ms. Berg,", "",
    "thank you for your enquiry. I'd be glad to", "send you the following offer:", "",
    "Total price: €3,500 — completed in 3 weeks.", "",
    "Would you also like a matching logo?", "Just let me know by Friday.", "",
    "Kind regards", "Thomas Berger",
  ],
  notes: ["Website quote", "€3,500, ready in 3 weeks", "Logo too? Reply by Fri"],
  result: [
    "Dear Ms. Berg,", "",
    "thank you for your enquiry.", "I'd be glad to send you the",
    "following offer: €3,500, ready", "in 3 weeks. Would you also…",
  ],
};

function buildSvg(L) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="pane" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d0916"/>
      <stop offset="1" stop-color="#0a0710"/>
    </linearGradient>
  </defs>

  <!-- ===================== Outlook (links) ===================== -->
  <rect width="${W}" height="${H}" fill="#ffffff"/>

  <!-- Titelleiste -->
  <rect width="${W}" height="${TOP}" fill="${OL}"/>
  <g transform="translate(18 16)">
    <rect width="22" height="18" rx="3" fill="#ffffff"/>
    <path d="M1 2 L11 10 L21 2" fill="none" stroke="${OL}" stroke-width="2"/>
  </g>
  <text x="50" y="33" font-family="${FF}" font-size="17" font-weight="600" fill="#ffffff">Outlook</text>
  <rect x="330" y="12" width="430" height="28" rx="14" fill="#ffffff" fill-opacity="0.16"/>
  <text x="352" y="31" font-family="${FF}" font-size="13" fill="#ffffff" fill-opacity="0.85">${esc(L.search)}</text>
  <text x="1120" y="32" font-family="${FF}" font-size="16" fill="#ffffff">—</text>
  <rect x="1148" y="20" width="12" height="12" rx="2" fill="none" stroke="#ffffff" stroke-width="1.6"/>
  <text x="1176" y="33" font-family="${FF}" font-size="16" fill="#ffffff">✕</text>

  <!-- Compose-Toolbar -->
  <rect x="0" y="${TOP}" width="${PANE_X}" height="44" fill="#faf9f8"/>
  <line x1="0" y1="${TOP + 44}" x2="${PANE_X}" y2="${TOP + 44}" stroke="#edebe9" stroke-width="1"/>
  <rect x="20" y="62" width="96" height="28" rx="4" fill="${OL}"/>
  <path d="M34 76 l10 -5 -3 5 3 5 z" fill="#ffffff"/>
  <text x="84" y="80" text-anchor="middle" font-family="${FF}" font-size="13" font-weight="600" fill="#ffffff">${esc(L.send)}</text>
  <text x="140" y="81" font-family="Georgia, serif" font-size="15" font-weight="700" fill="#605e5c">B</text>
  <text x="166" y="81" font-family="Georgia, serif" font-size="15" font-style="italic" fill="#605e5c">I</text>
  <text x="190" y="81" font-family="${FF}" font-size="14" fill="#605e5c" text-decoration="underline">U</text>
  <rect x="218" y="68" width="16" height="12" rx="1" fill="none" stroke="#605e5c" stroke-width="1.4"/>

  <!-- Empfänger -->
  <text x="24" y="124" font-family="${FF}" font-size="13" fill="#605e5c">${esc(L.to)}</text>
  <rect x="58" y="110" width="132" height="26" rx="13" fill="#eff6fc" stroke="#c7e0f4"/>
  <circle cx="74" cy="123" r="9" fill="${OL}"/>
  <text x="74" y="127" text-anchor="middle" font-family="${FF}" font-size="9" font-weight="700" fill="#ffffff">${esc(L.initials)}</text>
  <text x="90" y="127" font-family="${FF}" font-size="12.5" fill="#201f1e">${esc(L.recipient)}</text>
  <line x1="24" y1="148" x2="${PANE_X - 24}" y2="148" stroke="#edebe9" stroke-width="1"/>

  <!-- Betreff -->
  <text x="24" y="170" font-family="${FF}" font-size="13" fill="#605e5c">${esc(L.subjectLabel)}</text>
  <text x="86" y="170" font-family="${FF}" font-size="14" font-weight="600" fill="#201f1e">${esc(L.subjectVal)}</text>
  <line x1="24" y1="186" x2="${PANE_X - 24}" y2="186" stroke="#edebe9" stroke-width="1"/>

  <!-- E-Mail-Text -->
  ${lines(L.email, 24, 216, 27, `font-family="${FF}" font-size="16" fill="#201f1e"`)}

  <!-- Call-to-Action (nur wenn L.cta gesetzt – Store-Screenshots ohne Marketing-Button) -->
  ${L.cta ? `<rect x="26" y="560" width="292" height="48" rx="24" fill="#000000" fill-opacity="0.12"/>
  <rect x="24" y="556" width="292" height="48" rx="24" fill="#8b5cf6"/>
  <text x="170" y="586" text-anchor="middle" font-family="${FF}" font-size="16" font-weight="700" fill="#ffffff">${esc(L.cta)}</text>
  <text x="340" y="586" font-family="${FF}" font-size="15" font-weight="600" fill="#7c3aed">mailpilot-ai.com</text>` : ''}

  <!-- Trennschatten zum Pane -->
  <rect x="${PANE_X - 5}" y="${TOP}" width="5" height="${H - TOP}" fill="#000000" fill-opacity="0.10"/>

  <!-- ===================== MailPilot-Pane (rechts) ===================== -->
  <rect x="${PANE_X}" y="${TOP}" width="${W - PANE_X}" height="${H - TOP}" fill="url(#pane)"/>

  <!-- Brand-Zeile -->
  ${planeMark(0.8, 850, 66)}
  <text x="882" y="86" font-family="${FF}" font-size="19" font-weight="800" fill="#f3f0fa">MailPilot</text>
  <circle cx="1086" cy="80" r="4" fill="#34d399"/>
  <text x="1096" y="84" font-family="${FF}" font-size="12" fill="#a99fc0">${esc(L.signedIn)}</text>

  <!-- Vorlagen-Chips -->
  ${chip(850, 70, L.chips[0])}
  ${chip(928, 62, L.chips[1])}
  ${chip(998, 64, L.chips[2])}

  <!-- Stichpunkte -->
  <text x="850" y="152" font-family="${FF}" font-size="12" fill="#a99fc0">${esc(L.notesLabel)}</text>
  <rect x="850" y="160" width="296" height="80" rx="10" fill="#120c1d" stroke="#2c2148"/>
  ${lines(L.notes, 864, 182, 22, `font-family="${FF}" font-size="13" fill="#f3f0fa"`)}
  <rect x="1150" y="160" width="28" height="28" rx="9" fill="none" stroke="#2c2148"/>
  <g transform="translate(1158 167)" stroke="#a99fc0" stroke-width="1.6" fill="none" stroke-linecap="round">
    <path d="M6 0a2.4 2.4 0 0 1 2.4 2.4v4.2a2.4 2.4 0 0 1 -4.8 0V2.4A2.4 2.4 0 0 1 6 0z" fill="#a99fc0" stroke="none"/>
    <path d="M10.5 6.6A4.5 4.5 0 0 1 1.5 6.6"/>
    <line x1="6" y1="11" x2="6" y2="13.5"/>
  </g>

  <!-- Tonfall -->
  <text x="850" y="262" font-family="${FF}" font-size="12" fill="#a99fc0">${esc(L.toneLabel)}</text>
  <rect x="850" y="270" width="328" height="34" rx="10" fill="#120c1d" stroke="#2c2148"/>
  <text x="866" y="292" font-family="${FF}" font-size="13" fill="#f3f0fa">${esc(L.toneVal)}</text>
  <path d="M1158 287 l6 6 6 -6" fill="none" stroke="#a99fc0" stroke-width="1.6" stroke-linecap="round"/>

  <!-- Regler -->
  ${slider(330, L.lenLabel, 1010, L.lenVal)}
  ${slider(358, L.formLabel, 1050, L.formVal)}

  <!-- Erzeugen-Button -->
  <rect x="850" y="378" width="328" height="40" rx="10" fill="#8b5cf6"/>
  <text x="1014" y="403" text-anchor="middle" font-family="${FF}" font-size="14.5" font-weight="700" fill="#ffffff">${esc(L.generate)}</text>

  <!-- Ergebnis -->
  <text x="850" y="438" font-family="${FF}" font-size="12" fill="#a99fc0">${esc(L.resultLabel)}</text>
  <rect x="850" y="446" width="328" height="138" rx="10" fill="#120c1d" stroke="#2c2148"/>
  ${lines(L.result, 866, 468, 20, `font-family="${FF}" font-size="12.5" fill="#dcd5ef"`)}

  <!-- Einfügen-Button -->
  <rect x="850" y="594" width="328" height="28" rx="9" fill="none" stroke="#2c2148"/>
  <text x="1014" y="612" text-anchor="middle" font-family="${FF}" font-size="12" fill="#f3f0fa">${esc(L.insert)}</text>
</svg>`;
}

export { buildSvg, DE, EN };

// Nur beim direkten Aufruf rendern (damit der Import aus anderen Skripten
// nicht ungewollt die OG-Bilder neu schreibt).
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [file, L] of [["og.png", DE], ["og-en.png", EN]]) {
    await sharp(Buffer.from(buildSvg(L))).png().toFile(join(PUBLIC, file));
    console.log("geschrieben:", file);
  }
}
