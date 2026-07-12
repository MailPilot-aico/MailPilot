/* =========================================================
   MailPilot — Stil-Profil / "Gehirn" (Netlify Function)
   ---------------------------------------------------------
   Auth:  Clerk-Session-Token (Authorization: Bearer …),
          serverseitig mit CLERK_SECRET_KEY geprüft.
   Daten: Supabase-Tabelle public.profiles (service_role).

   GET  -> aktuelles Profil des Kontos zurückgeben
   PUT  -> Profilfelder speichern (Name, Signatur, Branche, Regler)
   POST -> aus einer echten E-Mail lernen: { learnFrom: "<Mailtext>" }
           hängt sie als Beispiel an und verfeinert style_summary.

   Endpunkt: /.netlify/functions/profile
   ========================================================= */

import Anthropic from "@anthropic-ai/sdk";
import { connectLambda, getStore } from "@netlify/blobs";
import { verifyToken } from "@clerk/backend";
import { loadProfile, upsertProfile, appendSample } from "./lib/profile.js";

// Kosten-Bremse: so oft darf pro Konto und Tag der Stil per KI destilliert werden.
// Darüber hinaus werden Beispiele weiter gesammelt, aber ohne KI-Aufruf (der
// nächste Destillier-Lauf am Folgetag nimmt sie automatisch mit).
const DISTILL_DAILY_LIMIT = 20;

// Destillier-Zähler lesen/erhöhen (Netlify Blobs, best effort wie in optimize-email:
// schlägt Blobs fehl, wird NICHT blockiert – dann greift nur die Bremse nicht).
async function readDistillCount(key) {
  try { return parseInt((await getStore("usage").get(key)) || "0", 10) || 0; }
  catch { return 0; }
}
async function bumpDistillCount(key, n) {
  try { await getStore("usage").set(key, String(n + 1)); } catch {}
}

// Günstiges, schnelles Modell fürs Stil-Zusammenfassen (nicht die teure Generierung).
const DISTILL_MODEL = "claude-haiku-4-5";
const TONE_KEYS = ["professionell", "freundlich", "foermlich", "locker"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function resp(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
    body: data === null ? "" : JSON.stringify(data),
  };
}

async function getAccountId(event) {
  const auth = event.headers.authorization || event.headers.Authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return payload.org_id || payload.sub || null;
  } catch {
    return null;
  }
}

function clampScaleOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, n));
}

// Nur die nach außen sinnvollen Felder zurückgeben (keine internen Rohdaten-Fluten):
// samples bleiben serverseitig, nach außen nur die Anzahl + ob schon ein Stil gelernt wurde.
function publicView(p) {
  if (!p) {
    return { sender_name: "", signature: "", industry: "", default_tone: "", default_length: null, default_formality: null, preferred_lang: "", style_summary: "", learning: true, sample_count: 0, has_style: false };
  }
  return {
    sender_name: p.sender_name || "",
    signature: p.signature || "",
    industry: p.industry || "",
    default_tone: p.default_tone || "",
    default_length: p.default_length ?? null,
    default_formality: p.default_formality ?? null,
    preferred_lang: p.preferred_lang || "",
    style_summary: p.style_summary || "",
    learning: p.learning !== false,
    sample_count: Array.isArray(p.samples) ? p.samples.length : 0,
    has_style: Boolean(p.style_summary),
    updated_at: p.updated_at || null,
  };
}

// Aus den gesammelten Beispiel-Mails eine kompakte Stil-Beschreibung destillieren.
// Bewusst NUR Stil (Anrede, Grußformel, Satzbau, Förmlichkeit, typische Wendungen),
// KEINE Inhalte – die kompakte Zusammenfassung landet später im Generierungs-Prompt.
async function distillStyle(samples) {
  const joined = samples.slice(0, 8).map((s, i) => `--- Beispiel ${i + 1} ---\n${s}`).join("\n\n");
  const system = `Du analysierst den Schreibstil eines Nutzers anhand seiner E-Mails und fasst ihn in 3–6 knappen deutschen Stichpunkten zusammen.
Erfasse NUR den STIL: bevorzugte Anrede und Grußformel, Satzlänge, Förmlichkeit (Du/Sie), Ton, typische Formulierungen/Floskeln, Emoji-Nutzung.
Gib KEINE Inhalte, Namen, Firmen oder Fakten wieder. Antworte ausschließlich mit den Stichpunkten, ohne Einleitung.`;
  const message = await new Anthropic().messages.create({
    model: DISTILL_MODEL,
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: `E-Mails des Nutzers:\n\n${joined}` }],
  });
  return message.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

