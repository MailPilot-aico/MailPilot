import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Öffentlich: Landingpage, Auth-Seiten UND alle Netlify-Functions.
// Die Functions prüfen ihre Auth SELBST (Clerk-Token via verifyToken bzw.
// Stripe-Signatur beim Webhook) und dürfen NICHT vom Middleware-Redirect auf
// /sign-in abgefangen werden – sonst erreicht z. B. der Stripe-Webhook
// (ruft ohne Clerk-Session auf) die Funktion nie.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/.netlify/functions/(.*)",
]);

// Next 16: Datei-Konvention "proxy" (früher "middleware"). clerkMiddleware ist
// hier weiterhin korrekt – schützt alle nicht-öffentlichen Routen via auth.protect().
export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // `\.netlify` ausnehmen → die Middleware läuft auf Netlify-Functions gar nicht erst.
    "/((?!_next|\\.netlify|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|exe|dmg|msi|pkg|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
