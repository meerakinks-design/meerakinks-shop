import type { Metadata } from 'next';
import { CookieChoice } from '@/components/shop/CookieChoice';
import { LegalDocument } from '@/components/shop/LegalDocument';
import { COOKIES_INTRO, COOKIES_TITLE, cookiesSections } from '@/content/cookies';
import { HOME_ANALYTICS_ENABLED } from '@/lib/constants/features';
import { getPublicSettings } from '@/server/services/catalog.queries';

export const revalidate = 3600;
// Page de gestion du choix : aucune valeur pour la recherche, donc jamais indexée ni listée dans le sitemap.
export const metadata: Metadata = {
  title: COOKIES_TITLE,
  alternates: { canonical: '/cookies' },
  robots: { index: false, follow: true },
};

export default async function CookiesPage() {
  const settings = await getPublicSettings();
  return (
    <LegalDocument title={COOKIES_TITLE} intro={COOKIES_INTRO} sections={cookiesSections({ homeAnalytics: HOME_ANALYTICS_ENABLED })} settings={settings}>
      <CookieChoice />
    </LegalDocument>
  );
}
