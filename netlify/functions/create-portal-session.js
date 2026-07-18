/* =========================================================
   MailPilot — Stripe Billing Portal (Netlify Function)
   ---------------------------------------------------------
   Erstellt eine Sitzung für das von Stripe gehostete Kundenportal.
   Dort kann der Nutzer SELBST: Tarif wechseln (Up-/Downgrade),
   Zahlungsmethode ändern, Rechnungen einsehen und kündigen.

   Auth: Clerk-Session-Token (Authorization: Bearer …).
   POST → { url }   (Weiterleitung zum Stripe-Portal)
   ========================================================= */

import { verifyToken } from "@clerk/backend";
import Stripe from "stripe";
import { supabase } from "./lib/supabase.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  if (event.httpMethod !== "POST") return resp(405, { error: "Methode nicht erlaubt." });
  if (!process.env.STRIPE_SECRET_KEY) {
    return resp(400, { error: "STRIPE_SECRET_KEY ist nicht gesetzt." });
  }

  const accountId = await getAccountId(event);
  if (!accountId) return resp(401, { error: "Nicht angemeldet." });

  // Stripe-Kunden-ID zum Konto laden.
  // WICHTIG (Laienfest-Prinzip „nie still verlieren"): Ein DB-/Konfig-Fehler darf
  // NICHT als „kein Abo" (404) getarnt werden – sonst schicken wir eine ZAHLENDE
  // Kundin fälschlich zurück in den Kauf-Flow und sie kann weder kündigen noch
  // ihre Zahlungsart ändern. „Kein Kunde" gilt nur bei data=null OHNE Fehler.
  if (!supabase) {
    console.error("Supabase-Portal-Fehler: Client nicht initialisiert (SUPABASE_URL/KEY fehlt?).");
    return resp(503, { error: "Abo-Verwaltung momentan nicht erreichbar. Bitte kurz später erneut versuchen." });
  }
  let customerId = null;
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("account_id", accountId)
      .maybeSingle();
    if (error) throw new Error(error.message);   // supabase-js WIRFT bei Query-Fehlern NICHT → selbst prüfen
    customerId = data?.stripe_customer_id || null;
  } catch (e) {
    console.error("Supabase-Portal-Fehler:", e.message);
    return resp(503, { error: "Abo-Verwaltung momentan nicht erreichbar. Bitte kurz später erneut versuchen." });
  }

  if (!customerId) {
    // Wirklich kein zahlender Kunde (data=null, kein Fehler) → es gibt nichts zu verwalten.
    return resp(404, {
      error: "Kein aktives Abo gefunden. Bitte zuerst einen Tarif wählen.",
      noCustomer: true,
    });
  }

  const origin =
    event.headers.origin ||
    (event.headers.host ? `https://${event.headers.host}` : "");

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/?portal=return`,
    });
    return resp(200, { url: session.url });
  } catch (error) {
    console.error("Stripe-Portal-Fehler:", error);
    return resp(400, { error: error.message });
  }
};
