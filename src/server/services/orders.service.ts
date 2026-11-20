import type { Prisma } from '@prisma/client';
import { HOME_COUNTRY, ORDER_REFERENCE_PATTERN } from '@/lib/constants/order';
import { STORE_SETTINGS_ID } from '@/lib/constants/store';
import { computeUpfrontAmount, initialPaymentStatus } from '@/lib/shop/order-amounts';
import { buildOrderMessage } from '@/lib/shop/order-message';
import { formatPlaceLabel, type OrderCreated, type OrderRecap } from '@/lib/shop/order-types';
import { formatPhoneDisplay } from '@/lib/shop/phone';
import { effectivePrice, isOutOfStock } from '@/lib/shop/product-display';
import { whatsappLink } from '@/lib/shop/whatsapp';
import type { OrderInput } from '@/lib/validation/order.schema';
import { prisma } from '@/server/db';
import { HttpError } from '@/server/http';
import { logInfo } from '@/server/logger';
import { generateOrderReference, randomCode, receiptNumberFor } from '@/server/services/order-reference';
import { computeSubtotal, computeTotal, lineTotal } from '@/server/services/pricing';
import { buildReceiptData } from '@/server/services/receipt.service';

// Enregistrement des commandes (cahier §6.3, ARBORESCENCE §3). La base est la source de vérité : la commande est
// enregistrée AVANT l'ouverture de WhatsApp (RM-12). Tout ce qui touche à l'argent est relu et calculé ici.

const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 15_000 } as const;
/** Tentatives en cas de collision rare (référence déjà prise, ou deux premières commandes simultanées d'un même numéro). */
const MAX_ATTEMPTS = 3;
const ORDER_CREATED_NOTE = 'Commande passée sur le site.';

const ORDER_SELECT = {
  reference: true,
  createdAt: true,
  zoneType: true,
  shippingCountry: true,
  shippingCity: true,
  shippingAddress: true,
  customerNote: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  upfrontAmount: true,
  customer: { select: { firstName: true, lastName: true, phone: true } },
  items: { orderBy: { id: 'asc' }, select: { productId: true, productNameSnapshot: true, unitPriceSnapshot: true, quantity: true, lineTotal: true } },
} satisfies Prisma.OrderSelect;
type OrderRow = Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>;

const SETTINGS_SELECT = {
  storeName: true,
  sellerWhatsApp: true,
  notificationEmail: true,
  depositAmount: true,
  legalName: true,
  address: true,
  contactPhone: true,
  contactEmail: true,
} satisfies Prisma.StoreSettingsSelect;
type SettingsRow = Prisma.StoreSettingsGetPayload<{ select: typeof SETTINGS_SELECT }>;

type SettingsReader = Pick<Prisma.TransactionClient, 'storeSettings'>;

async function requireSettings(client: SettingsReader): Promise<SettingsRow> {
  const settings = await client.storeSettings.findUnique({ where: { id: STORE_SETTINGS_ID }, select: SETTINGS_SELECT });
  if (!settings) {
    throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'La boutique n’est pas encore configurée. Réessayez un peu plus tard.', { retryable: false });
  }
  return settings;
}

// ---------------------------------------------------------------------------
// Lecture : même fabrique pour la réponse de POST et la page de confirmation, donc le même message WhatsApp.
// ---------------------------------------------------------------------------

function toRecap(row: OrderRow): OrderRecap {
  return {
    reference: row.reference,
    zoneType: row.zoneType,
    placeLabel: formatPlaceLabel(row.zoneType, row.shippingCity, row.shippingCountry),
    lines: row.items.map((item) => ({
      name: item.productNameSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPriceSnapshot,
      lineTotal: item.lineTotal,
    })),
    subtotal: row.subtotal,
    deliveryFee: row.deliveryFee,
    total: row.total,
    upfrontAmount: row.upfrontAmount,
  };
}

