MailPilot — Download-Ordner für die Windows-App
================================================

Der "Download für Windows"-Button auf der Webseite verlinkt fest auf:

    downloads/MailPilot-Setup.exe

Damit der Button funktioniert, muss genau diese Datei hier liegen.

So bekommst du sie:
-------------------
1. Desktop-App bauen (im Tauri-Projekt mailpilot-desktop):
       cargo tauri build
2. Der fertige Installer liegt danach unter:
       src-tauri\target\release\bundle\nsis\MailPilot_1.0.0_x64-setup.exe
   (bzw. ...\bundle\msi\MailPilot_1.0.0_x64_de-DE.msi)
3. Kopiere diesen Installer hierher und benenne ihn um in:
       MailPilot-Setup.exe

Danach lädt ein Klick auf den Button die Datei automatisch herunter.

Hinweis: Ohne Code-Signing-Zertifikat zeigt Windows beim Start des
Installers eine SmartScreen-Warnung ("Mehr Informationen" -> "Trotzdem
ausführen"). Für eine öffentliche Verteilung empfiehlt sich ein
Code-Signing-Zertifikat.
