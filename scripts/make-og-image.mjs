/* =========================================================
   MailPilot — Social-Vorschaubild (Open Graph / Twitter Card)
   ---------------------------------------------------------
   Erzeugt public/og.png (1200×630): eine realistische Outlook-Szene.
   Links das Schreibfenster mit der fertigen E-Mail, rechts das
   angedockte MailPilot-Add-in (echte Pane-UI: Stichpunkte → „E-Mail
   erzeugen" → Ergebnis). Zeigt die Notizen-→-perfekte-E-Mail-Story.
   Statisch gerendert → kein Laufzeit-/Deploy-Risiko.

   Neu erzeugen:  node scripts/make-og-image.mjs
   ========================================================= */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "og.png");

const W = 1200, H = 630;
const FF = "Segoe UI, Arial, sans-serif";
const TOP = 52;        // Höhe der Outlook-Titelleiste
const PANE_X = 828;    // linke Kante des MailPilot-Pane

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

// Outlook-Akzentblau
const OL = "#0F6CBD";

// ---- Inhalte (die „Story": Stichpunkte rechts → fertige Mail links) ----
const emailLines = [
  "Sehr geehrte Frau Berg,",
  "",
  "vielen Dank für Ihre Anfrage. Gerne mache ich",
  "Ihnen folgendes Angebot:",
  "",
  "Gesamtpreis: 3.500 € — Fertigstellung in 3 Wochen.",
  "",
  "Möchten Sie zusätzlich ein passendes Logo?",
  "Geben Sie mir gern bis Freitag Bescheid.",
  "",
  "Mit freundlichen Grüßen",
  "[Name]",
];
const notesLines = [
  "Angebot Webdesign",
  "3.500 €, in 3 Wochen fertig",
  "Logo zusätzlich? Bis Fr. Bescheid",
];
const resultLines = [
  "Sehr geehrte Frau Berg,",
  "",
  "vielen Dank für Ihre Anfrage.",
  "Gerne mache ich Ihnen folgendes",
  "Angebot: 3.500 €, fertig in 3",
  "Wochen. Möchten Sie zusätzlich…",
];

// Vorlagen-Chips im Pane
const chip = (x, w, label) => `
  <rect x="${x}" y="108" width="${w}" height="24" rx="12" fill="none" stroke="#2c2148"/>
  <text x="${x + w / 2}" y="124" text-anchor="middle" font-family="${FF}" font-size="12" fill="#a99fc0">${label}</text>`;

