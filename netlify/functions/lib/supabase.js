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

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
