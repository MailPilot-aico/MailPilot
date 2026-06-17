import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Startseite/Landingpage ist öffentlich (Tool ist frei sichtbar; Login erst beim Optimieren).
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

// Next 16: Datei-Konvention "proxy" (früher "middleware"). clerkMiddleware ist
// hier weiterhin korrekt – schützt alle nicht-öffentlichen Routen via auth.protect().
export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
