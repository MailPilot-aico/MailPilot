'use client';

import { useEffect, useState } from 'react';
import { SignIn, useAuth } from '@clerk/nextjs';

/* Anmeldeseite für den Outlook-Add-in-Dialog.
   Wird per Office.context.ui.displayDialogAsync aus der Task-Pane geöffnet.
   Nach erfolgreichem Clerk-Login wird das Session-Token via Office.messageParent
   an die Task-Pane zurückgegeben, die damit das Backend (echte KI) aufruft. */
export default function OutlookAuthPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [officeReady, setOfficeReady] = useState(false);
  const [sent, setSent] = useState(false);

  // Office.js laden und bereit machen (nur im Dialog vorhanden).
  useEffect(() => {
    const s = document.createElement('script');
    s.src = 'https://appsforoffice.microsoft.com/lib/1/hosted/office.js';
    s.async = true;
    s.onload = () => {
      try { window.Office && window.Office.onReady && window.Office.onReady(() => setOfficeReady(true)); }
      catch (e) { /* außerhalb von Office egal */ }
    };
    document.head.appendChild(s);
  }, []);

  // Sobald angemeldet UND Office bereit: Token an die Task-Pane zurückgeben.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !officeReady || sent) return;
    (async () => {
      try {
        // Bevorzugt das langlebige Token aus dem JWT-Template "mailpilot"
        // (damit man eingeloggt bleibt). Fehlt das Template, normaler Fallback.
        let token = null;
        try { token = await getToken({ template: 'mailpilot' }); } catch (e) { /* Template fehlt */ }
        if (!token) { try { token = await getToken(); } catch (e) {} }
        const ui = window.Office && window.Office.context && window.Office.context.ui;
        if (token && ui && ui.messageParent) {
          ui.messageParent(JSON.stringify({ token }));
          setSent(true);
        }
      } catch (e) { /* ignore */ }
    })();
  }, [isLoaded, isSignedIn, officeReady, sent, getToken]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0710', color: '#f3f0fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        {!isLoaded ? (
          <p>Lädt…</p>
        ) : isSignedIn ? (
          <p style={{ fontSize: 16, lineHeight: 1.6 }}>
            ✓ Angemeldet. MailPilot ist jetzt im Outlook-Add-in verbunden.<br />
            Du kannst dieses Fenster schließen.
          </p>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SignIn routing="hash" fallbackRedirectUrl="/outlook/auth" />
          </div>
        )}
      </div>
    </div>
  );
}
