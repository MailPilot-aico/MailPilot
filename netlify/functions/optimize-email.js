/* =========================================================
   MailPilot — Backend (Netlify Function)
   ---------------------------------------------------------
   - Nur für angemeldete Clerk-Nutzer (Token serverseitig geprüft).
   - Zählt das Tageslimit (5/Tag) FÄLSCHUNGSSICHER pro Account
     serverseitig in Netlify Blobs – der Browser kann das
     nicht umgehen.
   - GET  → aktuellen Reststand zurückgeben (zählt nicht)
   - POST → E-Mail erzeugen und Verbrauch hochzählen
   Der API-Schlüssel bleibt serverseitig (ANTHROPIC_API_KEY).

   Endpunkt: /.netlify/functions/optimize-email
   ========================================================= */

import Anthropic from "@anthropic-ai/sdk";
import { connectLambda, getStore } from "@netlify/blobs";
import { verifyToken } from "@clerk/backend";

// Anthropic-Client erst bei Bedarf erzeugen. Würde er beim Laden des Moduls
// erstellt und fehlte der ANTHROPIC_API_KEY, würde die GANZE Funktion abstürzen
// (auch der Login-Check und die GET-Reststandsabfrage). Lazy-Init hält die
// Funktion stabil; ein fehlender Schlüssel meldet sich erst beim Optimieren.
let _client;
function getClient() {
  if (!_client) _client = new Anthropic(); // liest ANTHROPIC_API_KEY aus der Umgebung
  return _client;
}

// Clerk-Session-Token (Authorization: Bearer …) serverseitig prüfen und die
// Konto-ID zurückgeben (Firma bevorzugt, sonst Nutzer). Gleiches Muster wie
// in devices.js (serverseitige Clerk-Token-Prüfung).
async function getAccountId(event) {
  const headers = event.headers || {};
  const auth = headers.authorization || headers.Authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return payload.org_id || payload.sub || null;
  } catch {
    return null;
  }
}

// Modell. Alternativen für hohes Volumen / weniger Kosten:
//   "claude-sonnet-4-6"  – günstiger, sehr gut für diese Aufgabe
//   "claude-haiku-4-5"   – am günstigsten/schnellsten
const MODEL = "claude-sonnet-4-6";

const FREE_LIMIT = 5; // Gratis-Optimierungen pro Tag und Account

const TONES = {
  professionell: "professionell und sachlich",
  freundlich:    "freundlich und zugänglich",
  foermlich:     "förmlich und sehr höflich",
  locker:        "locker und ungezwungen",
};

// Regler „Länge" und „Formalität" kommen STUFENLOS als Wert 0–100 vom Frontend
// und werden als Skala in den Prompt geschrieben (Standard 50 = Mitte).
function clampScale(v) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, n));
}

const SYSTEM_PROMPT = `Du bist ein E-Mail-Copilot. Aus den rohen Notizen oder Stichpunkten des Nutzers formulierst du eine fertige, gut lesbare deutsche E-Mail.

Regeln:
- Schreibe die E-Mail vollständig aus: passende Anrede, klar strukturierter Fließtext und passende Grußformel.
- Halte den gewünschten Tonfall durchgängig ein.
- Bleibe inhaltlich exakt bei dem, was der Nutzer vorgibt. Erfinde keine Fakten, Namen, Termine oder Zusagen.
- Fehlt eine konkrete Angabe (z. B. der Name des Empfängers), nutze einen neutralen Platzhalter in eckigen Klammern, etwa [Name] oder [Datum].
- Fasse dich angemessen kurz und komm auf den Punkt.
- Gib ausschließlich die fertige E-Mail aus – keine Einleitung, keine Erklärungen, keine Kommentare, keine Auswahlmöglichkeiten.`;

// Antwort-Modus: Der Nutzer hat eine E-Mail ERHALTEN und möchte darauf antworten.
const REPLY_SYSTEM_PROMPT = `Du bist ein E-Mail-Copilot. Der Nutzer hat eine E-Mail erhalten und möchte darauf antworten. Aus der erhaltenen E-Mail und den Stichpunkten des Nutzers formulierst du eine passende, fertige deutsche Antwort-E-Mail.

Regeln:
- Beziehe dich inhaltlich auf die erhaltene E-Mail und beantworte sie sinnvoll und vollständig.
- Wenn der Name des Absenders aus der erhaltenen E-Mail hervorgeht, verwende ihn in der Anrede.
- Schreibe die Antwort vollständig aus: passende Anrede, klar strukturierter Fließtext und passende Grußformel.
- Halte den gewünschten Tonfall durchgängig ein.
- Bleibe inhaltlich bei dem, was der Nutzer in den Stichpunkten vorgibt. Erfinde keine Fakten, Namen, Termine oder Zusagen.
- Fehlt eine konkrete Angabe (z. B. dein eigener Name), nutze einen neutralen Platzhalter in eckigen Klammern, etwa [Name] oder [Datum].
- Gib ausschließlich die fertige Antwort-E-Mail aus – keine Einleitung, keine Erklärungen, keine Kommentare.`;

