import type { Metadata } from 'next';
import { SEO } from '@/content/seo';
import { SHOWCASE_ENABLED } from '@/content/vitrine';
import { CartModal } from '@/components/shop/CartModal';
import { CartProvider } from '@/components/shop/CartProvider';
import { CheckoutModal } from '@/components/shop/CheckoutModal';
import { AnalyticsTracker } from '@/components/shop/AnalyticsTracker';
import { ConsentGatedAnalytics } from '@/components/shop/ConsentGatedAnalytics';
import { CookieBanner } from '@/components/shop/CookieBanner';
import { Footer } from '@/components/shop/Footer';
import { Header } from '@/components/shop/Header';
import { IntroLoader } from '@/components/shop/IntroLoader';
import { MenuModal } from '@/components/shop/MenuModal';
import { PageTransition } from '@/components/shop/PageTransition';
import { ConfirmationModal } from '@/components/shop/ConfirmationModal';
import { ModalRouteSync } from '@/components/shop/ModalRouteSync';
import { cld } from '@/lib/cloudinary-static';
import { CHECKOUT_ENABLED, HOME_ANALYTICS_ENABLED } from '@/lib/constants/features';
import { hasContactSection } from '@/lib/shop/contact';
import { buildSocialLinks } from '@/lib/shop/socials';
import { getCategoryAccents, getPublicDelivery, getPublicSettings, getPublicZones, hasCollections } from '@/server/services/catalog.queries';
import '@/styles/shop.css';
import '@/styles/smash.css';
import '@/styles/spaghetti.css';
import '@/styles/ui.css';
import '@/styles/showcase.css';
import '@/styles/fiche.css';
import '@/styles/stage.css';
import '@/styles/titles.css';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
    title: { default: SEO.home.title, template: `%s – ${settings.storeName}` },
    description: SEO.home.description,
    openGraph: { siteName: settings.storeName, locale: 'fr_FR', type: 'website' },
  };
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, hasCollectionsInDb, zones, accents, delivery] = await Promise.all([getPublicSettings(), hasCollections(), getPublicZones(), getCategoryAccents(), getPublicDelivery()]);
  // Vitrine photo active : il n'y a pas de section « Collections » sur la landing, donc pas de lien vers elle.
  const showCollections = SHOWCASE_ENABLED ? false : hasCollectionsInDb;
  const showContact = hasContactSection(settings);
  const socials = buildSocialLinks(settings);

  return (
    <CartProvider>
      {/* Modak (titres et grand titre du héros) : chargée tout de suite pour éviter le saut de police au premier affichage. */}
      <link rel="preload" href="/fonts/modak-latin-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <Header storeName={settings.storeName} />
      <main id="contenu" tabIndex={-1}>
        {children}
      </main>
      <Footer settings={settings} showCollections={showCollections} accents={accents} />
      {/* Les modals (menu, panier, commande, confirmation) vivent dans le layout, entrent par la droite et partagent le même mécanisme. */}
      <MenuModal storeName={settings.storeName} showCollections={showCollections} showContact={showContact} socials={socials} />
      <CartModal depositAmount={settings.depositAmount} storeName={settings.storeName} />
      {CHECKOUT_ENABLED && <CheckoutModal depositAmount={settings.depositAmount} zones={zones} deliveryNotes={delivery.notes} />}
      <ConfirmationModal depositAmount={settings.depositAmount} storeName={settings.storeName} deliveryNotes={delivery.notes} />
      <ModalRouteSync />
      <PageTransition />
      <IntroLoader logoSrc={cld('/brand/logo-meera-kinks.png', { width: 500 })} iconSrc={cld('/brand/favicon-icon.png')} storeName={settings.storeName} />
      <CookieBanner homeAnalytics={HOME_ANALYTICS_ENABLED} />
      <ConsentGatedAnalytics />
      {HOME_ANALYTICS_ENABLED && <AnalyticsTracker />}
    </CartProvider>
  );
}
