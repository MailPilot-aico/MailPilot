import { ClerkProvider } from '@clerk/nextjs'

export const metadata = {
  title: 'MailPilot — From notes to the perfect email',
  description: 'MailPilot — AI copilot that turns your bullet points into professional emails.',
  icons: { icon: '/assets/logononame.png' },
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <meta name="theme-color" content="#0a0710" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
            rel="stylesheet"
          />
          {/* Das bestehende MailPilot-Design, unverändert aus public/assets serviert */}
          <link rel="stylesheet" href="/assets/css/style.css" />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