// Verbessern-Modus (Schnell-Buttons „freundlicher/kürzer/…"): bestehende E-Mail überarbeiten.
const REFINE_SYSTEM_PROMPT = `Du bist ein E-Mail-Copilot. Überarbeite die E-Mail des Nutzers gemäß seiner Anweisung. Behalte die SPRACHE der E-Mail bei. Ändere nur, was die Anweisung verlangt; bleibe inhaltlich treu und erfinde nichts. Gib ausschließlich die überarbeitete E-Mail aus – keinen Betreff, keine Erklärungen, keine Kommentare.`;

// Entschärfen-Modus: aus einem wütenden/emotionalen Entwurf eine sachliche, professionelle Mail machen.
const DEESCALATE_SYSTEM_PROMPT = `Du bist ein E-Mail-Copilot. Der Nutzer hat einen emotionalen, verärgerten oder zu scharf formulierten Entwurf geschrieben. Formuliere daraus eine sachliche, professionelle und höfliche E-Mail.

Regeln:
- Behalte das eigentliche Anliegen und die Fakten vollständig bei; entferne Beleidigungen, Schuldzuweisungen, Sarkasmus und übermäßige Emotionen.
- Bleibe in der Sache klar und bestimmt, im Ton aber ruhig, respektvoll und deeskalierend.
- Schreibe eine vollständige E-Mail mit passender Anrede und Grußformel.
- Erfinde keine Fakten. Fehlt eine Angabe, nutze einen neutralen Platzhalter wie [Name] oder [Datum].
- Gib ausschließlich die fertige E-Mail aus – keine Einleitung, keine Erklärungen, keine Kommentare.`;

// Betreffzeile aus der Modell-Antwort trennen (Format „BETREFF: …" als erste Zeile).
function parseSubject(raw, wantSubject) {
  let s = String(raw || "").trim();
  let subject = "";
  if (wantSubject) {
    const m = s.match(/^\s*betreff:\s*(.+?)\s*(?:\n+|$)/i);
    if (m) { subject = m[1].trim(); s = s.slice(m[0].length).trim(); }
  }
  return { subject, email: s };
}

// Unterstützte Zielsprachen für die Übersetzungsfunktion (Code → Sprachname für „ins …")
const LANGS = {
  de: "Deutsche",
  en: "Englische",
  es: "Spanische",
  fr: "Französische",
  it: "Italienische",
  pt: "Portugiesische",
  "pt-BR": "Portugiesische (brasilianisch)",
  nl: "Niederländische",
  pl: "Polnische",
  tr: "Türkische",
  ru: "Russische",
  zh: "Chinesische (vereinfacht)",
  ja: "Japanische",
  ko: "Koreanische",
  ar: "Arabische",
  hi: "Hindi",
};

const translateSystem = (langName) => `Du bist ein professioneller Übersetzer. Übersetze die E-Mail des Nutzers vollständig und natürlich ins ${langName}.

Regeln:
- Übersetze ausschließlich; ändere weder Inhalt noch Tonfall noch Bedeutung.
- Behalte die Struktur und Zeilenumbrüche bei (Anrede, Absätze, Grußformel).
- Lasse Platzhalter in eckigen Klammern wie [Name] oder [Datum] unverändert.
- Verwende die in der Zielsprache übliche, passende Anrede- und Grußformel.
- Gib ausschließlich die übersetzte E-Mail aus – keine Einleitung, keine Erklärungen, keine Kommentare.`;

