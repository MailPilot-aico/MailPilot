/* =========================================================
   Wiederverwendbarer Supabase-Client für Netlify-Funktionen.
   ---------------------------------------------------------
   Import in einer Funktion:
       import { supabase } from "./lib/supabase.js";

   Nutzt automatisch den GEHEIMEN service_role-Key, falls gesetzt
   (server-seitige Schreibrechte, umgeht RLS) – sonst den
   öffentlichen anon/Publishable Key (durch Row Level Security
   eingeschränkt). Der service_role-Key gehört NUR in die
   Umgebungsvariablen (.env lokal / Netlify), nie ins Frontend.
   ========================================================= */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

// Client defensiv erzeugen: Ein Fehler beim Initialisieren (z. B. die
// Realtime-/WebSocket-Init von supabase-js auf Node < 22) darf NICHT beim
// Import die ganze Netlify-Funktion zum Absturz bringen. Schlägt es fehl,
// bleibt der Client null; die Aufrufer sind mit try/catch bzw. Null-Prüfung
// ausfallsicher (die Kern-Generierung läuft dann einfach ohne Profil weiter).
let _supabase = null;
try {
  if (url && key) {
    _supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
} catch (err) {
  console.error("Supabase-Client-Init fehlgeschlagen:", err?.message || err);
  _supabase = null;
}

export const supabase = _supabase;
