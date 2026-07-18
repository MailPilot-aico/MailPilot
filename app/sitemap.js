/* sitemap.xml (Next.js generiert daraus /sitemap.xml).
   Landingpage plus die verlinkbaren Unterseiten: /outlook (Feature-Seite)
   und die Rechtsseiten — Google-Ads-Prüfer und Crawler finden Impressum/
   Datenschutz damit auch ohne JavaScript. */
export default function sitemap() {
  const base = 'https://mailpilot-ai.com'
  const now = new Date()
  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/outlook`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/impressum`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
