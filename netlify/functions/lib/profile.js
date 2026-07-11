/* =========================================================
   MailPilot — Stil-Profil je Konto ("MailPilot-Gehirn").
   ---------------------------------------------------------
   Lesen/Schreiben des persönlichen Profils in Supabase
   (Tabelle public.profiles, Zugriff über service_role).

   BEST EFFORT: Fällt Supabase aus oder fehlen die Umgebungs-
   variablen, gibt loadProfile() einfach null zurück – die
   E-Mail-Erzeugung darf dadurch NIE blockiert werden.
   ========================================================= */

import { supabase } from "./supabase.js";

export const MAX_SAMPLES = 8;      // so viele Beispiel-/Sende-Mails behalten wir zum Lernen
export const MAX_SAMPLE_LEN = 6000; // pro Beispiel gespeicherte Zeichen (Kappung)

// Ist Supabase überhaupt konfiguriert? (sonst gar nicht erst versuchen)
export function profilesConfigured() {
  return Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY));
}

// Profil eines Kontos laden – nie werfen, im Fehlerfall null.
export async function loadProfile(accountId) {
  if (!accountId || !profilesConfigured()) return null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();
    return data || null;
  } catch (err) {
    console.error("Profil laden fehlgeschlagen:", err?.message || err);
    return null;
  }
}

// Profil anlegen/aktualisieren (Upsert). Wirft bei echtem DB-Fehler,
// damit der Aufrufer (profile-Endpunkt) es dem Nutzer melden kann.
export async function upsertProfile(accountId, fields) {
  const row = { account_id: accountId, ...fields, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "account_id" })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Eine neue Beispiel-/Sende-Mail vorne anhängen und die Liste kappen.
export function appendSample(samples, text) {
  const clean = String(text || "").trim().slice(0, MAX_SAMPLE_LEN);
  if (!clean) return Array.isArray(samples) ? samples : [];
  const list = Array.isArray(samples) ? samples : [];
  return [clean, ...list].slice(0, MAX_SAMPLES);
}
