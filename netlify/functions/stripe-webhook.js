/* =========================================================
   MailPilot — Stripe-Webhook (Netlify Function)
   ---------------------------------------------------------
   Hält die Supabase-Tabelle `subscriptions` mit dem echten
   Stripe-Status synchron. OHNE diesen Webhook bleibt der Abo-
   Status leer (alle Nutzer „free").

   Einrichtung (einmalig, im Stripe-Dashboard):
     1) Developers → Webhooks → Add endpoint
        URL: https://<deine-domain>/.netlify/functions/stripe-webhook
        Events: checkout.session.completed,
                customer.subscription.created/updated/deleted
     2) Signing secret (whsec_…) als STRIPE_WEBHOOK_SECRET
        in den Netlify-Umgebungsvariablen hinterlegen.
   ========================================================= */

import Stripe from "stripe";
import { supabase } from "./lib/supabase.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Stripe-Price-ID → interner Plan (gleiche IDs wie create-checkout-session.js).
const PRICE_TO_PLAN = {
  price_1TiE60E6h53BnMG9dkcZdYNj: "starter",
  price_1TiE7yE6h53BnMG93zxRUIFr: "business",
};
const SEAT = { free: 1, starter: 1, business: 5 };

function planFromSubscription(sub) {
  const priceId = sub?.items?.data?.[0]?.price?.id;
  return PRICE_TO_PLAN[priceId] || "starter";
}

// WICHTIG: Bei einem Schreib-Fehler WERFEN (nicht nur loggen). Der Handler gibt
// dann 500 zurück, worauf Stripe den Webhook automatisch erneut zustellt. Ein
// stilles „200 trotz Fehler" würde eine ZAHLENDE Kundin dauerhaft als „free"
// stranden lassen (Laienfest-Prinzip „nie still verlieren").
async function upsertByAccount(accountId, fields) {
  if (!accountId) return;
  if (!supabase) throw new Error("Supabase-Client nicht initialisiert (SUPABASE_URL/KEY fehlt).");
  const { error } = await supabase
    .from("subscriptions")
    .upsert(
      { account_id: accountId, updated_at: new Date().toISOString(), ...fields },
      { onConflict: "account_id" }
    );
  if (error) throw new Error("Supabase-Upsert-Fehler: " + error.message);
}

async function updateByCustomer(customerId, fields) {
  if (!customerId) return;
  if (!supabase) throw new Error("Supabase-Client nicht initialisiert (SUPABASE_URL/KEY fehlt).");
  const { error } = await supabase
    .from("subscriptions")
    .update({ updated_at: new Date().toISOString(), ...fields })
    .eq("stripe_customer_id", customerId);
  if (error) throw new Error("Supabase-Update-Fehler: " + error.message);
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  if (!WEBHOOK_SECRET) return { statusCode: 500, body: "STRIPE_WEBHOOK_SECRET fehlt." };

  // Signatur gegen den ROHEN Body prüfen (Netlify liefert event.body als String).
  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  let evt;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;
    evt = stripe.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
  } catch (e) {
    console.error("Webhook-Signatur ungültig:", e.message);
    return { statusCode: 400, body: `Webhook Error: ${e.message}` };
  }

  try {
    switch (evt.type) {
      case "checkout.session.completed": {
        const s = evt.data.object;
        const accountId = s.client_reference_id || s.metadata?.account_id;
        if (!accountId) {
          // Darf seit dem Login-Gate im Frontend nicht mehr vorkommen. Falls doch:
          // LAUT loggen (Session + Kunden-E-Mail), damit die Zahlung manuell im
          // Stripe-Dashboard einem Konto zugeordnet werden kann — niemals still.
          // Trotzdem 200 zurückgeben: Ein Retry würde nie eine accountId nachliefern.
          console.error(
            "ALARM: Zahlung OHNE Konto-Zuordnung! Session " + s.id +
            ", Kunde " + (s.customer_details?.email || s.customer || "unbekannt") +
            " — bitte manuell in Stripe/Supabase zuordnen."
          );
        }
        let plan = "starter";
        if (s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription);
          plan = planFromSubscription(sub);
        }
        await upsertByAccount(accountId, {
          plan,
          seat_limit: SEAT[plan] || 1,
          status: "active",
          stripe_customer_id: s.customer,
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = evt.data.object;
        const plan = planFromSubscription(sub);
        const status = sub.cancel_at_period_end ? "canceling" : sub.status;
        const accountId = sub.metadata?.account_id;
        if (accountId) {
          await upsertByAccount(accountId, {
            plan,
            seat_limit: SEAT[plan] || 1,
            status,
            stripe_customer_id: sub.customer,
          });
        } else {
          await updateByCustomer(sub.customer, { plan, seat_limit: SEAT[plan] || 1, status });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = evt.data.object;
        await updateByCustomer(sub.customer, { plan: "free", seat_limit: 1, status: "canceled" });
        break;
      }

      default:
        break; // andere Events ignorieren
    }
  } catch (e) {
    console.error("Webhook-Verarbeitung fehlgeschlagen:", e.message);
    return { statusCode: 500, body: "handler error" };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