// Signatur-Vorschlag aus einer echten Mail ziehen (heuristisch, ohne KI-Kosten):
// findet in den letzten Zeilen eine übliche Grußformel und nimmt den Block ab dort
// (Grußformel + Name/Firma, max. 5 Zeilen / 200 Zeichen). Nichts gefunden → "".
function extractSignature(text) {
  const lines = String(text || "").trim().split(/\r?\n/).map((l) => l.trim());
  const rx = /^(mit (freundlichen|besten|herzlichen) grüßen|beste grüße|viele grüße|liebe grüße|herzliche grüße|freundliche grüße|schöne grüße|gruß|grüße|lg|mfg|vg|kind regards|best regards|warm regards|regards|best|cheers)[,!.]?$/i;
  for (let i = Math.max(0, lines.length - 6); i < lines.length; i++) {
    if (rx.test(lines[i]) && lines.length - i <= 5) {
      const sig = lines.slice(i).filter(Boolean).join("\n").slice(0, 200).trim();
      if (sig) return sig;
    }
  }
  return "";
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return resp(204, null);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return resp(500, { error: "Supabase-Umgebungsvariablen fehlen (URL / SERVICE_ROLE_KEY)." });
  }

  const accountId = await getAccountId(event);
  if (!accountId) return resp(401, { error: "Nicht angemeldet." });

  // Blobs-Kontext für den Destillier-Zähler verbinden (v1-Function, wie optimize-email).
  try { connectLambda(event); } catch {}

  // ---- Profil abrufen ----
  if (event.httpMethod === "GET") {
    const p = await loadProfile(accountId);
    return resp(200, publicView(p));
  }

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch { return resp(400, { error: "Ungültige Anfrage." }); }

  // ---- Profil speichern (Name, Signatur, Branche, Standard-Regler) ----
  if (event.httpMethod === "PUT") {
    const fields = {};
    if (body.sender_name !== undefined)  fields.sender_name  = String(body.sender_name || "").trim().slice(0, 80) || null;
    if (body.signature !== undefined)    fields.signature    = String(body.signature || "").trim().slice(0, 500) || null;
    if (body.industry !== undefined)     fields.industry     = String(body.industry || "").trim().slice(0, 80) || null;
    if (body.default_tone !== undefined) fields.default_tone = TONE_KEYS.includes(body.default_tone) ? body.default_tone : null;
    if (body.default_length !== undefined)    fields.default_length    = clampScaleOrNull(body.default_length);
    if (body.default_formality !== undefined) fields.default_formality = clampScaleOrNull(body.default_formality);
    if (body.learning !== undefined)     fields.learning     = body.learning !== false;
    // Bevorzugte Übersetzungs-Zielsprache: nur gültige Sprachcodes (z. B. 'en', 'pt-BR').
    if (body.preferred_lang !== undefined) {
      const pl = String(body.preferred_lang || "").trim();
      fields.preferred_lang = /^[a-z]{2}(-[A-Z]{2})?$/.test(pl) ? pl : null;
    }

    if (Object.keys(fields).length === 0) return resp(400, { error: "Keine gültigen Felder zum Speichern." });

    try {
      const saved = await upsertProfile(accountId, fields);
      return resp(200, publicView(saved));
    } catch (err) {
      return resp(500, { error: err?.message || "Speichern fehlgeschlagen." });
    }
  }

  // ---- Aus einer echten E-Mail lernen ----
  if (event.httpMethod === "POST") {
    const learnFrom = String(body.learnFrom || "").trim();
    if (!learnFrom) return resp(400, { error: "learnFrom (Mailtext) fehlt." });

    const current = await loadProfile(accountId);
    // Lernen respektiert den Schalter: ist es ausgeschaltet, nur bestätigen, nichts speichern.
    if (current && current.learning === false) {
      return resp(200, { ...publicView(current), learned: false });
    }

    const samples = appendSample(current?.samples, learnFrom);
    let style_summary = current?.style_summary || "";
    // Kosten-Bremse: KI-Destillieren maximal DISTILL_DAILY_LIMIT-mal pro Tag/Konto.
    // Darüber wird das Beispiel trotzdem gespeichert (fließt später ein).
    const distillKey = `distill:${accountId}:${new Date().toISOString().slice(0, 10)}`;
    const distills = await readDistillCount(distillKey);
    if (distills < DISTILL_DAILY_LIMIT) {
      try {
        style_summary = await distillStyle(samples);
        await bumpDistillCount(distillKey, distills);
      } catch (err) {
        // Destillieren fehlgeschlagen (z. B. API-Limit): Beispiel trotzdem behalten,
        // alten Stil beibehalten – kein harter Fehler für den Nutzer.
        console.error("Stil-Destillieren fehlgeschlagen:", err?.message || err);
      }
    }

    // Signatur automatisch lernen: hat der Nutzer noch KEINE Signatur hinterlegt,
    // die Grußformel + Name aus der gelernten Mail als Signatur übernehmen.
    const fields = { samples, style_summary };
    if (!String(current?.signature || "").trim()) {
      const sig = extractSignature(learnFrom);
      if (sig) fields.signature = sig;
    }

    try {
      const saved = await upsertProfile(accountId, fields);
      return resp(200, { ...publicView(saved), learned: true, signature_learned: Boolean(fields.signature) });
    } catch (err) {
      return resp(500, { error: err?.message || "Lernen fehlgeschlagen." });
    }
  }

  // ---- Gelernten Stil zurücksetzen ("Recht auf Vergessen") ----
  // Leert nur den GELERNTEN Teil (style_summary + samples); Name, Signatur,
  // Branche und Regler bleiben erhalten (das sind bewusste Einstellungen).
  if (event.httpMethod === "DELETE") {
    try {
      const saved = await upsertProfile(accountId, { style_summary: "", samples: [] });
      return resp(200, { ...publicView(saved), reset: true });
    } catch (err) {
      return resp(500, { error: err?.message || "Zurücksetzen fehlgeschlagen." });
    }
  }

  return resp(405, { error: "Methode nicht erlaubt." });
};
