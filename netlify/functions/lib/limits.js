/* =========================================================
   Geräte-/Platz-Limit je Plan.
   Enterprise nutzt das individuelle seat_limit aus der
   subscriptions-Tabelle (hier nur die Standardwerte).
   ========================================================= */

export const PLAN_LIMITS = {
  free: 1,
  starter: 1,
  business: 5,
  // enterprise: individuell → kommt aus subscriptions.seat_limit
};

// Effektives Limit ermitteln: gespeichertes seat_limit hat Vorrang
// (z. B. Enterprise), sonst das Standard-Limit des Plans, sonst 1.
export function seatLimitFor(plan, dbSeatLimit) {
  if (Number.isInteger(dbSeatLimit) && dbSeatLimit > 0) return dbSeatLimit;
  return PLAN_LIMITS[plan] ?? 1;
}