export const handler = async (event) => {
  // CORS-Preflight (nötig, damit die Desktop-App von einer anderen Origin
  // aus zugreifen darf; im Web-Deploy mit gleicher Origin harmlos).
  if (event.httpMethod === "OPTIONS") {
    return resp(204, null);
  }

  // Nutzer aus Clerk – Session-Token serverseitig mit CLERK_SECRET_KEY geprüft.
  // accountId ist nur gesetzt, wenn ein gültiges Token mitgeschickt wurde.
  const accountId = await getAccountId(event);
  if (!accountId) {
    return resp(401, { error: "Bitte melde dich an, um den Copiloten zu nutzen." });
  }

  // WICHTIG: In einer klassischen (Lambda-)Netlify-Function muss der Blobs-Kontext
  // EINMAL pro Aufruf mit dem Event verbunden werden – sonst wirft jeder store-Zugriff
  // „MissingBlobsEnvironmentError" und die GANZE Funktion liefert 500 (Generierung tot).
  // Bei v2-Functions ist das automatisch; bei dieser v1-Function nicht.
  try { connectLambda(event); } catch {}

  // Tageszähler je Account und Datum – liegt serverseitig in Netlify Blobs.
  // Robust: schlägt Blobs fehl, blockiert das NICHT die Generierung (Limit greift dann
  // nur „best effort"). So funktioniert die KI auch ohne korrekt eingerichtetes Blobs.
  const today = new Date().toISOString().slice(0, 10); // JJJJ-MM-TT
  const key = `${accountId}:${today}`;
  const used = await readUsed(key);

  // GET: aktuellen Reststand melden, ohne zu zählen.
  if (event.httpMethod === "GET") {
    return resp(200, { remaining: Math.max(0, FREE_LIMIT - used) });
  }

  if (event.httpMethod !== "POST") {
    return resp(405, { error: "Methode nicht erlaubt." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return resp(400, { error: "Ungültige Anfrage." });
  }

  const text = String(body.text ?? "").trim();
  const targetLang = typeof body.targetLang === "string" ? body.targetLang.trim() : "";
  // Antwort-Modus (optional): die erhaltene E-Mail, auf die geantwortet werden soll.
  const replyTo = String(body.replyTo ?? "").trim().slice(0, 8000);

  if (!text) {
    return resp(400, { error: "Es wurden keine Notizen übergeben." });
  }
  if (text.length > 6000) {
    return resp(413, { error: "Der Text ist zu lang (max. 6000 Zeichen)." });
  }

  // ---- Übersetzungs-Modus: bestehende E-Mail übersetzen (zählt NICHT gegen das Tageslimit) ----
  if (targetLang) {
    if (!LANGS[targetLang]) {
      return resp(400, { error: "Sprache nicht unterstützt." });
    }
    try {
      const message = await getClient().messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: translateSystem(LANGS[targetLang]),
        messages: [{ role: "user", content: text }],
      });
      return resp(200, { email: extractText(message), remaining: Math.max(0, FREE_LIMIT - used) });
    } catch (err) {
      return apiError(err);
    }
  }

  // ---- Verbessern-Modus (Schnell-Buttons): bestehende E-Mail überarbeiten (zählt NICHT) ----
  const refine = String(body.refine ?? "").trim().slice(0, 300);
  if (refine) {
    try {
      const message = await getClient().messages.create({
        model: MODEL,
        max_tokens: 3000,
        system: REFINE_SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Anweisung: ${refine}\n\nE-Mail:\n${text}` }],
      });
      return resp(200, { email: extractText(message), remaining: Math.max(0, FREE_LIMIT - used) });
    } catch (err) {
      return apiError(err);
    }
  }

  // ---- Optimierungs-Modus: aus Notizen eine E-Mail erzeugen (zählt) ----
  // Tageslimit fälschungssicher prüfen.
  if (used >= FREE_LIMIT) {
    return resp(429, { error: "Tageslimit erreicht.", limitReached: true, remaining: 0 });
  }

  const tone = TONES[body.tone] ? body.tone : "professionell";
  const length = clampScale(body.length);       // 0 = sehr kurz … 100 = sehr ausführlich
  const formality = clampScale(body.formality);  // 0 = sehr locker … 100 = sehr förmlich

  // Gemeinsamer Steuer-Block (Tonfall/Länge/Förmlichkeit) für beide Modi.
  const controls =
    `Gewünschter Tonfall: ${TONES[tone]}.\n` +
    `Gewünschte Länge auf einer Skala von 0 (sehr kurz und knapp) bis 100 (sehr ausführlich und detailliert): ${length}.\n` +
    `Gewünschte Förmlichkeit auf einer Skala von 0 (sehr locker, Du-Form) bis 100 (sehr förmlich, Sie-Form): ${formality}.\n\n`;

  // Optionale Extras: persönlicher Stil (4), Betreff (7), Varianten (6), Entschärfen.
  const style = String(body.style ?? "").trim().slice(0, 4000);
  const wantSubject = body.subject === true;
  const variants = Math.min(3, Math.max(1, parseInt(body.variants, 10) || 1));
  const deescalate = body.deescalate === true;

  // Eingabe je nach Modus aufbereiten (Entschärfen > Antwort > normale Notizen).
  let userContent;
  if (deescalate) {
    userContent = controls + `Verärgerter, emotionaler oder zu scharfer Entwurf des Nutzers, den du sachlich, professionell und deeskalierend umformulierst:\n${text}`;
  } else if (replyTo) {
    userContent = controls +
      `Erhaltene E-Mail, auf die geantwortet werden soll:\n"""\n${replyTo}\n"""\n\n` +
      `Stichpunkte des Nutzers für die Antwort:\n${text}`;
  } else {
    userContent = controls + `Notizen / Roher Entwurf:\n${text}`;
  }
  if (style) {
    userContent += `\n\nSchreibe im persönlichen Stil dieser Beispiel-E-Mails des Nutzers (übernimm Ton, Wortwahl und typische Formulierungen, NICHT deren konkreten Inhalt):\n"""\n${style}\n"""`;
  }

  const subjectRule = wantSubject
    ? `\n\nBeginne JEDE E-Mail mit einer eigenen Zeile im Format "BETREFF: <prägnante Betreffzeile>", danach eine Leerzeile, dann die eigentliche E-Mail.`
    : "";
  const variantsRule = variants > 1
    ? `\n\nErzeuge ${variants} deutlich unterschiedliche Varianten der E-Mail. Trenne die Varianten durch eine eigene Zeile mit ausschließlich "#####". Keine Nummerierung, keine Kommentare.`
    : "";
  const baseSystem = deescalate ? DEESCALATE_SYSTEM_PROMPT : (replyTo ? REPLY_SYSTEM_PROMPT : SYSTEM_PROMPT);
  const system = baseSystem + subjectRule + variantsRule;

  try {
    const baseTokens = length >= 67 || replyTo ? 3000 : 2000;
    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: Math.min(8000, baseTokens * variants), // mehr Spielraum für Varianten/lange Mails
      system,
      messages: [{ role: "user", content: userContent }],
    });

    // Verbrauch erst nach Erfolg hochzählen (Blobs-Fehler werden geschluckt –
    // sie dürfen das bereits erzeugte Ergebnis nicht zunichtemachen).
    await bumpUsed(key, used);

    const full = extractText(message);
    const parts = variants > 1
      ? full.split(/\n\s*#####\s*\n/).map((x) => x.trim()).filter(Boolean)
      : [full];
    const parsed = parts.map((p) => parseSubject(p, wantSubject));

    const out = { email: parsed[0].email, remaining: Math.max(0, FREE_LIMIT - (used + 1)) };
    if (wantSubject) out.subject = parsed[0].subject;
    if (variants > 1 && parsed.length > 1) {
      out.variants = parsed.map((p) => ({ subject: p.subject, email: p.email }));
    }
    return resp(200, out);
  } catch (err) {
    return apiError(err);
  }
};

// Tageslimit lesen – schlägt Netlify Blobs fehl, wird 0 angenommen (Limit greift
// dann nicht, aber die Generierung läuft weiter). NIE den Aufruf abbrechen lassen.
async function readUsed(key) {
  try {
    const store = getStore("usage");
    return parseInt((await store.get(key)) || "0", 10) || 0;
  } catch (err) {
    console.error("Blobs nicht verfügbar (Limit wird nicht gezählt):", err?.message || err);
    return 0;
  }
}

// Tageslimit hochzählen – Fehler werden bewusst geschluckt, damit ein Blobs-Problem
// das bereits erzeugte Ergebnis nicht kaputt macht.
async function bumpUsed(key, used) {
  try {
    const store = getStore("usage");
    await store.set(key, String(used + 1));
  } catch (err) {
    console.error("Blobs-Schreiben fehlgeschlagen:", err?.message || err);
  }
}

// Textblöcke der Claude-Antwort zu einem String zusammenführen.
function extractText(message) {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

// Einheitliche Fehlerbehandlung für Claude-API-Aufrufe.
function apiError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return resp(500, { error: "API-Schlüssel fehlt oder ist ungültig." });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return resp(429, { error: "Zu viele Anfragen – bitte kurz warten." });
  }
  console.error("Claude-API-Fehler:", err);
  return resp(502, { error: "Die KI konnte gerade nicht antworten." });
}

// CORS-Header: erlauben den Zugriff aus der Tauri-Desktop-App.
// Bearer-Token (kein Cookie) => "*" ist hier zulässig.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

// Kleine Hilfsfunktion: JSON-Antwort mit Statuscode.
function resp(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
    body: data === null ? "" : JSON.stringify(data),
  };
}
