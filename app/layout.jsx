import { ClerkProvider } from '@clerk/nextjs'

// metadataBase macht alle relativen URLs (og:image etc.) absolut – nötig, damit
// Social-Netzwerke das Vorschaubild beim Teilen korrekt laden.
const SITE_URL = 'https://mailpilot-ai.com'
const TITLE = 'MailPilot — From notes to the perfect email'
const DESCRIPTION = 'MailPilot — the AI email assistant that turns your bullet points into professional emails. In seconds, in 33 languages.'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'MailPilot',
  alternates: { canonical: '/' },
  icons: {
    // Echte Marken-Icons (weißer Papierflieger auf Verlaufskachel) statt des
    // alten 3-MP-JPEGs; 128px zusätzlich, weil Google für SERP-Favicons ≥48px will.
    icon: [
      { url: '/icons/mp-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/mp-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/mp-128.png', sizes: '128x128', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
  appleWebApp: { capable: true, title: 'MailPilot', statusBarStyle: 'black-translucent' },
  // Vorschaukarte beim Teilen (WhatsApp, LinkedIn, Slack, iMessage …).
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'MailPilot',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'MailPilot — AI email assistant' }],
  },
  // Twitter/X-Karte (großes Bild).
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og.png'],
  },
}

// Anmelde-/Registrier-Widget im MailPilot-Look statt der nackten weißen
// Clerk-Standardkarte: dunkle Flächen, Marken-Violett, eigenes Logo. So bricht
// das Design im Conversion-Moment (Klick auf „Kostenlos testen") nicht mehr.
const clerkAppearance = {
  layout: { logoImageUrl: '/icons/mp-128.png', socialButtonsVariant: 'blockButton' },
  variables: {
    colorPrimary: '#8b5cf6',
    colorBackground: '#141021',
    colorText: '#e7e2f3',
    colorTextSecondary: '#a99fc0',
    colorInputBackground: '#1b1430',
    colorInputText: '#e7e2f3',
    colorDanger: '#f87171',
    borderRadius: '12px',
    fontFamily: "Inter, 'Segoe UI', system-ui, sans-serif",
  },
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Theme früh setzen (vor dem ersten Paint), um Flackern zu vermeiden. */}
          <script
            dangerouslySetInnerHTML={{
              __html: "try{if(localStorage.getItem('mp_theme')==='light')document.documentElement.dataset.theme='light';}catch(e){}try{if(new URLSearchParams(location.search).get('app')==='1')document.documentElement.classList.add('app-mode');}catch(e){}",
            }}
          />
          {/* PWA-Install-Event SO FRÜH WIE MÖGLICH abfangen. Chrome/Edge feuern
              "beforeinstallprompt" direkt nach dem Laden – würde script.js (das erst
              "afterInteractive" läuft) den Listener erst spät registrieren, wäre das
              Event schon vorbei und der Install-Button zeigte nur die Fallback-Hinweis-
              box statt des echten Dialogs. Hier global zwischenspeichern. */}
          <script
            dangerouslySetInnerHTML={{
              __html: "window.__mpInstallPrompt=null;window.__mpInstalled=false;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__mpInstallPrompt=e;});window.addEventListener('appinstalled',function(){window.__mpInstalled=true;window.__mpInstallPrompt=null;});",
            }}
          />
          <meta name="theme-color" content="#0a0710" />
          {/* Älterer Apple-Tag (zusätzlich zum Next-generierten "mobile-web-app-capable"),
              damit die installierte App auch auf iPhone/älterem Safari im eigenen Fenster
              startet statt im Browser-Tab. */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
          {/* Das bestehende MailPilot-Design, unverändert aus public/assets serviert */}
          <link rel="stylesheet" href="/assets/css/style.css" />
          {/* Service Worker registrieren → macht MailPilot als App installierbar (PWA) */}
          <script
            dangerouslySetInnerHTML={{
              __html: "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}",
            }}
          />
          {/* Strukturierte Daten (schema.org SoftwareApplication) → reichere Google-
              Treffer. Nur echte, belegbare Angaben (keine erfundenen Bewertungen). */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'MailPilot',
                url: SITE_URL,
                description: DESCRIPTION,
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web, Windows, macOS, Microsoft Outlook',
                image: `${SITE_URL}/og.png`,
                screenshot: `${SITE_URL}/og.png`,
                inLanguage: [
                  'en', 'de', 'es', 'fr', 'it', 'pt-BR', 'nl', 'pl', 'sv', 'da', 'nb',
                  'fi', 'cs', 'sk', 'hu', 'ro', 'el', 'tr', 'ru', 'uk', 'bg', 'hr',
                  'sr', 'zh', 'zh-TW', 'ja', 'ko', 'hi', 'id', 'th', 'vi', 'ar', 'he',
                ],
                featureList: [
                  'Turn bullet points into a finished email',
                  'Reply mode',
                  'Adjustable tone, length and formality',
                  'One-click rephrasing',
                  'Write and translate emails in 33 languages',
                  'Automatic name and signature',
                ],
                offers: {
                  '@type': 'Offer',
                  price: '0',
                  priceCurrency: 'EUR',
                  description: 'Free daily quota; paid subscriptions available.',
                },
                publisher: { '@type': 'Organization', name: 'MailPilot', url: SITE_URL },
              }),
            }}
          />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
