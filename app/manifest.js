// Next-native Manifest-Route → wird unter /manifest.webmanifest mit korrektem
// Content-Type "application/manifest+json" ausgeliefert und automatisch im <head>
// verlinkt. Ersetzt die frühere statische public/manifest.webmanifest.
export default function manifest() {
  return {
    name: 'MailPilot',
    short_name: 'MailPilot',
    description: 'Aus Notizen wird die perfekte E-Mail — KI-E-Mail-Assistent.',
    start_url: '/?app=1',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0710',
    theme_color: '#0a0710',
    lang: 'de',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
