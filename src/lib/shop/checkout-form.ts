import { type ZoneTypeValue } from '@/lib/constants/order';
import { computeTotal, computeUpfrontAmount } from '@/lib/shop/order-amounts';
import { DEFAULT_DIAL_CODE } from '@/lib/shop/phone';
import type { PublicZone } from '@/lib/shop/zones';
import type { OrderPayload } from '@/lib/validation/order.schema';

// Logique pure du formulaire de commande (modal) : valeurs, charge utile, erreurs, estimation des montants.
// Rien ici ne touche au DOM : tout est testable sans navigateur.

export interface CheckoutValues {
  /** « Nom complet » : nom et prénom. */
  fullName: string;
  /** Indicatif du pays, TAPÉ librement par le client (chiffres seulement ; 225 par défaut). */
  dialCode: string;
  phone: string;
  email: string;
  zoneType: ZoneTypeValue;
  deliveryZoneId: string;
  placeName: string;
  city: string;
  address: string;
  addressDetails: string;
  customerNote: string;
  /** Case « J'ai vérifié les informations de ma commande ». */
  infoConfirmed: boolean;
  /** Champ piège : doit rester vide. */
  companyFax: string;
}

/** Champs affichables, dans l'ordre de la page (sert à placer le focus sur le premier champ invalide). */
export const CHECKOUT_FIELDS = [
  'fullName',
  'phone',
  'email',
  'zoneType',
  'deliveryZoneId',
  'placeName',
  'city',
  'address',
  'addressDetails',
  'customerNote',
  'infoConfirmed',
] as const;
export type CheckoutField = (typeof CHECKOUT_FIELDS)[number];
export type CheckoutErrors = Partial<Record<CheckoutField, string>>;

export const emptyCheckoutValues = (): CheckoutValues => ({
  fullName: '',
  dialCode: DEFAULT_DIAL_CODE,
  phone: '',
  email: '',
  zoneType: 'ABIDJAN',
  deliveryZoneId: '',
  placeName: '',
  city: '',
  address: '',
  addressDetails: '',
  customerNote: '',
  infoConfirmed: false,
  companyFax: '',
});

/** Clé d'idempotence (RM-14) : un UUID quand le navigateur sait en fabriquer, sinon un identifiant aléatoire équivalent. */
export function createIdempotencyKey(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === 'function') return webCrypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface PayloadItem {
  productId: string;
  quantity: number;
}

/** Charge utile envoyée au serveur : identifiants et quantités, JAMAIS de prix ni de total (D-10). */
export function buildOrderPayload(values: CheckoutValues, items: readonly PayloadItem[], idempotencyKey: string): OrderPayload {
  return {
    idempotencyKey,
    items: items.map(({ productId, quantity }) => ({ productId, quantity })),
    fullName: values.fullName,
    phoneDialCode: values.dialCode,
    phone: values.phone,
    email: values.email,
    zoneType: values.zoneType,
    deliveryZoneId: values.deliveryZoneId,
    placeName: values.placeName,
    city: values.city,
    address: values.address,
    addressDetails: values.addressDetails,
    customerNote: values.customerNote,
    infoConfirmed: values.infoConfirmed,
    companyFax: values.companyFax,
  };
}

/**
 * Erreurs de zod (navigateur) ou du serveur → un message par champ. Ce qui ne correspond à aucun champ du formulaire
 * (panier, clé de commande) devient un message général.
 */
export function toFieldErrors(fields: Record<string, string[] | undefined> | undefined): { errors: CheckoutErrors; general: string | null } {
  const errors: CheckoutErrors = {};
  let general: string | null = null;
  for (const [name, messages] of Object.entries(fields ?? {})) {
    const message = messages?.[0];
    if (!message) continue;
    if ((CHECKOUT_FIELDS as readonly string[]).includes(name)) errors[name as CheckoutField] = message;
    else general ??= message;
  }
  return { errors, general };
}

export function firstInvalidField(errors: CheckoutErrors): CheckoutField | null {
  return CHECKOUT_FIELDS.find((field) => errors[field] !== undefined) ?? null;
}

/**
 * Identifiant du contrôle à qui donner le focus. La destination est une liste OU un champ libre selon la zone :
 * dans les deux cas, c'est le même identifiant.
 */
export function controlIdFor(prefix: string, field: CheckoutField): string {
  const name = field === 'deliveryZoneId' || field === 'placeName' ? 'destination' : field;
  return `${prefix}-${name}`;
}

export interface CheckoutAmounts {
  deliveryFee: number | null;
  total: number | null;
  upfrontAmount: number | null;
}

/** Estimation affichée avant l'envoi : le serveur recalcule tout, ce total n'est qu'indicatif (D-10). */
export function estimateCheckoutAmounts(input: {
  subtotal: number;
  zoneType: ZoneTypeValue;
  zone: PublicZone | null;
  depositAmount: number;
}): CheckoutAmounts {
  const deliveryFee = input.zone?.fee ?? null;
  const total = computeTotal(input.subtotal, deliveryFee);
  return {
    deliveryFee,
    total,
    upfrontAmount: computeUpfrontAmount(input.zoneType, { depositAmount: input.depositAmount, subtotal: input.subtotal, total }),
  };
}
