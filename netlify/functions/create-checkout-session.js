/* =========================================================
   MailPilot — Stripe Checkout (Netlify Function)
   Datei: netlify/functions/create-checkout-session.js
   Monats-Abos (mode: "subscription").
   ========================================================= */

import Stripe from "stripe";

/* =================== KONFIGURATION (hier editieren) ===================
   ⚠️ SICHERHEIT: den GEHEIMEN Schlüssel NICHT als Klartext hier eintragen!
   Diese .js-Datei wird mit-deployt und (sobald du Git nutzt) eingecheckt –
   ein hartcodierter sk_… wäre dann nach außen sichtbar.
   Der Schlüssel kommt darum aus der Umgebungsvariable:
     • lokal:  .env  (wird von "netlify dev" geladen)
     • live:   Netlify → Site settings → Environment variables
   Die Price-IDs sind NICHT geheim und dürfen hier fest stehen.
   ===================================================================== */
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;   // <-- so lassen (Wert via .env / Netlify)
const PRICE_STARTER  = "price_1TiE60E6h53BnMG9dkcZdYNj";   //  9 € STARTER  (in Stripe verifiziert)
const PRICE_BUSINESS = "price_1TiE7yE6h53BnMG93zxRUIFr";   // 29 € BUSINESS (in Stripe verifiziert)
/* ===================================================================== */

const stripe = new Stripe(STRIPE_SECRET_KEY || "");

const PRICES = { starter: PRICE_STARTER, business: PRICE_BUSINESS };

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

  try {
    if (!STRIPE_SECRET_KEY) {
      return resp(400, { error: "STRIPE_SECRET_KEY ist nicht gesetzt (per .env / Netlify)." });
    }

    const body = JSON.parse(event.body || "{}");

    // Plan-Erkennung: 'starter' oder 'business' (alternativ direkt eine gültige priceId).
    let price = PRICES[body.plan];
    if (!price && typeof body.priceId === "string" && Object.values(PRICES).includes(body.priceId)) {
      price = body.priceId;
    }
    if (!price) {
      return resp(400, { error: "Unbekanntes Paket. Erwartet: plan='starter' oder 'business'." });
    }

    const origin =
      event.headers.origin ||
      (event.headers.host ? `https://${event.headers.host}` : "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email:
        typeof body.email === "string" && body.email ? body.email : undefined,
      allow_promotion_codes: true,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
    });

    return resp(200, { url: session.url });
  } catch (error) {
    // Echten Fehler ins Terminal loggen UND an das Frontend zurückgeben (statusCode 400).
    console.error("Stripe-Fehler:", error);
    return resp(400, { error: error.message });
  }
};
