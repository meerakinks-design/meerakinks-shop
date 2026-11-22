import type { MetadataRoute } from 'next';
import { siteBaseUrl } from '@/lib/shop/seo';

/** Le back-office, l'API et la confirmation de commande ne sont pas explorés ; la ligne « Sitemap » n'existe qu'avec une adresse de site. */
export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/commande/'] }],
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
