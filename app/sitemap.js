/* sitemap.xml (Next.js generiert daraus /sitemap.xml).
   MailPilot ist im Kern eine Single-Page-App; die öffentliche Landingpage
   ist die einzige für Suchmaschinen relevante URL. */
export default function sitemap() {
  return [
    {
      url: 'https://mailpilot-ai.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
