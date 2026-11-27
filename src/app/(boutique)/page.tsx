import type { Metadata } from 'next';
import { JsonLd } from '@/components/shop/JsonLd';
import { CategorySections } from '@/components/shop/CategorySections';
import { ShopCatalog } from '@/components/shop/ShopCatalog';
import { ShopGrid } from '@/components/shop/ShopGrid';
import { ShowcaseGroups } from '@/components/shop/ShowcaseGroups';
import Spaghetti from '@/components/shop/Spaghetti';
import { Collections, Contact, Faq, FinalCta, Hero, Marquee, Why } from '@/components/shop/LandingSections';
import { LANDING } from '@/content/landing';
import { SEO } from '@/content/seo';
import { SHOWCASE_ENABLED } from '@/content/vitrine';
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
  // Pastilles du catalogue : seulement les catégories qui ont au moins un produit publié.
  const catalogCategories = categories
    .filter((category) => products.some((product) => product.category?.id === category.id))
    .map(({ id, name, slug }) => ({ id, name, slug }));

  return (
    <>
      {/* Parcours : héros (le pot Fluffy Kinks 3D sort de l'affiche) → section « guide » (Vos cheveux ont des besoins…) → boutique
          (l'ancienne page /boutique, déplacée ici : vitrine photo tant que SHOWCASE_ENABLED, sinon catalogue avec recherche, catégories,
          offres, tri) → collections par besoin → produits par catégorie → FAQ (la brume prend le relais) → contact (titre fixe à gauche,
          formulaire à droite) → CTA (la brume glisse sous sa carte). Avis et témoignages retirés pour l'instant. */}
      <Hero showCollections={layout.mode === 'categories'} iconSrc={cld('/brand/favicon-icon.png')} />
      <Marquee />
      <Why storeName={settings.storeName} />

      {/* Vitrine photo : chaque soin, puis les duos, puis la gamme complète, en grille asymétrique (réf. Hello Hello). Pas de prix sur les cartes : ils sont sur
          les fiches /produit/<id>. /boutique renvoie ici (#boutique). */}
      {SHOWCASE_ENABLED && (
        <section id="boutique" className="shop-section" aria-label={LANDING.shop.title}>
          <div className="container section">
            <div className="section-head">
              <Spaghetti as="h2" ghost={LANDING.shop.titleGhost}>{LANDING.shop.title}</Spaghetti>
              <p className="lead">{LANDING.shop.text}</p>
            </div>
            <ShowcaseGroups />
          </div>
        </section>
      )}

      {/* Catalogue de la base (l'ancienne page /boutique) : recherche, catégories, offres, tri. Rien sans produit publié. */}
      {!SHOWCASE_ENABLED && products.length > 0 && <ShopCatalog products={products} categories={catalogCategories} />}

      {layout.mode === 'categories' && <Collections sections={layout.sections} hasOffers={products.some(hasPromotion)} />}

      {/* Produits par catégorie (décision D-12) : sections sticky par catégorie. Rien sans produit publié. */}
      {!SHOWCASE_ENABLED && products.length > 0 && layout.mode === 'categories' && (
        <section id="par-categorie" className="shop-section" aria-label={LANDING.collections.title}>
          <CategorySections sections={layout.sections} />
          {layout.others.length > 0 && (
            <div className="container section">
              <Spaghetti as="h2">{LANDING.shop.othersTitle}</Spaghetti>
              <ShopGrid products={layout.others} />
            </div>
          )}
        </section>
      )}

      <Faq settings={settings} delays={delivery.summary} notes={delivery.notes} />
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
