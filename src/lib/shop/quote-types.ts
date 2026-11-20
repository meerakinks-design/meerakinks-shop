export type QuoteLineStatus = 'ok' | 'limited' | 'out_of_stock' | 'unavailable';

export interface QuoteLine {
  productId: string;
  status: QuoteLineStatus;
  slug: string | null;
  name: string;
  imageUrl: string | null;
  imageAlt: string;
  /** Prix facturé par unité (promotion comprise). */
  unitPrice: number;
  /** Prix normal, renseigné seulement quand une promotion s'applique (pour l'afficher barré). */
  regularPrice: number | null;
  /** Quantité demandée par le client. */
  requestedQuantity: number;
  /** Quantité réellement facturée (0 si indisponible ; plafonnée par le stock). */
  quantity: number;
  /** Plafond que le client peut choisir pour cette ligne (stock, 20 au plus). */
  maxQuantity: number;
  lineTotal: number;
}

export interface CartQuote {
  lines: QuoteLine[];
  subtotal: number;
}
