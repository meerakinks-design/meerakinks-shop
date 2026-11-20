import type { ZoneTypeValue } from '@/lib/constants/order';

// Contrat partagé entre POST /api/v1/orders, la page de confirmation et le message WhatsApp.

export interface OrderRecapLine {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderRecap {
  reference: string;
  zoneType: ZoneTypeValue;
  /** Destination lisible : « Cocody (Abidjan) », « Bouaké, Côte d’Ivoire »… */
  placeLabel: string;
  lines: OrderRecapLine[];
  subtotal: number;
  /** null = frais à confirmer. */
  deliveryFee: number | null;
  /** null tant que les frais ne sont pas fixés : jamais de total inventé (RM-03). */
  total: number | null;
  /** Montant à régler pour confirmer : acompte (Abidjan) ou paiement intégral ; null tant que non déterminé. */
  upfrontAmount: number | null;
}

export interface OrderCreated extends OrderRecap {
  /** Date d'enregistrement (ISO), imprimée sur le reçu ; absente si la lecture ne la fournit pas. */
  createdAt?: string;
  /** Lien wa.me construit à partir de la commande ENREGISTRÉE ; null si le numéro de la vendeuse n'est pas configuré. */
  whatsappUrl: string | null;
}

export function formatPlaceLabel(zoneType: ZoneTypeValue, city: string, country: string): string {
  return zoneType === 'ABIDJAN' ? `${city} (Abidjan)` : `${city}, ${country}`;
}
