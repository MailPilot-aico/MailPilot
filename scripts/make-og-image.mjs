/* =========================================================
   MailPilot — Social-Vorschaubild (Open Graph / Twitter Card)
   ---------------------------------------------------------
   Erzeugt public/og.png (1200×630) aus einem SVG im MailPilot-
   Branding: Papierflieger-Logo + Wortmarke + Tagline auf dunklem
   Violett-Verlauf. Wird statisch ausgeliefert (kein dynamisches
   Rendering zur Laufzeit → kein Deploy-/Build-Risiko).

   Neu erzeugen:  node scripts/make-og-image.mjs
   ========================================================= */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "og.png");

const W = 1200, H = 630;

// Papierflieger-Wort-/Bildmarke (identisch zur Marke in der Kopfzeile, viewBox 0 0 32 32).
const planeMark = (scale, tx, ty, opacity = 1) => `
  <g transform="translate(${tx} ${ty}) scale(${scale})" opacity="${opacity}">
    <path d="M5.4 15.2C3.4 17 2.5 19.2 2.8 21.4" stroke="#fff" stroke-opacity=".32" stroke-width="1.7" stroke-linecap="round" fill="none"/>
    <path d="M9.3 18.4C7.6 20.1 6.9 22 7.1 24" stroke="#fff" stroke-opacity=".22" stroke-width="1.7" stroke-linecap="round" fill="none"/>
    <path d="M27.6 4.7 5.1 13.9l9.9 2.3z" fill="#fff"/>
    <path d="M27.6 4.7 15 16.2l-1 11z" fill="#fff" fill-opacity=".7"/>
  </g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#170b25"/>
      <stop offset="1" stop-color="#0a0710"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.16" cy="0.18" r="0.9">
      <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.45"/>
      <stop offset="0.55" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a78bfa"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>

  <!-- Hintergrund + Akzent-Schein -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- großer, dezenter Flieger als Dekoration unten rechts -->
  ${planeMark(15, 760, 250, 0.06)}

  <!-- Logo-Badge -->
  <rect x="96" y="244" width="138" height="138" rx="34" fill="url(#badge)"/>
  ${planeMark(2.95, 117, 265)}

  <!-- Wortmarke + Tagline -->
  <text x="270" y="332" font-family="Segoe UI, Arial, sans-serif" font-size="96" font-weight="800" fill="#ffffff" letter-spacing="-2">MailPilot</text>
  <text x="273" y="392" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="500" fill="#c9bce8">From notes to the perfect email</text>

  <!-- Footer -->
  <text x="98" y="556" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="600" fill="#a78bfa">mailpilot-ai.com</text>
  <text x="1102" y="556" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="500" fill="#6b5d86">AI email copilot</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log("OG-Bild geschrieben:", OUT);
