import Link from 'next/link';
import { COMMON, type CatalogueEntry } from '@/content/catalogue';
import { FICHE } from '@/content/fiche-produit';
import { productPath, PUBLIC_ROUTES } from '@/lib/constants/routes';
import { imagePath, isBundle, isProduct } from '@/lib/shop/catalogue';
import { absoluteUrl } from '@/lib/shop/seo';
import { FichePrice } from './FichePrice';
import { BundleSheet, FicheFacts, FicheTag, ProductSheet, RelatedOffers } from './FicheSections';
import { JsonLd } from './JsonLd';
import { ProductGallery } from './ProductGallery';

/**
 * Fiche d'un produit de la vitrine (/produit/<id>) : les photos en slide (balayage au doigt, flèches, pastilles — la même galerie que
 * les fiches du catalogue), la couleur ou l'offre, le nom, le sous-titre de l'étiquette, le prix (règle du dossier : ancien prix
 * barré d'un seul trait puis prix réel, pour une offre), la fiche express, puis le détail : mode d'emploi, précautions, ingrédients
 * pour un soin ; produits réunis et précautions pour une offre. La commande n'est pas encore ouverte : une phrase le dit.
 */
export function ShowcaseProductView({ entry }: { entry: CatalogueEntry }) {
  const images = entry.images.map((image) => ({ url: imagePath(image), alt: image.alt }));
  const url = absoluteUrl(productPath(entry.slug));
  const home = absoluteUrl(PUBLIC_ROUTES.home);
  const shop = absoluteUrl(PUBLIC_ROUTES.shop);
  const crumbs = [home && { name: 'Accueil', item: home }, shop && { name: 'Boutique', item: shop }, url && { name: entry.name, item: url }].filter(
    (crumb): crumb is { name: string; item: string } => Boolean(crumb),
  );
  const imageUrls = entry.images.map((image) => absoluteUrl(imagePath(image))).filter((item): item is string => item !== null);

  return (
    <div className="container section product-page showcase-product">
      <p className="product-back">
        <Link href={PUBLIC_ROUTES.shop}>{FICHE.back}</Link>
      </p>

      <div className="product-layout">
        <ProductGallery images={images} name={entry.name} />
        <div className="product-info">
          <FicheTag entry={entry} />
          <h1 className="product-title fiche-title">{entry.name}</h1>
          <p className={isBundle(entry) ? 'showcase-product-kind is-plain' : 'showcase-product-kind'}>{entry.kind}</p>
          <FichePrice entry={entry} />
          <p className="fiche-soon">
            {FICHE.soon} <Link href="/#contact">{FICHE.question}</Link>
          </p>
          <FicheFacts entry={entry} />
        </div>
      </div>

      <div className="fiche-about">
        {entry.description.split(/\n{2,}/).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {isProduct(entry) && <ProductSheet product={entry} />}
      {isBundle(entry) && <BundleSheet bundle={entry} />}
      <RelatedOffers entry={entry} />

      {/* Pas d'offre (prix, disponibilité) dans les données structurées tant que la commande n'est pas ouverte. */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: entry.name,
          description: entry.metaDescription,
          brand: { '@type': 'Brand', name: COMMON.brand },
          ...(imageUrls.length > 0 ? { image: imageUrls } : {}),
          ...(url ? { url } : {}),
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
