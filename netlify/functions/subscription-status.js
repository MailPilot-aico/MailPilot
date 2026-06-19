/* =========================================================
   MailPilot — Abo-Status (Netlify Function)
   ---------------------------------------------------------
   Auth: Clerk-Session-Token (Authorization: Bearer …) wird
         serverseitig mit CLERK_SECRET_KEY geprüft.
   Daten: Plan/Status aus Supabase (subscriptions). Liegt eine
          stripe_customer_id vor, werden Preis, Intervall, nächste
          Abbuchung und Kündigungsstatus LIVE bei Stripe geholt.

   GET → { plan, status, seatLimit, hasCustomer, subscription }
   ========================================================= */

import { verifyToken } from "@clerk/backend";
import Stripe from "stripe";
import { supabase } from "./lib/supabase.js";
import { seatLimitFor } from "./lib/limits.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  const h = event.headers || {};
  const auth = h.authorization || h.Authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return payload.org_id || payload.sub || null;
  } catch {
    return null;
  }
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return resp(204, null);
  if (event.httpMethod !== "GET") return resp(405, { error: "Methode nicht erlaubt." });

  const accountId = await getAccountId(event);
  if (!accountId) return resp(401, { error: "Nicht angemeldet." });

  // Plan aus Supabase. Fehlt Tabelle/Eintrag → kostenloser Plan.
  let row = null;
  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("plan, seat_limit, status, stripe_customer_id")
      .eq("account_id", accountId)
      .maybeSingle();
    row = data || null;
  } catch (e) {
    console.error("Supabase-Status-Fehler:", e.message);
  }

  const plan = row?.plan || "free";
  const status = row?.status || "free";
  const seatLimit = seatLimitFor(plan, row?.seat_limit);

  // Live-Details direkt von Stripe (Preis, Intervall, nächste Abbuchung, Kündigung).
  let subscription = null;
  if (row?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const list = await stripe.subscriptions.list({
        customer: row.stripe_customer_id,
        status: "all",
        limit: 1,
      });
      const s = list.data[0];
      if (s) {
        const item = s.items?.data?.[0];
        const price = item?.price;
        const periodEnd = s.current_period_end || item?.current_period_end || null;
        subscription = {
          status: s.status,                                   // active | trialing | past_due | canceled | …
          cancelAtPeriodEnd: !!s.cancel_at_period_end,
          currentPeriodEnd: periodEnd ? periodEnd * 1000 : null, // ms-Timestamp fürs Frontend
          amount: typeof price?.unit_amount === "number" ? price.unit_amount : null, // in Cent
          currency: price?.currency || null,
          interval: price?.recurring?.interval || null,       // month | year
        };
      }
    } catch (e) {
      console.error("Stripe-Status-Fehler:", e.message);
    }
  }

  return resp(200, { plan, status, seatLimit, hasCustomer: !!row?.stripe_customer_id, subscription });
};
