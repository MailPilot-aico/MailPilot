import { ClerkProvider } from '@clerk/nextjs'

export const metadata = {
  title: 'MailPilot — From notes to the perfect email',
  description: 'MailPilot — AI copilot that turns your bullet points into professional emails.',
  icons: {
    icon: '/assets/logononame.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: { capable: true, title: 'MailPilot', statusBarStyle: 'black-translucent' },
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
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
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
