import { FICHE } from '@/content/fiche-produit';
import type { CatalogueEntry } from '@/content/catalogue';
import { formatFcfa } from '@/lib/money';
import { displayPricing } from '@/lib/shop/catalogue';

/**
 * Prix d'une fiche, selon la règle du dossier produit : un soin seul n'a qu'un prix ; un duo ou la gamme complète affiche d'abord
 * l'ancien prix (somme des prix séparés), barré d'un seul trait, puis le prix réel mis en évidence, puis « Économie : … ».
 */
export function FichePrice({ entry, compact = false }: { entry: CatalogueEntry; compact?: boolean }) {
  const { price, regular, saving } = displayPricing(entry);
  return (
    <p className={compact ? 'fiche-price is-compact' : 'fiche-price'}>
      {regular !== null && <s aria-label={FICHE.oldPrice(formatFcfa(regular))}>{formatFcfa(regular)}</s>}
      <strong className="fiche-price-now">{formatFcfa(price)}</strong>
      {saving > 0 && <span className="fiche-saving">{FICHE.saving(formatFcfa(saving))}</span>}
    </p>
  );
}
