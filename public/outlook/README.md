# MailPilot — Outlook-Add-in (Gerüst)

Bringt MailPilot direkt ins Outlook-Schreibfenster: Stichpunkte eintippen → „E-Mail
erzeugen" → „In die E-Mail einfügen".

## Dateien
- `taskpane.html` — die Oberfläche im Outlook-Seitenfenster (live unter
  https://mailpilot-ai.com/outlook/taskpane.html). Ruft das bestehende Backend
  (`/.netlify/functions/optimize-email`) auf; ohne Login einfacher Demo-Modus.
- `manifest.xml` — das Office-Add-in-Manifest (Knopf im Schreiben-Menüband).

## Zum Ausprobieren (Sideload)
**Outlook (Web/Neu):** Einstellungen → Add-Ins / „Add-Ins abrufen" → „Meine Add-Ins"
→ „Benutzerdefiniertes Add-In hinzufügen" → „Aus URL" →
`https://mailpilot-ai.com/outlook/manifest.xml`.

**Outlook (klassisch, Windows):** Datei → Add-Ins verwalten → benutzerdefiniertes
Add-In aus Datei/URL hinzufügen (`manifest.xml`).

Danach erscheint im **Schreibfenster** ein **MailPilot**-Knopf, der die Seitenleiste öffnet.

## Noch offen (vor echter Veröffentlichung)
1. **Login/echte KI:** In der Task-Pane ist der Nutzer nicht bei Clerk angemeldet
   (eigener Office-Kontext) → das Backend antwortet 401 → Demo-Modus. Für die echte
   KI muss ein Token besorgt werden (Clerk-Login per Office-Dialog
   `displayDialogAsync` → Token an die Task-Pane zurückgeben). Gleiche Hürde wie bei
   der Desktop-App.
2. **Manifest prüfen/validieren** (z. B. mit `office-addin-manifest validate`) und
   eigene Icon-Größen 16/32/80 hinterlegen (aktuell wird das App-Icon skaliert).
3. **Veröffentlichung** über AppSource oder zentrale Bereitstellung (Microsoft 365 Admin).

Das Grundgerüst (Manifest + Task-Pane + Einfügen in die Mail) funktioniert end-to-end;
fehlt nur die Login-Brücke für die echte KI statt Demo.