function toOrderCreated(row: OrderRow, settings: Pick<SettingsRow, 'storeName' | 'sellerWhatsApp' | 'depositAmount'>): OrderCreated {
  const recap = toRecap(row);
  const message = buildOrderMessage({
    ...recap,
    storeName: settings.storeName,
    customerName: `${row.customer.firstName} ${row.customer.lastName}`,
    phone: formatPhoneDisplay(row.customer.phone),
    address: row.shippingAddress,
    note: row.customerNote,
    // À Abidjan, on annonce l'acompte de CETTE commande (celui qui a été enregistré).
    depositAmount: row.zoneType === 'ABIDJAN' ? (row.upfrontAmount ?? settings.depositAmount) : settings.depositAmount,
  });
  return {
    ...recap,
    whatsappUrl: whatsappLink(settings.sellerWhatsApp, message),
    ...(row.createdAt instanceof Date ? { createdAt: row.createdAt.toISOString() } : {}),
  };
}

/** Page de confirmation : null si la référence n'existe pas (la page ramène alors à l'accueil). */
export async function getOrderConfirmation(reference: string): Promise<OrderCreated | null> {
  if (!ORDER_REFERENCE_PATTERN.test(reference)) return null;
  const row = await prisma.order.findUnique({ where: { reference }, select: ORDER_SELECT });
  if (!row) return null;
  return toOrderCreated(row, await requireSettings(prisma));
}

/** Réponse envoyée à un robot (champ piège rempli) : elle a la forme d'un succès, mais rien n'est enregistré. */
export function decoyOrder(): OrderCreated {
  return { reference: `CMD-${randomCode()}`, zoneType: 'ABIDJAN', placeLabel: '', lines: [], subtotal: 0, deliveryFee: null, total: null, upfrontAmount: null, whatsappUrl: null };
}

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

export async function createOrder(input: OrderInput): Promise<{ order: OrderCreated; created: boolean }> {
  const replay = await findReplay(input);
  if (replay) return { order: replay, created: false };

  for (let attempt = 1; ; attempt += 1) {
    try {
      const order = await prisma.$transaction((tx) => insertOrder(tx, input), TRANSACTION_OPTIONS);
      logInfo('order.created', { reference: order.reference, lines: order.lines.length, zoneType: order.zoneType });
      return { order, created: true };
    } catch (error) {
      const targets = uniqueViolationTargets(error);
      // Deux envois simultanés avec la même clé : le second est refusé par la base, on renvoie la commande du premier.
      if (targets?.some((target) => target.includes('idempotencyKey'))) {
        const raced = await findReplay(input);
        if (raced) return { order: raced, created: false };
      }
      const collision = targets?.some((target) => target.includes('reference') || target.includes('phone'));
      if (!collision || attempt >= MAX_ATTEMPTS) throw error;
    }
  }
}

/** RM-14 : une même clé renvoie la commande déjà créée — à condition que ce soit la même demande. */
async function findReplay(input: OrderInput): Promise<OrderCreated | null> {
  const row = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, select: ORDER_SELECT });
  if (!row) return null;
  if (!isSameRequest(row, input)) {
    throw new HttpError(409, 'CONFLICT', 'Cette commande a déjà été envoyée avec d’autres informations. Rouvrez votre panier puis réessayez.');
  }
  return toOrderCreated(row, await requireSettings(prisma));
}

function isSameRequest(row: OrderRow, input: OrderInput): boolean {
  if (row.customer.phone !== input.phoneE164 || row.items.length !== input.items.length) return false;
  const stored = new Map(row.items.map((item) => [item.productId, item.quantity]));
  return input.items.every((item) => stored.get(item.productId) === item.quantity);
}

interface PricedLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  tracksStock: boolean;
}

interface Destination {
  zoneId: string | null;
  country: string;
  city: string;
  fee: number | null;
}

