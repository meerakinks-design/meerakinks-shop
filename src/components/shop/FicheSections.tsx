import Link from 'next/link';
import { COMMON, GAMMES, type CatalogueBundle, type CatalogueEntry, type CatalogueProduct } from '@/content/catalogue';
import { FICHE } from '@/content/fiche-produit';
import { productPath } from '@/lib/constants/routes';
import { formatFcfa } from '@/lib/money';
import { PRECAUTION_COLUMNS, componentsOf, completeRange, duoOf, gammeLabel, imagePath, isBundle, isProduct, precautionFlags } from '@/lib/shop/catalogue';
import { FichePrice } from './FichePrice';
import { GammeDot } from './ShowcaseCard';

/** Étiquette au-dessus du nom : la couleur du soin (« Gamme jaune · lavage et pousse ») ou le type d'offre. */
export function FicheTag({ entry }: { entry: CatalogueEntry }) {
  if (isProduct(entry)) {
    return (
      <span className="fiche-tag">
        <GammeDot gamme={entry.gamme} />
        {gammeLabel(GAMMES[entry.gamme])}
      </span>
    );
  }
  return (
    <span className="fiche-tag">
      {entry.gamme ? <GammeDot gamme={entry.gamme} /> : (['jaune', 'orange', 'marron'] as const).map((key) => <GammeDot key={key} gamme={key} />)}
      {entry.type === 'duo' ? FICHE.tag.offerDuo : FICHE.tag.offerRange}
    </span>
  );
}

