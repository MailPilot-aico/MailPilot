/* =========================================================
   MailPilot — Enterprise-Anfrage (Netlify Function)
   ---------------------------------------------------------
   Nimmt die Anfrage aus dem Enterprise-Modal entgegen.
   BEWUSST OHNE Netlify Forms (das kollidiert mit
   @netlify/plugin-nextjs v5). Aktuell: serverseitiges Logging
   + Bestätigung; später leicht erweiterbar (in Supabase
   speichern oder per E-Mail an info@mailpilot-ai.com senden).
   ========================================================= */

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

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return resp(400, { error: "Ungültige Anfrage." });
  }

  const email = String(body.email ?? "").trim();
  const message = String(body.message ?? "").trim();
  if (!email || !message) {
    return resp(400, { error: "E-Mail und Nachricht sind erforderlich." });
  }

  // In den Netlify-Function-Logs sichtbar.
  console.log("Enterprise-Anfrage:", JSON.stringify({ email, message, at: new Date().toISOString() }));

  return resp(200, { ok: true });
};
