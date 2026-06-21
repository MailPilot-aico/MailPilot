/* robots.txt (Next.js generiert daraus /robots.txt).
   Erlaubt die Indexierung der öffentlichen Seite, sperrt die internen
   Netlify-Functions und verweist auf die Sitemap. */
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/.netlify/'],
    },
    sitemap: 'https://mailpilot-ai.com/sitemap.xml',
    host: 'https://mailpilot-ai.com',
  }
}