async function insertOrder(tx: Prisma.TransactionClient, input: OrderInput): Promise<OrderCreated> {
  const settings = await requireSettings(tx);
  const lines = await priceAndReserve(tx, input.items);
  const destination = await resolveDestination(tx, input);

  const subtotal = computeSubtotal(lines);
  const total = computeTotal(subtotal, destination.fee);
  const upfrontAmount = computeUpfrontAmount(input.zoneType, { depositAmount: settings.depositAmount, subtotal, total });
  const paymentStatus = initialPaymentStatus(input.zoneType);

  // Fiche client retrouvée ou créée par téléphone (RM-15). Les coordonnées les plus récentes l'emportent ; la commande
  // garde sa propre copie dans le reçu figé.
  const customer = await tx.customer.upsert({
    where: { phone: input.phoneE164 },
    create: { firstName: input.firstName, lastName: input.lastName, phone: input.phoneE164, email: input.email ?? null },
    update: { firstName: input.firstName, lastName: input.lastName, ...(input.email ? { email: input.email } : {}) },
    select: { id: true },
  });

  const reference = generateOrderReference();
  const shippingAddress = input.addressDetails ? `${input.address}\n${input.addressDetails}` : input.address;
  const receipt = buildReceiptData({
    issuedAt: new Date(),
    shop: { name: settings.storeName, legalName: settings.legalName, address: settings.address, contactPhone: settings.contactPhone, contactEmail: settings.contactEmail },
    depositAmount: settings.depositAmount,
    customer: { firstName: input.firstName, lastName: input.lastName, phone: input.phoneE164, email: input.email ?? null },
    delivery: { zoneType: input.zoneType, country: destination.country, city: destination.city, address: shippingAddress },
    lines: lines.map(({ name, unitPrice, quantity, lineTotal: total }) => ({ name, unitPrice, quantity, lineTotal: total })),
    subtotal,
    deliveryFee: destination.fee,
    total,
    upfrontAmount,
  });

  // RM-34 : la ligne d'envoi naît dans la transaction de la commande ; l'envoi (étape 9) se fait après, et un cron
  // reprend les échecs. La clé de déduplication empêche les doublons.
  const emails: Prisma.EmailNotificationCreateWithoutOrderInput[] = [
    { type: 'NEW_ORDER_SELLER', toEmail: settings.notificationEmail, dedupeKey: `${reference}:NEW_ORDER_SELLER` },
  ];
  if (input.email) emails.push({ type: 'ORDER_RECEIVED_CUSTOMER', toEmail: input.email, dedupeKey: `${reference}:ORDER_RECEIVED_CUSTOMER` });

  const row = await tx.order.create({
    data: {
      reference,
      idempotencyKey: input.idempotencyKey,
      customerId: customer.id,
      source: 'WEBSITE',
      deliveryStatus: 'PENDING',
      paymentStatus,
      zoneType: input.zoneType,
      deliveryZoneId: destination.zoneId,
      shippingCountry: destination.country,
      shippingCity: destination.city,
      shippingAddress,
      customerNote: input.customerNote ?? null,
      subtotal,
      deliveryFee: destination.fee,
      total,
      upfrontAmount,
      items: {
        create: lines.map((line) => ({
          productId: line.productId,
          productNameSnapshot: line.name,
          unitPriceSnapshot: line.unitPrice,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
        })),
      },
      // RM-18 : l'historique commence à la création (ancienne valeur nulle, auteur nul = client ou système).
      history: {
        create: [
          { kind: 'DELIVERY', previousValue: null, newValue: 'PENDING', note: ORDER_CREATED_NOTE },
          { kind: 'PAYMENT', previousValue: null, newValue: paymentStatus, note: ORDER_CREATED_NOTE },
        ],
      },
      receipt: { create: { number: receiptNumberFor(reference), data: receipt } },
      emails: { create: emails },
    },
    select: ORDER_SELECT,
  });

  return toOrderCreated(row, settings);
}

function cartChanged(problems: string[]): HttpError {
  return new HttpError(
    409,
    'CONFLICT',
    'Votre panier a changé : certains articles ne sont plus disponibles en quantité suffisante. Revoyez votre panier puis réessayez.',
    { fields: { items: problems } },
  );
}

/**
 * Relit les produits PUBLIÉS en base (aucun prix reçu n'est utilisé, RM-02), fige nom et prix (RM-04), puis réserve le
 * stock de façon atomique (RM-17) : « stock ≥ quantité » est testé dans l'UPDATE lui-même, donc deux clients sur le
 * dernier article ne passent pas tous les deux. Une erreur annule toute la transaction, réservations comprises.
 */
