import type { Metadata } from 'next';
import { JsonLd } from '@/components/shop/JsonLd';
import { CategorySections } from '@/components/shop/CategorySections';
import { ShopGrid } from '@/components/shop/ShopGrid';
import Spaghetti from '@/components/shop/Spaghetti';
import { BestSellers, Collections, Contact, Faq, FinalCta, Focus, Hero, Instagram, Marquee, Reviews, StoryTeaser, Why } from '@/components/shop/LandingSections';
import { LANDING } from '@/content/landing';
import { SEO } from '@/content/seo';
import { cld } from '@/lib/cloudinary-static';
import { hasPromotion } from '@/lib/shop/product-display';
import { buildShopLayout } from '@/lib/shop/sections';
import { absoluteUrl } from '@/lib/shop/seo';
import { getFeaturedProducts, getFocusProduct, getPublicSettings, getShopData } from '@/server/services/catalog.queries';

// Page statique régénérée toutes les heures, et immédiatement après chaque modification du back-office.
export const revalidate = 3600;

export const metadata: Metadata = { title: { absolute: SEO.home.title }, description: SEO.home.description, alternates: { canonical: '/' } };

export default async function HomePage() {
  const settings = await getPublicSettings();
  const [{ categories, products }, featured, focus] = await Promise.all([
    getShopData(),
    getFeaturedProducts(8),
    getFocusProduct(settings.focusProductId),
  ]);
  const layout = buildShopLayout(categories, products);
  const siteUrl = absoluteUrl('/');
  const sameAs = [settings.instagramUrl, settings.tiktokUrl, settings.facebookUrl].filter(Boolean);

  return (
    <>
      <Hero showCollections={layout.mode === 'categories'} products={featured} iconSrc={cld('/brand/favicon-icon.png')} />
      <Marquee />
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
                <Spaghetti as="p" className="eyebrow">{LANDING.shop.eyebrow}</Spaghetti>
                <Spaghetti as="h2" ghost={LANDING.shop.titleGhost}>{LANDING.shop.title}</Spaghetti>
                <p className="lead">{LANDING.shop.text}</p>
              </div>
              <ShopGrid products={layout.products} />
            </div>
          )}
        </section>
      )}

      {featured.length > 0 && <BestSellers products={featured} />}
      <StoryTeaser storeName={settings.storeName} />
      {focus && <Focus product={focus} />}
      <Why storeName={settings.storeName} />
      <Reviews settings={settings} />
      <Instagram settings={settings} />
      <Faq settings={settings} />
      <Contact settings={settings} />
      <FinalCta />

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
