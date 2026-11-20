import type { MetadataRoute } from 'next';
import { normalizeSiteUrl } from '@/lib/shop/seo';

export default function robots(): MetadataRoute.Robots {
  const base = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/commande/'] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
