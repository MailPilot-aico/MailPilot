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

  // Im Antwort-Modus die erhaltene E-Mail mitgeben und den Antwort-System-Prompt nutzen.
  const userContent = replyTo
    ? controls +
      `Erhaltene E-Mail, auf die geantwortet werden soll:\n"""\n${replyTo}\n"""\n\n` +
      `Stichpunkte des Nutzers für die Antwort:\n${text}`
    : controls + `Notizen / Roher Entwurf:\n${text}`;

  try {
    const message = await getClient().messages.create({
      model: MODEL,
      max_tokens: length >= 67 || replyTo ? 3000 : 2000, // mehr Spielraum bei langer Mail / Antwort
      system: replyTo ? REPLY_SYSTEM_PROMPT : SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    // Verbrauch erst nach Erfolg hochzählen (Blobs-Fehler werden geschluckt –
    // sie dürfen das bereits erzeugte Ergebnis nicht zunichtemachen).
    await bumpUsed(key, used);

    return resp(200, { email: extractText(message), remaining: Math.max(0, FREE_LIMIT - (used + 1)) });
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