async function priceAndReserve(tx: Prisma.TransactionClient, items: OrderInput['items']): Promise<PricedLine[]> {
  const products = await tx.product.findMany({
    where: { id: { in: items.map((item) => item.productId) } },
    select: { id: true, name: true, price: true, salePrice: true, stock: true, status: true },
  });
  const byId = new Map(products.map((product) => [product.id, product]));

  const problems: string[] = [];
  const lines: PricedLine[] = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product || product.status !== 'PUBLISHED') {
      problems.push('Un produit de votre panier n’est plus disponible.');
    } else if (isOutOfStock(product.stock)) {
      problems.push(`${product.name} : épuisé.`);
    } else if (product.stock !== null && item.quantity > product.stock) {
      problems.push(`${product.name} : il n’en reste que ${product.stock}.`);
    } else {
      const unitPrice = effectivePrice(product);
      lines.push({
        productId: product.id,
        name: product.name,
        unitPrice,
        quantity: item.quantity,
        lineTotal: lineTotal({ unitPrice, quantity: item.quantity }),
        tracksStock: product.stock !== null,
      });
    }
  }
  if (problems.length > 0) throw cartChanged(problems);

  // Ordre fixe : deux commandes simultanées ne se bloquent pas mutuellement.
  for (const line of [...lines].sort((a, b) => a.productId.localeCompare(b.productId))) {
    if (!line.tracksStock) continue;
    const { count } = await tx.product.updateMany({
      where: { id: line.productId, stock: { gte: line.quantity } },
      data: { stock: { decrement: line.quantity } },
    });
    if (count !== 1) throw cartChanged([`${line.name} : stock insuffisant.`]);
  }
  return lines;
}

function invalidDestination(field: 'deliveryZoneId' | 'placeName', message: string): HttpError {
  return new HttpError(422, 'VALIDATION_ERROR', 'Certaines informations sont invalides.', { fields: { [field]: [message] } });
}

/**
 * Zone, ville ou pays et frais (RM-03, §6.2). Si des zones desservies existent pour ce type, la destination DOIT en
 * faire partie ; sinon le client la saisit et les frais restent « à confirmer » : aucune zone ni aucun tarif inventé
 * (RM-42). Les frais ne viennent jamais du navigateur.
 */
async function resolveDestination(tx: Prisma.TransactionClient, input: OrderInput): Promise<Destination> {
  if (input.deliveryZoneId) {
    const zone = await tx.deliveryZone.findFirst({
      where: { id: input.deliveryZoneId, type: input.zoneType, isActive: true },
      select: { id: true, name: true, fee: true },
    });
    if (!zone) throw invalidDestination('deliveryZoneId', 'Cette destination n’est plus desservie. Choisissez-en une autre.');
    return input.zoneType === 'INTERNATIONAL'
      ? { zoneId: zone.id, country: zone.name, city: input.city ?? '', fee: zone.fee }
      : { zoneId: zone.id, country: HOME_COUNTRY, city: zone.name, fee: zone.fee };
  }

  const served = await tx.deliveryZone.count({ where: { type: input.zoneType, isActive: true } });
  if (served > 0) throw invalidDestination('deliveryZoneId', 'Choisissez votre destination dans la liste.');

  const place = input.placeName ?? '';
  return input.zoneType === 'INTERNATIONAL'
    ? { zoneId: null, country: place, city: input.city ?? '', fee: null }
    : { zoneId: null, country: HOME_COUNTRY, city: place, fee: null };
}

function uniqueViolationTargets(error: unknown): string[] | null {
  if (typeof error !== 'object' || error === null) return null;
  const { code, meta } = error as { code?: unknown; meta?: { target?: unknown } };
  if (code !== 'P2002') return null;
  const target = meta?.target;
  if (Array.isArray(target)) return target.map(String);
  return typeof target === 'string' ? [target] : [];
}