/** « Fiche express » : les lignes du tableau du dossier (contenance, type, bienfaits), ou le besoin et le contenu d'une offre. */
export function FicheFacts({ entry }: { entry: CatalogueEntry }) {
  const rows: Array<[string, string]> = isProduct(entry)
    ? [[FICHE.facts.size, entry.size], [FICHE.facts.type, entry.productType], [FICHE.facts.benefits, entry.benefits]]
    : [[FICHE.facts.need, entry.need], [FICHE.facts.contents, componentsOf(entry).map((product) => `${product.name} (${product.size})`).join(' + ')]];
  return (
    <dl className="fiche-facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Conservation (PAO), fabrication et contact : les mentions communes à toutes les étiquettes. */
function FicheLabel() {
  return (
    <dl className="fiche-label">
      <div>
        <dt>{FICHE.label.shelfLife}</dt>
        <dd>{FICHE.shelfLife(COMMON.shelfLife)}</dd>
      </div>
      <div>
        <dt>{FICHE.label.madeIn}</dt>
        <dd>
          {COMMON.madeIn} · <a href={`mailto:${COMMON.contactEmail}`}>{COMMON.contactEmail}</a>
        </dd>
      </div>
    </dl>
  );
}

/** Sous la fiche d'un soin : mode d'emploi (étapes numérotées), précautions, ingrédients (INCI), mentions de l'étiquette. */
export function ProductSheet({ product }: { product: CatalogueProduct }) {
  return (
    <div className="fiche-sheet">
      <div className="fiche-grid">
        <section className="fiche-card" aria-labelledby="fiche-usage">
          <h2 id="fiche-usage">{FICHE.usage}</h2>
          <ol className="fiche-steps">
            {product.usage.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        <section className="fiche-card" aria-labelledby="fiche-precautions">
          <h2 id="fiche-precautions">{FICHE.precautions}</h2>
          <ul className="fiche-list">
            {product.precautions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
      <details className="fiche-inci" open>
        <summary>
          <span>{FICHE.inci}</span>
        </summary>
        <p>{product.inci.join(', ')}.</p>
        <p className="fiche-hint">{FICHE.inciHelp}</p>
      </details>
      <FicheLabel />
    </div>
  );
}

function ContentCard({ product }: { product: CatalogueProduct }) {
  const [first] = product.images;
  return (
    <li>
      <Link href={productPath(product.slug)} className="fiche-content">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagePath(first)} alt="" width={864} height={1152} loading="lazy" decoding="async" />
        <span className="fiche-content-body">
          <span className="fiche-content-name">{product.name}</span>
          <span className="fiche-content-kind">{product.kind}</span>
          <span className="fiche-content-meta">
            <GammeDot gamme={product.gamme} /> {product.size} · {formatFcfa(product.price)}
          </span>
          <span className="fiche-cta">{FICHE.contents.seeSheet} →</span>
        </span>
      </Link>
    </li>
  );
}

/** Sous la fiche d'une offre : les produits réunis (avec leur lien), puis la matrice des précautions du dossier. */
export function BundleSheet({ bundle }: { bundle: CatalogueBundle }) {
  const products = componentsOf(bundle);
  return (
    <div className="fiche-sheet">
      <section aria-labelledby="fiche-contents">
        <h2 id="fiche-contents" className="fiche-heading">
          {bundle.type === 'duo' ? FICHE.contents.duo : FICHE.contents.range}
        </h2>
        <ul className="fiche-contents" data-count={products.length}>
          {products.map((product) => (
            <ContentCard key={product.slug} product={product} />
          ))}
        </ul>
        <p className="fiche-hint">{FICHE.sheetHint}</p>
      </section>

      <section className="fiche-card" aria-labelledby="fiche-matrix">
        <h2 id="fiche-matrix">{FICHE.matrix.title}</h2>
        <p className="fiche-common">{COMMON.commonPrecaution}</p>
        <div className="fiche-table-wrap" tabIndex={0} role="region" aria-labelledby="fiche-matrix">
          <table className="fiche-table">
            <thead>
              <tr>
                <th scope="col">{FICHE.matrix.product}</th>
                {PRECAUTION_COLUMNS.map((column) => (
                  <th key={column.key} scope="col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const flags = precautionFlags(product);
                return (
                  <tr key={product.slug}>
                    <th scope="row">{product.name}</th>
                    {PRECAUTION_COLUMNS.map((column) => (
                      <td key={column.key} data-on={flags[column.key] ? 'true' : 'false'}>
                        <span aria-hidden="true">{flags[column.key] ? '✓' : '—'}</span>
                        <span className="visually-hidden">{flags[column.key] ? FICHE.matrix.yes : FICHE.matrix.no}</span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <FicheLabel />
    </div>
  );
}

function OfferCard({ bundle }: { bundle: CatalogueBundle }) {
  const [first] = bundle.images;
  return (
    <li>
      <Link href={productPath(bundle.slug)} className="fiche-offer-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagePath(first)} alt="" width={864} height={1152} loading="lazy" decoding="async" />
        <span className="fiche-content-body">
          <span className="fiche-content-name">{bundle.name}</span>
          <span className="fiche-content-kind">{bundle.kind}</span>
          <FichePrice entry={bundle} compact />
          <span className="fiche-cta">{FICHE.offer.see} →</span>
        </span>
      </Link>
    </li>
  );
}

/**
 * Les offres qui contiennent ce produit : le duo de sa couleur et la gamme complète (sur la fiche d'un soin) ; la gamme complète
 * (sur la fiche d'un duo) ; rien sur la fiche de la gamme complète, qui les réunit déjà toutes.
 */
export function RelatedOffers({ entry }: { entry: CatalogueEntry }) {
  const offers: CatalogueBundle[] = isProduct(entry) ? [duoOf(entry), completeRange()] : isBundle(entry) && entry.type === 'duo' ? [completeRange()] : [];
  if (offers.length === 0) return null;
  return (
    <section className="fiche-offers" aria-labelledby="fiche-offers">
      <h2 id="fiche-offers" className="fiche-heading">
        {isProduct(entry) ? FICHE.offer.withProduct : FICHE.offer.range}
      </h2>
      <ul className="fiche-offer-list">
        {offers.map((offer) => (
          <OfferCard key={offer.slug} bundle={offer} />
        ))}
      </ul>
    </section>
  );
}
