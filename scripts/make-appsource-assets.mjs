/* =========================================================
   MailPilot — AppSource-Store-Assets
   ---------------------------------------------------------
   Erzeugt die Bilder für die Outlook-Add-in-Veröffentlichung
   auf Microsoft AppSource (Partner Center). Reicht zum Hochladen.
     appsource-assets/screenshot-1-overview.png  (1280×720)
     appsource-assets/screenshot-2-pane.png      (1280×720)
     appsource-assets/screenshot-3-features.png  (1280×720)
     appsource-assets/logo-48.png / -215 / -300
   Baut auf der Outlook-Szene aus make-og-image.mjs auf
   (englisch, ohne Marketing-CTA → sauberer Produkt-Shot).

   Erzeugen:  node scripts/make-appsource-assets.mjs
   ========================================================= */
import sharp from "sharp";
import { buildSvg, EN } from "./make-og-image.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "appsource-assets");
mkdirSync(OUT, { recursive: true });
const ICON = join(__dirname, "..", "public", "icons", "icon-512.png");

const W = 1280, H = 720;
const FF = "Segoe UI, Arial, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const BG = `<defs>
  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#150c24"/><stop offset="1" stop-color="#0a0710"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.15" cy="0.12" r="0.9">
    <stop offset="0" stop-color="#8b5cf6" stop-opacity="0.30"/>
    <stop offset="0.6" stop-color="#8b5cf6" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>`;

// kleines Papierflieger-Logo
const plane = (s, x, y) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M27.6 4.7 5.1 13.9l9.9 2.3z" fill="#fff"/>
  <path d="M27.6 4.7 15 16.2l-1 11z" fill="#fff" fill-opacity=".7"/></g>`;

// Saubere englische Szene OHNE Marketing-CTA, hochauflösend (1200×630)
const sceneBuf = await sharp(Buffer.from(buildSvg({ ...EN, cta: "" }))).png().toBuffer();

/* ---- Screenshot 1: Überblick (ganze Szene + Headline) ---- */
{
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${BG}
    ${plane(0.85, 470, 40)}
    <text x="510" y="62" font-family="${FF}" font-size="26" font-weight="800" fill="#f3f0fa">MailPilot</text>
    <text x="640" y="116" text-anchor="middle" font-family="${FF}" font-size="30" font-weight="700" fill="#e7defb">From rough notes to a finished email — right inside Outlook</text>
  </svg>`;
  const scene = await sharp(sceneBuf).resize(1120).png().toBuffer(); // 1120×588
  await sharp(Buffer.from(bg)).composite([{ input: scene, left: 80, top: 132 }]).png().toFile(join(OUT, "screenshot-1-overview.png"));
}

/* ---- Screenshot 2: Pane-Nahaufnahme + 3 Schritte ---- */
{
  const pane = await sharp(sceneBuf).extract({ left: 826, top: 52, width: 374, height: 578 }).resize({ height: 600 }).png().toBuffer();
  const step = (n, y, t) => `
    <circle cx="612" cy="${y}" r="17" fill="#8b5cf6"/>
    <text x="612" y="${y + 6}" text-anchor="middle" font-family="${FF}" font-size="18" font-weight="800" fill="#fff">${n}</text>
    <text x="648" y="${y + 6}" font-family="${FF}" font-size="22" fill="#e7defb">${esc(t)}</text>`;
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${BG}
    <text x="600" y="150" font-family="${FF}" font-size="42" font-weight="800" fill="#f3f0fa">Notes in. Perfect email out.</text>
    <text x="600" y="196" font-family="${FF}" font-size="21" fill="#c9bce8">The MailPilot panel sits right next to your message.</text>
    ${step(1, 300, "Type or speak your bullet points")}
    ${step(2, 380, "Pick tone & length, hit Generate")}
    ${step(3, 460, "Insert the finished email — one click")}
    <text x="600" y="560" font-family="${FF}" font-size="18" fill="#a99fc0">Free daily quota · works on Microsoft 365 / Outlook.com mailboxes</text>
  </svg>`;
  await sharp(Buffer.from(bg)).composite([{ input: pane, left: 150, top: 60 }]).png().toFile(join(OUT, "screenshot-2-pane.png"));
}

/* ---- Screenshot 3: Feature-Übersicht ---- */
{
  const feats = [
    ["Notes → email", "Bullet points become a finished, well-written email."],
    ["Reply mode", "Paste the email you got — get a fitting reply."],
    ["Tone & length", "Professional, friendly, formal or casual — your call."],
    ["One-click refine", "Friendlier, shorter, more formal or more assertive."],
    ["15+ languages", "Send your email translated, structure preserved."],
    ["Name & signature", "Set once — inserted automatically, no more [Name]."],
  ];
  const cardW = 548, cardH = 150, gx = 40, gy = 28, x0 = 64, y0 = 168;
  const cards = feats.map((f, i) => {
    const col = i % 2, row = (i / 2) | 0;
    const x = x0 + col * (cardW + gx), y = y0 + row * (cardH + gy);
    return `<rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="16" fill="#140d22" stroke="#2c2148"/>
      <circle cx="${x + 42}" cy="${y + 42}" r="16" fill="#8b5cf6"/>
      <text x="${x + 78}" y="${y + 50}" font-family="${FF}" font-size="24" font-weight="800" fill="#f3f0fa">${esc(f[0])}</text>
      <text x="${x + 30}" y="${y + 96}" font-family="${FF}" font-size="19" fill="#c4b8e6">${esc(f[1])}</text>`;
  }).join("");
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${BG}
    ${plane(0.95, 470, 56)}
    <text x="514" y="84" font-family="${FF}" font-size="30" font-weight="800" fill="#f3f0fa">MailPilot</text>
    <text x="640" y="138" text-anchor="middle" font-family="${FF}" font-size="26" font-weight="600" fill="#c9bce8">Everything you need to write better emails, faster</text>
    ${cards}
  </svg>`;
  await sharp(Buffer.from(bg)).png().toFile(join(OUT, "screenshot-3-features.png"));
}

/* ---- Logo-Größen für AppSource ---- */
for (const s of [48, 215, 300]) {
  await sharp(ICON).resize(s, s).png().toFile(join(OUT, `logo-${s}.png`));
}

console.log("AppSource-Assets geschrieben nach:", OUT);
