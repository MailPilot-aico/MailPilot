/* =========================================================
   MailPilot — Geräte-/Platz-Limit (Netlify Function)
   ---------------------------------------------------------
   Auth:  Clerk-Session-Token (Authorization: Bearer …) wird
          serverseitig mit dem CLERK_SECRET_KEY geprüft.
   Daten: Supabase (Tabellen subscriptions + devices),
          Zugriff über den service_role-Key (umgeht RLS).

   GET    -> Status: { plan, limit, used, devices: [...] }
   POST   -> Gerät aktivieren { deviceId, label }
             -> 200 { ok, used, limit }  oder  403 { limitReached, used, limit }
   DELETE -> Gerät entfernen  { deviceId } -> 200 { ok }
   ========================================================= */

import { verifyToken } from "@clerk/backend";
import { supabase } from "./lib/supabase.js";
import { PLAN_LIMITS, seatLimitFor } from "./lib/limits.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function resp(statusCode, data) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
    body: data === null ? "" : JSON.stringify(data),
  };
}

// Clerk-Token prüfen → Konto-ID (Firma bevorzugt, sonst Nutzer).
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

// Plan + effektives Geräte-Limit für das Konto laden (kein Abo → free/1).
async function loadPlan(accountId) {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, seat_limit, status")
    .eq("account_id", accountId)
    .maybeSingle();

  if (data && data.status === "active") {
    return { plan: data.plan, limit: seatLimitFor(data.plan, data.seat_limit) };
  }
  return { plan: "free", limit: PLAN_LIMITS.free };
}

async function countDevices(accountId) {
  const { count } = await supabase
    .from("devices")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);
  return count || 0;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return resp(204, null);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return resp(500, { error: "Supabase-Umgebungsvariablen fehlen (URL / SERVICE_ROLE_KEY)." });
  }

  const accountId = await getAccountId(event);
  if (!accountId) return resp(401, { error: "Nicht angemeldet." });

  const { plan, limit } = await loadPlan(accountId);

  // ---- Status abrufen ----
  if (event.httpMethod === "GET") {
    const { data: devices } = await supabase
      .from("devices")
      .select("device_id, label, last_seen_at")
      .eq("account_id", accountId)
      .order("created_at", { ascending: true });
    return resp(200, { plan, limit, used: devices?.length || 0, devices: devices || [] });
  }

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}

  // ---- Gerät entfernen ----
  if (event.httpMethod === "DELETE") {
    if (!body.deviceId) return resp(400, { error: "deviceId fehlt." });
    const { error } = await supabase
      .from("devices")
      .delete()
      .eq("account_id", accountId)
      .eq("device_id", String(body.deviceId));
    if (error) return resp(500, { error: error.message });
    return resp(200, { ok: true, used: await countDevices(accountId), limit });
  }

  // ---- Gerät aktivieren (Limit fälschungssicher serverseitig) ----
  if (event.httpMethod === "POST") {
    const deviceId = String(body.deviceId || "").trim();
    if (!deviceId) return resp(400, { error: "deviceId fehlt." });

    // Bereits registriert? → nur "zuletzt gesehen" aktualisieren.
    const { data: existing } = await supabase
      .from("devices")
      .select("id")
      .eq("account_id", accountId)
      .eq("device_id", deviceId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      return resp(200, { ok: true, used: await countDevices(accountId), limit });
    }

    // Limit prüfen: genau "limit" Geräte, kein einziges mehr.
    const used = await countDevices(accountId);
    if (used >= limit) {
      return resp(403, { limitReached: true, used, limit });
    }

    const { error } = await supabase
      .from("devices")
      .insert({ account_id: accountId, device_id: deviceId, label: body.label || null });
    if (error) return resp(500, { error: error.message });

    return resp(200, { ok: true, used: used + 1, limit });
  }

  return resp(405, { error: "Methode nicht erlaubt." });
};
