import type { Metadata } from 'next';
import { JsonLd } from '@/components/shop/JsonLd';
import { CategorySections } from '@/components/shop/CategorySections';
import { ShopGrid } from '@/components/shop/ShopGrid';
import { ShowcaseGrid } from '@/components/shop/ShowcaseGrid';
import Spaghetti from '@/components/shop/Spaghetti';
import { Collections, Contact, Faq, FinalCta, Hero, Marquee, Why } from '@/components/shop/LandingSections';
import { ScrollStage } from '@/components/shop/ScrollStage';
import { LANDING } from '@/content/landing';
import { SEO } from '@/content/seo';
import { SHOWCASE_ENABLED } from '@/content/vitrine';
import Link from 'next/link';
import { cld } from '@/lib/cloudinary-static';
import { hasPromotion } from '@/lib/shop/product-display';
import { buildShopLayout } from '@/lib/shop/sections';
import { absoluteUrl } from '@/lib/shop/seo';
import { getPublicDelivery, getPublicSettings, getShopData } from '@/server/services/catalog.queries';

// Page statique régénérée toutes les heures, et immédiatement après chaque modification du back-office.
export const revalidate = 3600;

export const metadata: Metadata = { title: { absolute: SEO.home.title }, description: SEO.home.description, alternates: { canonical: '/' } };

export default async function HomePage() {
  const settings = await getPublicSettings();
  // Vitrine photo (étape 1) : la section Boutique vient de src/content/vitrine.ts ; le catalogue de la base n'est pas lu.
  const noShopData: Awaited<ReturnType<typeof getShopData>> = { categories: [], products: [] };
  const [{ categories, products }, delivery] = await Promise.all([SHOWCASE_ENABLED ? noShopData : getShopData(), getPublicDelivery()]);
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

      {/* Vitrine photo : les soins en grille asymétrique (réf. Hello Hello), sans prix pour l'instant. */}
      {SHOWCASE_ENABLED && (
        <section id="boutique" className="shop-section" aria-label={LANDING.shop.title}>
          <div className="container section">
            <div className="section-head">
              <Spaghetti as="h2" ghost={LANDING.shop.titleGhost}>{LANDING.shop.title}</Spaghetti>
              <p className="lead">{LANDING.shop.text}</p>
            </div>
            <ShowcaseGrid />
            <div className="showcase-more">
              <Link className="btn btn-pill" href="/boutique">
                {LANDING.shop.cta}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Section Boutique (décision D-12) : sections sticky par catégorie, sinon grille. Rien sans produit publié. */}
      {!SHOWCASE_ENABLED && products.length > 0 && (
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

      <Faq settings={settings} delays={delivery.summary} notes={delivery.notes} />
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