// Regler (Track + Knopf + Wert) im Pane
const slider = (y, label, knobX, val) => `
  <text x="850" y="${y + 4}" font-family="${FF}" font-size="12" fill="#a99fc0">${label}</text>
  <line x1="908" y1="${y}" x2="1118" y2="${y}" stroke="#2c2148" stroke-width="3" stroke-linecap="round"/>
  <line x1="908" y1="${y}" x2="${knobX}" y2="${y}" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"/>
  <circle cx="${knobX}" cy="${y}" r="6" fill="#8b5cf6"/>
  <text x="1178" y="${y + 4}" text-anchor="end" font-family="${FF}" font-size="11" fill="#c9bce8">${val}</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
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
  <text x="352" y="31" font-family="${FF}" font-size="13" fill="#ffffff" fill-opacity="0.85">Suchen</text>
  <text x="1120" y="32" font-family="${FF}" font-size="16" fill="#ffffff">—</text>
  <rect x="1148" y="20" width="12" height="12" rx="2" fill="none" stroke="#ffffff" stroke-width="1.6"/>
  <text x="1176" y="33" font-family="${FF}" font-size="16" fill="#ffffff">✕</text>

  <!-- Compose-Toolbar -->
  <rect x="0" y="${TOP}" width="${PANE_X}" height="44" fill="#faf9f8"/>
  <line x1="0" y1="${TOP + 44}" x2="${PANE_X}" y2="${TOP + 44}" stroke="#edebe9" stroke-width="1"/>
  <rect x="20" y="62" width="96" height="28" rx="4" fill="${OL}"/>
  <path d="M34 76 l10 -5 -3 5 3 5 z" fill="#ffffff"/>
  <text x="84" y="80" text-anchor="middle" font-family="${FF}" font-size="13" font-weight="600" fill="#ffffff">Senden</text>
  <text x="140" y="81" font-family="Georgia, serif" font-size="15" font-weight="700" fill="#605e5c">B</text>
  <text x="166" y="81" font-family="Georgia, serif" font-size="15" font-style="italic" fill="#605e5c">I</text>
  <text x="190" y="81" font-family="${FF}" font-size="14" fill="#605e5c" text-decoration="underline">U</text>
  <rect x="218" y="68" width="16" height="12" rx="1" fill="none" stroke="#605e5c" stroke-width="1.4"/>

  <!-- Empfänger -->
  <text x="24" y="124" font-family="${FF}" font-size="13" fill="#605e5c">An</text>
  <rect x="58" y="110" width="132" height="26" rx="13" fill="#eff6fc" stroke="#c7e0f4"/>
  <circle cx="74" cy="123" r="9" fill="${OL}"/>
  <text x="74" y="127" text-anchor="middle" font-family="${FF}" font-size="9" font-weight="700" fill="#ffffff">JB</text>
  <text x="90" y="127" font-family="${FF}" font-size="12.5" fill="#201f1e">Julia Berg</text>
  <line x1="24" y1="148" x2="${PANE_X - 24}" y2="148" stroke="#edebe9" stroke-width="1"/>

  <!-- Betreff -->
  <text x="24" y="170" font-family="${FF}" font-size="13" fill="#605e5c">Betreff</text>
  <text x="86" y="170" font-family="${FF}" font-size="14" font-weight="600" fill="#201f1e">Ihr Angebot für das Webdesign</text>
  <line x1="24" y1="186" x2="${PANE_X - 24}" y2="186" stroke="#edebe9" stroke-width="1"/>

  <!-- E-Mail-Text -->
  ${lines(emailLines, 24, 216, 27, `font-family="${FF}" font-size="16" fill="#201f1e"`)}

  <!-- Cursor-Andeutung am Ende -->
  <rect x="68" y="617" width="2" height="0" fill="${OL}"/>

  <!-- Trennschatten zum Pane -->
  <rect x="${PANE_X - 5}" y="${TOP}" width="5" height="${H - TOP}" fill="#000000" fill-opacity="0.10"/>

  <!-- ===================== MailPilot-Pane (rechts) ===================== -->
  <rect x="${PANE_X}" y="${TOP}" width="${W - PANE_X}" height="${H - TOP}" fill="url(#pane)"/>

  <!-- Brand-Zeile -->
  ${planeMark(0.8, 850, 66)}
  <text x="882" y="86" font-family="${FF}" font-size="19" font-weight="800" fill="#f3f0fa">MailPilot</text>
  <circle cx="1086" cy="80" r="4" fill="#34d399"/>
  <text x="1096" y="84" font-family="${FF}" font-size="12" fill="#a99fc0">Angemeldet</text>

  <!-- Vorlagen-Chips -->
  ${chip(850, 70, "Angebot")}
  ${chip(928, 62, "Termin")}
  ${chip(998, 64, "Absage")}

  <!-- Stichpunkte -->
  <text x="850" y="152" font-family="${FF}" font-size="12" fill="#a99fc0">Stichpunkte (tippen oder reinsprechen)</text>
  <rect x="850" y="160" width="296" height="80" rx="10" fill="#120c1d" stroke="#2c2148"/>
  ${lines(notesLines, 864, 182, 22, `font-family="${FF}" font-size="13" fill="#f3f0fa"`)}
  <rect x="1150" y="160" width="28" height="28" rx="9" fill="none" stroke="#2c2148"/>
  <g transform="translate(1158 167)" stroke="#a99fc0" stroke-width="1.6" fill="none" stroke-linecap="round">
    <path d="M6 0a2.4 2.4 0 0 1 2.4 2.4v4.2a2.4 2.4 0 0 1 -4.8 0V2.4A2.4 2.4 0 0 1 6 0z" fill="#a99fc0" stroke="none"/>
    <path d="M10.5 6.6A4.5 4.5 0 0 1 1.5 6.6"/>
    <line x1="6" y1="11" x2="6" y2="13.5"/>
  </g>

  <!-- Tonfall -->
  <text x="850" y="262" font-family="${FF}" font-size="12" fill="#a99fc0">Tonfall</text>
  <rect x="850" y="270" width="328" height="34" rx="10" fill="#120c1d" stroke="#2c2148"/>
  <text x="866" y="292" font-family="${FF}" font-size="13" fill="#f3f0fa">Professionell</text>
  <path d="M1158 287 l6 6 6 -6" fill="none" stroke="#a99fc0" stroke-width="1.6" stroke-linecap="round"/>

  <!-- Regler -->
  ${slider(330, "Länge", 1010, "mittel")}
  ${slider(358, "Förml.", 1050, "neutral")}

  <!-- Erzeugen-Button -->
  <rect x="850" y="378" width="328" height="40" rx="10" fill="#8b5cf6"/>
  <text x="1014" y="403" text-anchor="middle" font-family="${FF}" font-size="14.5" font-weight="700" fill="#ffffff">E-Mail erzeugen</text>

  <!-- Ergebnis -->
  <text x="850" y="438" font-family="${FF}" font-size="12" fill="#a99fc0">Ergebnis</text>
  <rect x="850" y="446" width="328" height="138" rx="10" fill="#120c1d" stroke="#2c2148"/>
  ${lines(resultLines, 866, 468, 20, `font-family="${FF}" font-size="12.5" fill="#dcd5ef"`)}

  <!-- Einfügen-Button -->
  <rect x="850" y="594" width="328" height="28" rx="9" fill="none" stroke="#2c2148"/>
  <text x="1014" y="612" text-anchor="middle" font-family="${FF}" font-size="12" fill="#f3f0fa">In die E-Mail einfügen</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log("OG-Bild geschrieben:", OUT);
