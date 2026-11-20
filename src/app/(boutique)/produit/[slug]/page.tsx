import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { paymentReminder } from '@/content/livraison';
import { PRODUCT_TEXT } from '@/content/product-page';
import { JsonLd } from '@/components/shop/JsonLd';
import { ProductBadges } from '@/components/shop/ProductBadges';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { ProductPurchase } from '@/components/shop/ProductPurchase';
import { ShopGrid } from '@/components/shop/ShopGrid';
import Spaghetti from '@/components/shop/Spaghetti';
import { categoryPath, productPath } from '@/lib/constants/routes';
import { formatFcfa } from '@/lib/money';
import { effectivePrice, hasPromotion, isOutOfStock } from '@/lib/shop/product-display';
import { absoluteUrl, summarize } from '@/lib/shop/seo';
import { formatWeight } from '@/lib/weight';
import { getProductPage, getPublicSettings, getRelatedProducts } from '@/server/services/catalog.queries';
import { resolveProductSlug } from '@/server/services/slug-redirects.service';

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

/** Un ancien slug redirige (308, permanent) vers le slug actuel ; brouillon, archivé ou inconnu : 404. */
async function loadProduct(slug: string) {
  const resolution = await resolveProductSlug(slug);
  if (resolution.kind === 'redirect') permanentRedirect(productPath(resolution.slug));
  if (resolution.kind === 'missing') notFound();
  const product = await getProductPage(resolution.id);
  if (!product) notFound();
  return product;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const resolution = await resolveProductSlug(params.slug);
  if (resolution.kind !== 'found') return {};
  const product = await getProductPage(resolution.id);
  if (!product) return {};
  const image = product.images[0];
  return {
    // Titre et méta-description : ceux saisis en back-office, sinon générés depuis le nom et la description.
    title: product.seoTitle ?? product.name,
    description: product.metaDescription ?? summarize(product.description),
    alternates: { canonical: productPath(product.slug) },
    openGraph: { title: product.seoTitle ?? product.name, ...(image ? { images: [{ url: image.url, alt: image.alt }] } : {}) },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await loadProduct(params.slug);
  const [settings, related] = await Promise.all([
    getPublicSettings(),
    getRelatedProducts(product.id, product.category?.id ?? null),
  ]);

  const price = effectivePrice(product);
  const url = absoluteUrl(productPath(product.slug));
  const home = absoluteUrl('/');
  const shop = absoluteUrl('/boutique');
  const categoryUrl = product.category ? absoluteUrl(categoryPath(product.category.slug)) : null;

  const crumbs = [
    home && { name: 'Accueil', item: home },
    shop && { name: 'Boutique', item: shop },
    product.category && categoryUrl && { name: product.category.name, item: categoryUrl },
    url && { name: product.name, item: url },
  ].filter((crumb): crumb is { name: string; item: string } => Boolean(crumb));

  return (
    <div className="container section product-page">
      <p className="product-back">
        <Link href="/boutique">← Retour à la boutique</Link>
        {product.category && (
          <>
            {' · '}
            <Link href={categoryPath(product.category.slug)}>{product.category.name}</Link>
          </>
        )}
      </p>

      <div className="product-layout">
        <ProductGallery images={product.images} name={product.name} />

        <div className="product-info">
          {product.isNew && <span className="badge-new badge-inline">Nouveau</span>}
          <h1 className="product-title">{product.name}</h1>
          <p className="product-price">
            {hasPromotion(product) && <s aria-label={`Ancien prix ${formatFcfa(product.price)}`}>{formatFcfa(product.price)}</s>} <strong>{formatFcfa(price)}</strong>
          </p>

          <ProductPurchase product={{ id: product.id, name: product.name, price, stock: product.stock }} />

          {(product.characteristics.length > 0 || product.weightGrams !== null) && (
            <section aria-labelledby="caracteristiques" className="info-card">
              <h2 id="caracteristiques">{PRODUCT_TEXT.features}</h2>
              <ul className="check-list">
                {product.characteristics.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {product.weightGrams !== null && <li>Poids : {formatWeight(product.weightGrams)}</li>}
              </ul>
            </section>
          )}

          {product.usageAdvice && (
            <section aria-labelledby="utilisation" className="info-card">
              <h2 id="utilisation">{PRODUCT_TEXT.usage}</h2>
              <p>{product.usageAdvice}</p>
            </section>
          )}

          <ProductBadges />

          <section aria-labelledby="livraison" className="info-card product-note">
            <h2 id="livraison">{PRODUCT_TEXT.paymentDelivery}</h2>
            <p>{paymentReminder(settings.depositAmount)}</p>
          </section>
        </div>
      </div>

      <section aria-labelledby="histoire" className="product-story">
        <Spaghetti as="h2" id="histoire">{PRODUCT_TEXT.story}</Spaghetti>
        <div className="product-description">
          {product.description.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related" className="section">
          <h2 id="related">Vous aimerez aussi</h2>
          <ShopGrid products={related} uniform />
        </section>
      )}

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.metaDescription ?? summarize(product.description, 300),
          ...(product.sku ? { sku: product.sku } : {}),
          ...(product.images.length > 0 ? { image: product.images.map((image) => image.url) } : {}),
          ...(url ? { url } : {}),
          offers: {
            '@type': 'Offer',
            priceCurrency: 'XOF',
            price: price,
            availability: isOutOfStock(product.stock) ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
            ...(url ? { url } : {}),
          },
          // Pas de note moyenne ni d'avis : aucune donnée réelle (RM-40).
        }}
      />
      {crumbs.length > 1 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: crumb.item })),
          }}
        />
      )}
    </div>
  );
}
