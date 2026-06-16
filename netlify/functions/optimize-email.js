/* =========================================================
   MailPilot — Backend (Netlify Function)
   ---------------------------------------------------------
   - Nur für angemeldete Netlify-Identity-Nutzer.
   - Zählt das Tageslimit (5/Tag) FÄLSCHUNGSSICHER pro Account
     serverseitig in Netlify Blobs – der Browser kann das
     nicht umgehen.
   - GET  → aktuellen Reststand zurückgeben (zählt nicht)
   - POST → E-Mail erzeugen und Verbrauch hochzählen
   Der API-Schlüssel bleibt serverseitig (ANTHROPIC_API_KEY).

   Endpunkt: /.netlify/functions/optimize-email
   ========================================================= */

import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";

const client = new Anthropic();

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

const SYSTEM_PROMPT = `Du bist ein E-Mail-Copilot. Aus den rohen Notizen oder Stichpunkten des Nutzers formulierst du eine fertige, gut lesbare deutsche E-Mail.

Regeln:
- Schreibe die E-Mail vollständig aus: passende Anrede, klar strukturierter Fließtext und passende Grußformel.
- Halte den gewünschten Tonfall durchgängig ein.
- Bleibe inhaltlich exakt bei dem, was der Nutzer vorgibt. Erfinde keine Fakten, Namen, Termine oder Zusagen.
- Fehlt eine konkrete Angabe (z. B. der Name des Empfängers), nutze einen neutralen Platzhalter in eckigen Klammern, etwa [Name] oder [Datum].
- Fasse dich angemessen kurz und komm auf den Punkt.
- Gib ausschließlich die fertige E-Mail aus – keine Einleitung, keine Erklärungen, keine Kommentare, keine Auswahlmöglichkeiten.`;

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

export const handler = async (event, context) => {
  // CORS-Preflight (nötig, damit die Desktop-App von einer anderen Origin
  // aus zugreifen darf; im Web-Deploy mit gleicher Origin harmlos).
  if (event.httpMethod === "OPTIONS") {
    return resp(204, null);
  }

  // Nutzer aus Netlify Identity – von Netlify serverseitig verifiziert.
  // Ist nur gesetzt, wenn ein gültiges Identity-Token mitgeschickt wurde.
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return resp(401, { error: "Bitte melde dich an, um den Copiloten zu nutzen." });
  }

  // Tageszähler je Account und Datum – liegt serverseitig in Netlify Blobs.
  const store = getStore("usage");
  const today = new Date().toISOString().slice(0, 10); // JJJJ-MM-TT
  const key = `${user.sub}:${today}`;
  const used = parseInt((await store.get(key)) || "0", 10) || 0;

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
      const message = await client.messages.create({
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

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Gewünschter Tonfall: ${TONES[tone]}.\n\nNotizen / Roher Entwurf:\n${text}`,
        },
      ],
    });

    // Verbrauch erst nach Erfolg hochzählen.
    await store.set(key, String(used + 1));

    return resp(200, { email: extractText(message), remaining: Math.max(0, FREE_LIMIT - (used + 1)) });
  } catch (err) {
    return apiError(err);
  }
};

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
