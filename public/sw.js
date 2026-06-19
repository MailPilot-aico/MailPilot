/* Minimaler Service Worker – nur damit MailPilot als App installierbar ist.
   Kein Offline-Caching: die KI-Generierung braucht ohnehin eine Internet-
   verbindung, also reichen wir alle Anfragen einfach ans Netzwerk durch. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* Standardverhalten des Browsers (kein Caching) */ });
