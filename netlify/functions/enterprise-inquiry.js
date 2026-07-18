/* =========================================================
   MailPilot — Enterprise-Anfrage (Netlify Function)
   ---------------------------------------------------------
   Nimmt das Enterprise-Formular der Landingpage entgegen und
   speichert es DAUERHAFT in Netlify Blobs (Store "inquiries")
   — zusätzlich landet jede Anfrage gut lesbar im Function-Log.

   Nachlesen: Netlify → Site → Blobs → Store "inquiries"
              (bzw. Logs → Functions → enterprise-inquiry).

   BEWUSST OHNE Netlify Forms: die Formular-Erkennung ist bei
   dieser Site nicht aktiviert (nur in der Netlify-Oberfläche
   einschaltbar) und kollidiert mit @netlify/plugin-nextjs.
   Blobs funktioniert ohne jede Konfiguration —
   „nie still verlieren".
   ========================================================= */

import { getStore, connectLambda } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function resp(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
    body: data === null ? "" : JSON.stringify(data),
  };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return resp(204, null);
  if (event.httpMethod !== "POST") return resp(405, { error: "Methode nicht erlaubt." });

  // Blobs-Kontext für v1-Functions einmal pro Aufruf verbinden (wie optimize-email).
  try { connectLambda(event); } catch {}

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return resp(400, { error: "Ungültige Anfrage." });
  }

  const email = String(body.email ?? "").trim().slice(0, 200);
  const message = String(body.message ?? "").trim().slice(0, 5000);
  // Simpler E-Mail-Plausibilitätscheck (kein RFC-Anspruch).
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return resp(400, { error: "Bitte eine gültige E-Mail-Adresse angeben." });
  }
  if (!message) {
    return resp(400, { error: "E-Mail und Nachricht sind erforderlich." });
  }

  const inquiry = {
    email,
    message,
    receivedAt: new Date().toISOString(),
    lang: String(body.lang ?? "").slice(0, 10) || null,
  };

  // Gut sichtbar ins Function-Log — so fällt eine Anfrage selbst dann auf,
  // wenn niemand in den Blobs-Store schaut.
  console.log("ENTERPRISE-ANFRAGE:", JSON.stringify(inquiry));

  try {
    const store = getStore("inquiries");
    const key = inquiry.receivedAt.replace(/[:.]/g, "-") + "_" + email.replace(/[^a-zA-Z0-9@._-]/g, "_");
    await store.set(key, JSON.stringify(inquiry, null, 2));
  } catch (err) {
    // Speichern fehlgeschlagen → dem Kunden NICHT „Erfolg" vorgaukeln.
    console.error("Enterprise-Anfrage konnte nicht gespeichert werden:", err?.message || err);
    return resp(503, { error: "Anfrage konnte gerade nicht gespeichert werden. Bitte direkt an info@mailpilot-ai.com mailen." });
  }

  return resp(200, { ok: true });
};
