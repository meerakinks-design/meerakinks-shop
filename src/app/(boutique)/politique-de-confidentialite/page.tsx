import type { Metadata } from 'next';
import { LegalDocument } from '@/components/shop/LegalDocument';
import { PRIVACY_TEXTS_VALIDATED } from '@/content/legal-status';
import { PRIVACY_TITLE, privacyIntro, privacySections } from '@/content/privacy';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { HOME_ANALYTICS_ENABLED } from '@/lib/constants/features';
import { getPublicSettings } from '@/server/services/catalog.queries';

export const revalidate = 3600;
// Pas indexée tant que le texte n'est pas validé par la cliente et un professionnel (P-22, cahier §14.2).
export const metadata: Metadata = {
  title: PRIVACY_TITLE,
  alternates: { canonical: PUBLIC_ROUTES.privacy },
  robots: PRIVACY_TEXTS_VALIDATED ? { index: true, follow: true } : { index: false, follow: true },
};

export default async function PrivacyPage() {
  const settings = await getPublicSettings();
  return (
    <LegalDocument
      title={PRIVACY_TITLE}
      intro={privacyIntro(settings.storeName)}
      sections={privacySections({ homeAnalytics: HOME_ANALYTICS_ENABLED })}
      settings={settings}
    />
  );
}
