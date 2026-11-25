import type { Metadata } from 'next';
import { LegalDocument } from '@/components/shop/LegalDocument';
import { PRIVACY_TEXTS_VALIDATED } from '@/content/legal-status';
import { cgvSections, cgvIntro, CGV_TITLE } from '@/content/legal-pages';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { getLegalIdentity, getPublicDelivery, getPublicSettings } from '@/server/services/catalog.queries';

export const revalidate = 3600;
// Pas indexée tant que le texte n'est pas validé par la cliente et un professionnel (cahier §14.2).
export const metadata: Metadata = {
  title: CGV_TITLE,
  alternates: { canonical: PUBLIC_ROUTES.cgv },
  robots: PRIVACY_TEXTS_VALIDATED ? { index: true, follow: true } : { index: false, follow: true },
};

export default async function Page() {
  const [settings, identity, delivery] = await Promise.all([getPublicSettings(), getLegalIdentity(), getPublicDelivery()]);
  return (
    <LegalDocument
      title={CGV_TITLE}
      intro={cgvIntro(settings.storeName)}
      sections={cgvSections({ storeName: settings.storeName, depositAmount: settings.depositAmount, delays: delivery.summary, notes: delivery.notes })}
      settings={settings}
      identity={{ storeName: settings.storeName, legalName: identity.legalName, address: identity.address, contactPhone: settings.contactPhone }}
    />
  );
}
