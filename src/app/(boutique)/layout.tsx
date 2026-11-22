import type { Metadata } from 'next';
import { LANDING } from '@/content/landing';
import { CartModal } from '@/components/shop/CartModal';
import { CartProvider } from '@/components/shop/CartProvider';
import { CheckoutModal } from '@/components/shop/CheckoutModal';
import { ConsentGatedAnalytics } from '@/components/shop/ConsentGatedAnalytics';
import { CookieBanner } from '@/components/shop/CookieBanner';
import { Footer } from '@/components/shop/Footer';
import { Header } from '@/components/shop/Header';
import { IntroLoader } from '@/components/shop/IntroLoader';
import { MenuModal } from '@/components/shop/MenuModal';
import { PageTransition } from '@/components/shop/PageTransition';
import { HistoryModal } from '@/components/shop/HistoryModal';
import { ModalRouteSync } from '@/components/shop/ModalRouteSync';
import { cld } from '@/lib/cloudinary-static';
import { CHECKOUT_ENABLED, HOME_ANALYTICS_ENABLED } from '@/lib/constants/features';
import { hasContactChannels } from '@/lib/shop/contact';
import { getCategoryAccents, getPublicSettings, getPublicZones, hasCollections } from '@/server/services/catalog.queries';
import '@/styles/shop.css';
import '@/styles/smash.css';
import '@/styles/spaghetti.css';
import '@/styles/ui.css';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
    title: { default: settings.storeName, template: `%s · ${settings.storeName}` },
    description: LANDING.hero.text,
    openGraph: { siteName: settings.storeName, locale: 'fr_FR', type: 'website' },
  };
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [settings, showCollections, zones, accents] = await Promise.all([getPublicSettings(), hasCollections(), getPublicZones(), getCategoryAccents()]);
  const showContact = hasContactChannels(settings);
  const socials = [
    { label: 'Instagram', href: settings.instagramUrl },
    { label: 'TikTok', href: settings.tiktokUrl },
    { label: 'Facebook', href: settings.facebookUrl },
  ].filter((social): social is { label: string; href: string } => Boolean(social.href));

  return (
    <CartProvider>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <Header storeName={settings.storeName} />
      <main id="contenu" tabIndex={-1}>
        {children}
      </main>
      <Footer settings={settings} showCollections={showCollections} accents={accents} />
      {/* Les modals vivent dans le layout : l'icône du panier fonctionne sur toutes les pages. */}
      <MenuModal storeName={settings.storeName} showCollections={showCollections} showContact={showContact} socials={socials} />
      <CartModal depositAmount={settings.depositAmount} />
      {CHECKOUT_ENABLED && <CheckoutModal depositAmount={settings.depositAmount} zones={zones} />}
      <HistoryModal storeName={settings.storeName} />
      <ModalRouteSync />
      <PageTransition />
      <IntroLoader logoSrc={cld('/brand/logo-meera-kinks.png', { width: 500 })} iconSrc={cld('/brand/favicon-icon.png')} storeName={settings.storeName} />
      <CookieBanner homeAnalytics={HOME_ANALYTICS_ENABLED} />
      <ConsentGatedAnalytics />
    </CartProvider>
  );
}
