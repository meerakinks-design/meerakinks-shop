import type { Metadata } from 'next';
import { LegalDocument } from '@/components/shop/LegalDocument';
import { PRIVACY_TEXTS_VALIDATED } from '@/content/legal-status';
import { cguSections, cguIntro, CGU_TITLE } from '@/content/legal-pages';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { getLegalIdentity, getPublicSettings } from '@/server/services/catalog.queries';

export const revalidate = 3600;
// Pas indexée tant que le texte n'est pas validé par la cliente et un professionnel (cahier §14.2).
export const metadata: Metadata = {
  title: CGU_TITLE,
  alternates: { canonical: PUBLIC_ROUTES.cgu },
  robots: PRIVACY_TEXTS_VALIDATED ? { index: true, follow: true } : { index: false, follow: true },
};

export default async function Page() {
  const [settings, identity] = await Promise.all([getPublicSettings(), getLegalIdentity()]);
  return (
    <LegalDocument
      title={CGU_TITLE}
      intro={cguIntro(settings.storeName)}
      sections={cguSections({ storeName: settings.storeName })}
      settings={settings}
      identity={{ storeName: settings.storeName, legalName: identity.legalName, address: identity.address, contactPhone: settings.contactPhone }}
    />
  );
}
