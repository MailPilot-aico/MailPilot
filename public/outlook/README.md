# MailPilot — Outlook-Add-in

Bringt MailPilot direkt ins Outlook-Schreibfenster: anmelden → Stichpunkte eintippen
→ „E-Mail erzeugen" (echte KI) → „In die E-Mail einfügen".

## Dateien
- `taskpane.html` — Oberfläche im Outlook-Seitenfenster
  (live: https://mailpilot-ai.com/outlook/taskpane.html). Login-Knopf öffnet den
  Clerk-Dialog, holt das Token, ruft das bestehende Backend (echte KI). Ohne Login Demo.
- `manifest.xml` — Office-Add-in-Manifest (Knopf im Schreiben-Menüband).
- Anmeldeseite für den Dialog: `app/outlook/auth/page.jsx` → live unter
  https://mailpilot-ai.com/outlook/auth (Clerk-Login + Token-Rückgabe via Office.messageParent).

## Login-Brücke (gebaut)
Office-Add-ins haben einen eigenen Kontext (kein geteilter Login). Daher:
Task-Pane → `displayDialogAsync('/outlook/auth')` → Clerk-Login → `messageParent(token)`
→ Task-Pane nutzt das Token als `Authorization: Bearer …` fürs Backend.

## Zum Ausprobieren (Sideload)
**Outlook (Web/Neu):** Einstellungen → „Add-Ins abrufen" → „Meine Add-Ins" →
„Benutzerdefiniertes Add-In hinzufügen" → „Aus URL" →
`https://mailpilot-ai.com/outlook/manifest.xml`.
**Outlook (klassisch, Windows):** Datei → Add-Ins verwalten → aus Datei/URL hinzufügen.

## Was DU (Henrik) noch tun musst
1. **Clerk-Dashboard:** mailpilot-ai.com ist schon konfiguriert. Empfehlung: unter
   **Sessions** die **Token-Lebensdauer erhöhen** (z. B. 30–60 Min), sonst läuft das
   Add-in-Token nach ~1 Min ab und man muss sich erneut anmelden.
   Falls Login im Dialog hängt: in Clerk die Domain/Origin `mailpilot-ai.com` als
   erlaubt prüfen; Google-Login ggf. auf Redirect-Flow stellen (Popup-im-Dialog kann zicken).
2. **Sideload + testen** (siehe oben): anmelden, generieren, einfügen.
3. **Eigene Icons 16/32/80** hinterlegen (aktuell wird das App-Icon skaliert) und das
   Manifest validieren (`npx office-addin-manifest validate manifest.xml`).
4. **Veröffentlichen:** über **Microsoft AppSource** (Partner Center) oder zentral im
   Microsoft-365-Admin-Center bereitstellen.

## Später
- **Gmail** analog (mit Googles strengerer Freigabe/CASA).
- **Posteingang-Assistent:** Postfach via OAuth verbinden → automatische Antwort-Entwürfe.
