import type { Metadata } from 'next';
import { JsonLd } from '@/components/shop/JsonLd';
import { CategorySections } from '@/components/shop/CategorySections';
import { ShopGrid } from '@/components/shop/ShopGrid';
import Spaghetti from '@/components/shop/Spaghetti';
import { Collections, Contact, Faq, FinalCta, Hero, Marquee, Why } from '@/components/shop/LandingSections';
import { ScrollStage } from '@/components/shop/ScrollStage';
import { LANDING } from '@/content/landing';
import { SEO } from '@/content/seo';
import { cld } from '@/lib/cloudinary-static';
import { hasPromotion } from '@/lib/shop/product-display';
import { buildShopLayout } from '@/lib/shop/sections';
import { absoluteUrl } from '@/lib/shop/seo';
import { getPublicSettings, getShopData } from '@/server/services/catalog.queries';

// Page statique régénérée toutes les heures, et immédiatement après chaque modification du back-office.
export const revalidate = 3600;

export const metadata: Metadata = { title: { absolute: SEO.home.title }, description: SEO.home.description, alternates: { canonical: '/' } };

export default async function HomePage() {
  const settings = await getPublicSettings();
  const { categories, products } = await getShopData();
  const layout = buildShopLayout(categories, products);
  const siteUrl = absoluteUrl('/');
  const sameAs = [settings.instagramUrl, settings.tiktokUrl, settings.facebookUrl].filter(Boolean);

  return (
    <>
      {/* Parcours : héros (l'élixir 3D sort de l'affiche) → « Le soin en toute simplicité » → produits par catégorie →
          FAQ (la brume prend le relais) → CTA (la brume se pose sur la photo) → contact. Avis et témoignages retirés pour l'instant. */}
      <ScrollStage />
      <Hero showCollections={layout.mode === 'categories'} iconSrc={cld('/brand/favicon-icon.png')} />
      <Marquee />
      <Why storeName={settings.storeName} />
      {layout.mode === 'categories' && <Collections sections={layout.sections} hasOffers={products.some(hasPromotion)} />}

      {/* Section Boutique (décision D-12) : sections sticky par catégorie, sinon grille. Rien sans produit publié. */}
      {products.length > 0 && (
        <section id="boutique" className="shop-section" aria-label={LANDING.shop.title}>
          {layout.mode === 'categories' ? (
            <>
              <CategorySections sections={layout.sections} />
              {layout.others.length > 0 && (
                <div className="container section">
                  <Spaghetti as="h2">{LANDING.shop.othersTitle}</Spaghetti>
                  <ShopGrid products={layout.others} />
                </div>
              )}
            </>
          ) : (
            <div className="container section">
              <div className="section-head">
                <Spaghetti as="h2" ghost={LANDING.shop.titleGhost}>{LANDING.shop.title}</Spaghetti>
                <p className="lead">{LANDING.shop.text}</p>
              </div>
              <ShopGrid products={layout.products} />
            </div>
          )}
        </section>
      )}

      <Faq settings={settings} />
      <FinalCta />
      <Contact settings={settings} />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: settings.storeName,
          ...(siteUrl ? { url: siteUrl } : {}),
          ...(sameAs.length > 0 ? { sameAs } : {}),
        }}
      />
    </>
  );
}
