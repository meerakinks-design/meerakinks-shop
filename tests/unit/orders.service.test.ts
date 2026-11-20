import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ORDER_REFERENCE_PATTERN } from '@/lib/constants/order';
import { orderInputSchema } from '@/lib/validation/order.schema';
import { HttpError } from '@/server/http';

// Le service tourne ici contre une base SIMULÉE (aucun PostgreSQL requis) : on vérifie la logique — relecture des prix,
// stock, zones, idempotence, nouvelles tentatives. Le comportement réel de PostgreSQL se vérifie avec la liste « à tester
// à la main » du README.
const { tx, prismaMock } = vi.hoisted(() => {
  const tx = {
    storeSettings: { findUnique: vi.fn() },
    product: { findMany: vi.fn(), updateMany: vi.fn() },
    deliveryZone: { findFirst: vi.fn(), count: vi.fn() },
    customer: { upsert: vi.fn() },
    order: { create: vi.fn() },
  };
  const prismaMock = {
    order: { findUnique: vi.fn() },
    storeSettings: { findUnique: vi.fn() },
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  return { tx, prismaMock };
});
vi.mock('@/server/db', () => ({ prisma: prismaMock }));
const { logInfo } = vi.hoisted(() => ({ logInfo: vi.fn() }));
vi.mock('@/server/logger', () => ({ logInfo, logError: vi.fn() }));

const { createOrder, decoyOrder, getOrderConfirmation } = await import('@/server/services/orders.service');

const SETTINGS = {
  storeName: 'Awa Beauty',
  sellerWhatsApp: '+225 01 02 03 04 05',
  notificationEmail: 'vendeuse@example.com',
  depositAmount: 2000,
  legalName: 'Awa Beauty SARL',
  address: 'Abidjan',
  contactPhone: null,
  contactEmail: null,
};
const KEY = '0b9d6f1e-6a43-4d6a-9d0e-3f6a5c2b7e11';
const PRODUCTS = {
  a: { id: 'prod_a', name: 'Sérum éclat', price: 10000, salePrice: null, stock: null, status: 'PUBLISHED' },
  b: { id: 'prod_b', name: 'Savon noir', price: 5000, salePrice: 4000, stock: 5, status: 'PUBLISHED' },
};

const input = (overrides: Record<string, unknown> = {}) =>
  orderInputSchema.parse({
    idempotencyKey: KEY,
    items: [{ productId: 'prod_a', quantity: 2 }],
    firstName: 'Awa',
    lastName: 'Koné',
    phoneDialCode: '225',
    phone: '07 00 00 00 00',
    zoneType: 'ABIDJAN',
    placeName: 'Cocody',
    address: 'Riviera Palmeraie, rue des jardins',
    ...overrides,
  });

/** Ligne renvoyée par la base pour une commande déjà enregistrée. */
const storedOrder = (overrides: Record<string, unknown> = {}) => ({
  reference: 'CMD-7K3M9QXP',
  zoneType: 'ABIDJAN',
  shippingCountry: 'Côte d’Ivoire',
  shippingCity: 'Cocody',
  shippingAddress: 'Riviera Palmeraie',
  customerNote: null,
  subtotal: 20000,
  deliveryFee: null,
  total: null,
  upfrontAmount: 2000,
  customer: { firstName: 'Awa', lastName: 'Koné', phone: '+2250700000000' },
  items: [{ productId: 'prod_a', productNameSnapshot: 'Sérum éclat', unitPriceSnapshot: 10000, quantity: 2, lineTotal: 20000 }],
  ...overrides,
});

const createdArgs = () => tx.order.create.mock.calls[0]![0] as { data: Record<string, any>; select: unknown };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
  prismaMock.order.findUnique.mockResolvedValue(null);
  prismaMock.storeSettings.findUnique.mockResolvedValue(SETTINGS);
  tx.storeSettings.findUnique.mockResolvedValue(SETTINGS);
  tx.product.findMany.mockResolvedValue([PRODUCTS.a, PRODUCTS.b]);
  tx.product.updateMany.mockResolvedValue({ count: 1 });
  tx.deliveryZone.count.mockResolvedValue(0);
  tx.deliveryZone.findFirst.mockResolvedValue(null);
  tx.customer.upsert.mockResolvedValue({ id: 'cust_1' });
  tx.order.create.mockImplementation(async ({ data }: { data: Record<string, any> }) => ({
    reference: data.reference,
    zoneType: data.zoneType,
    shippingCountry: data.shippingCountry,
    shippingCity: data.shippingCity,
    shippingAddress: data.shippingAddress,
    customerNote: data.customerNote,
    subtotal: data.subtotal,
    deliveryFee: data.deliveryFee,
    total: data.total,
    upfrontAmount: data.upfrontAmount,
    customer: { firstName: 'Awa', lastName: 'Koné', phone: '+2250700000000' },
    items: data.items.create,
  }));
});

const failure = async (promise: Promise<unknown>): Promise<HttpError> => {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    return error as HttpError;
  }
  throw new Error('une erreur était attendue');
};

describe('createOrder — commande à Abidjan, destination saisie (aucune zone configurée)', () => {
  it('enregistre la commande avec des prix relus en base et un acompte', async () => {
    const { order, created } = await createOrder(input({ items: [{ productId: 'prod_a', quantity: 2 }, { productId: 'prod_b', quantity: 1 }] }));
    expect(created).toBe(true);

    const { data } = createdArgs();
    expect(data.reference).toMatch(ORDER_REFERENCE_PATTERN);
    expect(data.idempotencyKey).toBe(KEY);
    expect(data.customerId).toBe('cust_1');
    expect(data.source).toBe('WEBSITE');
    expect(data.deliveryStatus).toBe('PENDING');
    expect(data.paymentStatus).toBe('DEPOSIT_DUE');
    expect(data.zoneType).toBe('ABIDJAN');
    expect(data.deliveryZoneId).toBeNull();
    expect(data.shippingCountry).toBe('Côte d’Ivoire');
    expect(data.shippingCity).toBe('Cocody');
    // 2 × 10 000 + 1 × 4 000 (prix PROMOTIONNEL de la base)
    expect(data.subtotal).toBe(24000);
    expect(data.deliveryFee).toBeNull();
    expect(data.total).toBeNull();
    expect(data.upfrontAmount).toBe(2000);
    expect(data.items.create).toEqual([
      { productId: 'prod_a', productNameSnapshot: 'Sérum éclat', unitPriceSnapshot: 10000, quantity: 2, lineTotal: 20000 },
      { productId: 'prod_b', productNameSnapshot: 'Savon noir', unitPriceSnapshot: 4000, quantity: 1, lineTotal: 4000 },
    ]);

    expect(order.reference).toBe(data.reference);
    expect(order.subtotal).toBe(24000);
    expect(order.total).toBeNull();
    expect(order.placeLabel).toBe('Cocody (Abidjan)');
  });

  it('ignore les prix du navigateur : seul l’identifiant et la quantité comptent (D-10, RM-02)', async () => {
    await createOrder(input({ items: [{ productId: 'prod_a', quantity: 1, price: 1, unitPrice: 1 }], price: 1, total: 1 }));
    const { data } = createdArgs();
    expect(data.subtotal).toBe(10000);
    expect(data.items.create[0].unitPriceSnapshot).toBe(10000);
  });

  it('écrit l’historique, le reçu figé et les lignes d’email dans la même transaction (RM-18, RM-24, RM-34)', async () => {
    await createOrder(input({ email: 'awa@example.com' }));
    const { data } = createdArgs();
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

    expect(data.history.create).toEqual([
      { kind: 'DELIVERY', previousValue: null, newValue: 'PENDING', note: 'Commande passée sur le site.' },
      { kind: 'PAYMENT', previousValue: null, newValue: 'DEPOSIT_DUE', note: 'Commande passée sur le site.' },
    ]);

    expect(data.receipt.create.number).toBe(data.reference.replace('CMD-', 'REC-'));
    const receipt = data.receipt.create.data;
    expect(receipt.version).toBe(1);
    expect(receipt.shop.name).toBe('Awa Beauty');
    expect(receipt.customer).toEqual({ firstName: 'Awa', lastName: 'Koné', phone: '+2250700000000', email: 'awa@example.com' });
    expect(receipt.lines).toEqual([{ name: 'Sérum éclat', unitPrice: 10000, quantity: 2, lineTotal: 20000 }]);
    expect(receipt.amounts).toEqual({ currency: 'XOF', subtotal: 20000, deliveryFee: null, total: null, upfrontAmount: 2000 });
    expect(receipt.paymentTerms).toContain('acompte');

    expect(data.emails.create).toEqual([
      { type: 'NEW_ORDER_SELLER', toEmail: 'vendeuse@example.com', dedupeKey: `${data.reference}:NEW_ORDER_SELLER` },
      { type: 'ORDER_RECEIVED_CUSTOMER', toEmail: 'awa@example.com', dedupeKey: `${data.reference}:ORDER_RECEIVED_CUSTOMER` },
    ]);
  });

  it('sans email du client : une seule ligne d’envoi, pour la vendeuse', async () => {
    await createOrder(input());
    expect(createdArgs().data.emails.create).toHaveLength(1);
  });

  it('retrouve ou crée la fiche client par téléphone normalisé (RM-15)', async () => {
    await createOrder(input({ email: 'Awa@Example.com' }));
    expect(tx.customer.upsert).toHaveBeenCalledWith({
      where: { phone: '+2250700000000' },
      create: { firstName: 'Awa', lastName: 'Koné', phone: '+2250700000000', email: 'awa@example.com' },
      update: { firstName: 'Awa', lastName: 'Koné', email: 'awa@example.com' },
      select: { id: true },
    });
  });

  it('ne supprime jamais l’email d’un client connu quand il n’en saisit pas', async () => {
    await createOrder(input());
    const call = tx.customer.upsert.mock.calls[0]![0] as { update: Record<string, unknown> };
    expect(call.update).not.toHaveProperty('email');
  });

  it('fusionne l’adresse et ses précisions, et conserve la note', async () => {
    await createOrder(input({ addressDetails: 'Portail bleu, 2e étage', customerNote: 'Appelez avant de passer.' }));
    const { data } = createdArgs();
    expect(data.shippingAddress).toBe('Riviera Palmeraie, rue des jardins\nPortail bleu, 2e étage');
    expect(data.customerNote).toBe('Appelez avant de passer.');
  });

  it('plafonne l’acompte à la valeur de la commande', async () => {
    tx.product.findMany.mockResolvedValue([{ ...PRODUCTS.a, price: 1500 }]);
    await createOrder(input({ items: [{ productId: 'prod_a', quantity: 1 }] }));
    expect(createdArgs().data.upfrontAmount).toBe(1500);
  });

  it('construit le lien WhatsApp à partir de la commande enregistrée, sans numéro Wave (RM-08, RM-12)', async () => {
    const { order } = await createOrder(input());
    expect(order.whatsappUrl).toMatch(/^https:\/\/wa\.me\/2250102030405\?text=/);
    const message = decodeURIComponent(order.whatsappUrl!.split('?text=')[1]!);
    expect(message).toContain(order.reference);
    expect(message).toContain('Awa Koné');
    expect(message).toContain('+225 07 00 00 00 00');
    expect(message).toContain('Sérum éclat');
    expect(message).toContain('à confirmer');
  });

  it('n’écrit aucune donnée personnelle dans le journal', async () => {
    await createOrder(input({ email: 'awa@example.com' }));
    expect(logInfo).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(logInfo.mock.calls[0]);
    for (const personal of ['Awa', 'Koné', '0700000000', 'awa@example.com', 'Riviera']) expect(logged).not.toContain(personal);
    expect(logInfo.mock.calls[0]?.[0]).toBe('order.created');
  });

  it('pas de lien WhatsApp tant que le numéro de la vendeuse n’est pas configuré', async () => {
    tx.storeSettings.findUnique.mockResolvedValue({ ...SETTINGS, sellerWhatsApp: 'À configurer' });
    const { order } = await createOrder(input());
    expect(order.whatsappUrl).toBeNull();
  });
});

describe('createOrder — zones et frais', () => {
  it('Abidjan : commune choisie dans la liste, frais de la zone (RM-03)', async () => {
    tx.deliveryZone.findFirst.mockResolvedValue({ id: 'zone_cocody', name: 'Cocody', fee: 1500 });
    await createOrder(input({ placeName: '', deliveryZoneId: 'zone_cocody' }));
    const { data } = createdArgs();
    expect(tx.deliveryZone.findFirst).toHaveBeenCalledWith({ where: { id: 'zone_cocody', type: 'ABIDJAN', isActive: true }, select: { id: true, name: true, fee: true } });
    expect(data.deliveryZoneId).toBe('zone_cocody');
    expect(data.shippingCity).toBe('Cocody');
    expect(data.deliveryFee).toBe(1500);
    expect(data.total).toBe(21500);
    expect(data.upfrontAmount).toBe(2000);
  });

  it('Abidjan : une zone sans frais renseignés reste « à confirmer »', async () => {
    tx.deliveryZone.findFirst.mockResolvedValue({ id: 'zone_yop', name: 'Yopougon', fee: null });
    await createOrder(input({ placeName: '', deliveryZoneId: 'zone_yop' }));
    const { data } = createdArgs();
    expect(data.deliveryFee).toBeNull();
    expect(data.total).toBeNull();
  });

  it('intérieur : paiement intégral, donc acompte = total quand les frais sont connus', async () => {
    tx.deliveryZone.findFirst.mockResolvedValue({ id: 'zone_bouake', name: 'Bouaké', fee: 3000 });
    await createOrder(input({ zoneType: 'INTERIOR', placeName: '', deliveryZoneId: 'zone_bouake' }));
    const { data } = createdArgs();
    expect(data.paymentStatus).toBe('TO_CONFIRM');
    expect(data.shippingCountry).toBe('Côte d’Ivoire');
    expect(data.shippingCity).toBe('Bouaké');
    expect(data.total).toBe(23000);
    expect(data.upfrontAmount).toBe(23000);
  });

  it('intérieur sans zone configurée : ville saisie, frais et montant à confirmer, rien d’inventé (RM-42)', async () => {
    await createOrder(input({ zoneType: 'INTERIOR', placeName: 'Korhogo' }));
    const { data } = createdArgs();
    expect(data.deliveryZoneId).toBeNull();
    expect(data.shippingCity).toBe('Korhogo');
    expect(data.deliveryFee).toBeNull();
    expect(data.total).toBeNull();
    expect(data.upfrontAmount).toBeNull();
    expect(data.paymentStatus).toBe('TO_CONFIRM');
  });

  it('étranger : le pays est la destination, la ville est saisie', async () => {
    await createOrder(input({ zoneType: 'INTERNATIONAL', placeName: 'France', city: 'Lyon' }));
    const { data } = createdArgs();
    expect(data.shippingCountry).toBe('France');
    expect(data.shippingCity).toBe('Lyon');
    expect(data.deliveryFee).toBeNull();
  });

  it('étranger avec zone listée : le nom de la zone est le pays', async () => {
    tx.deliveryZone.findFirst.mockResolvedValue({ id: 'zone_fr', name: 'France', fee: 12000 });
    const { order } = await createOrder(input({ zoneType: 'INTERNATIONAL', placeName: '', deliveryZoneId: 'zone_fr', city: 'Lyon' }));
    expect(createdArgs().data.shippingCountry).toBe('France');
    expect(order.placeLabel).toBe('Lyon, France');
    expect(order.upfrontAmount).toBe(32000);
  });

  it('refuse une zone inexistante, inactive ou d’un autre type (422)', async () => {
    const error = await failure(createOrder(input({ placeName: '', deliveryZoneId: 'zone_fantome' })));
    expect(error.status).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fields?.deliveryZoneId?.[0]).toContain('plus desservie');
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('si des zones existent pour ce type, la saisie libre est refusée', async () => {
    tx.deliveryZone.count.mockResolvedValue(3);
    const error = await failure(createOrder(input({ placeName: 'Cocody' })));
    expect(error.status).toBe(422);
    expect(error.fields?.deliveryZoneId?.[0]).toContain('dans la liste');
  });
});

describe('createOrder — disponibilité et stock', () => {
  it('refuse (409) un produit introuvable ou non publié, sans rien réserver', async () => {
    tx.product.findMany.mockResolvedValue([{ ...PRODUCTS.a, status: 'DRAFT' }]);
    const error = await failure(createOrder(input()));
    expect(error.status).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.fields?.items).toHaveLength(1);
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.order.create).not.toHaveBeenCalled();

    tx.product.findMany.mockResolvedValue([]);
    expect((await failure(createOrder(input()))).status).toBe(409);
  });

  it('refuse un produit épuisé et une quantité supérieure au stock, avec le détail', async () => {
    tx.product.findMany.mockResolvedValue([PRODUCTS.a, { ...PRODUCTS.b, stock: 0 }]);
    let error = await failure(createOrder(input({ items: [{ productId: 'prod_a', quantity: 1 }, { productId: 'prod_b', quantity: 1 }] })));
    expect(error.fields?.items).toEqual(['Savon noir : épuisé.']);

    tx.product.findMany.mockResolvedValue([{ ...PRODUCTS.b, stock: 2 }]);
    error = await failure(createOrder(input({ items: [{ productId: 'prod_b', quantity: 3 }] })));
    expect(error.fields?.items).toEqual(['Savon noir : il n’en reste que 2.']);
  });

  it('réserve le stock de façon atomique : la condition « stock ≥ quantité » est dans l’UPDATE (RM-17)', async () => {
    await createOrder(input({ items: [{ productId: 'prod_b', quantity: 2 }] }));
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'prod_b', stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
  });

  it('ne touche pas au stock d’un produit sans suivi de stock', async () => {
    await createOrder(input({ items: [{ productId: 'prod_a', quantity: 3 }] }));
    expect(tx.product.updateMany).not.toHaveBeenCalled();
  });

  it('deux clients sur le dernier article : le perdant reçoit un 409 et la transaction est annulée', async () => {
    tx.product.updateMany.mockResolvedValue({ count: 0 });
    const error = await failure(createOrder(input({ items: [{ productId: 'prod_b', quantity: 1 }] })));
    expect(error.status).toBe(409);
    expect(error.fields?.items?.[0]).toContain('Savon noir');
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('réserve dans un ordre fixe pour éviter les blocages croisés', async () => {
    tx.product.findMany.mockResolvedValue([
      { ...PRODUCTS.b, id: 'prod_z', stock: 9 },
      { ...PRODUCTS.b, id: 'prod_c', stock: 9 },
    ]);
    await createOrder(input({ items: [{ productId: 'prod_z', quantity: 1 }, { productId: 'prod_c', quantity: 1 }] }));
    const order = tx.product.updateMany.mock.calls.map((call) => (call[0] as { where: { id: string } }).where.id);
    expect(order).toEqual(['prod_c', 'prod_z']);
  });
});

describe('createOrder — idempotence (RM-14)', () => {
  it('une clé déjà utilisée renvoie la commande existante, sans nouvelle transaction', async () => {
    prismaMock.order.findUnique.mockResolvedValue(storedOrder());
    const { order, created } = await createOrder(input());
    expect(created).toBe(false);
    expect(order.reference).toBe('CMD-7K3M9QXP');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.order.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { idempotencyKey: KEY } }));
  });

  it('refuse (409) la même clé réutilisée pour une autre demande', async () => {
    prismaMock.order.findUnique.mockResolvedValue(storedOrder());
    expect((await failure(createOrder(input({ phone: '05 00 00 00 00' })))).status).toBe(409);
    expect((await failure(createOrder(input({ items: [{ productId: 'prod_a', quantity: 3 }] })))).status).toBe(409);
    expect((await failure(createOrder(input({ items: [{ productId: 'prod_b', quantity: 2 }] })))).status).toBe(409);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('deux envois simultanés : la base refuse le second, on renvoie la commande du premier', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(storedOrder());
    prismaMock.$transaction.mockRejectedValueOnce(Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['idempotencyKey'] } }));
    const { order, created } = await createOrder(input());
    expect(created).toBe(false);
    expect(order.reference).toBe('CMD-7K3M9QXP');
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('collision de référence : nouvelle tentative avec une autre référence', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['reference'] } }));
    const { created } = await createOrder(input());
    expect(created).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
  });

  it('deux premières commandes simultanées du même téléphone : nouvelle tentative', async () => {
    prismaMock.$transaction.mockRejectedValueOnce(Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['phone'] } }));
    expect((await createOrder(input())).created).toBe(true);
  });

  it('abandonne après 3 tentatives plutôt que de boucler', async () => {
    const collision = Object.assign(new Error('Unique constraint failed'), { code: 'P2002', meta: { target: ['reference'] } });
    prismaMock.$transaction.mockRejectedValue(collision);
    await expect(createOrder(input())).rejects.toBe(collision);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(3);
  });

  it('ne rejoue pas une erreur inattendue', async () => {
    const boom = new Error('connexion perdue');
    prismaMock.$transaction.mockRejectedValue(boom);
    await expect(createOrder(input())).rejects.toBe(boom);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe('createOrder — boutique non configurée', () => {
  it('répond 503 sans rien écrire', async () => {
    tx.storeSettings.findUnique.mockResolvedValue(null);
    const error = await failure(createOrder(input()));
    expect(error.status).toBe(503);
    expect(error.code).toBe('SERVICE_UNAVAILABLE');
    expect(tx.order.create).not.toHaveBeenCalled();
  });
});

describe('getOrderConfirmation', () => {
  it('ignore une référence mal formée sans interroger la base', async () => {
    expect(await getOrderConfirmation('n’importe quoi')).toBeNull();
    expect(await getOrderConfirmation('CMD-7K3M9QXI')).toBeNull();
    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
  });

  it('renvoie null pour une référence inconnue', async () => {
    expect(await getOrderConfirmation('CMD-7K3M9QXP')).toBeNull();
  });

  it('reconstruit le récapitulatif et le lien WhatsApp depuis la base', async () => {
    prismaMock.order.findUnique.mockResolvedValue(storedOrder({ zoneType: 'INTERIOR', shippingCity: 'Bouaké', upfrontAmount: null }));
    const order = await getOrderConfirmation('CMD-7K3M9QXP');
    expect(order).toMatchObject({ reference: 'CMD-7K3M9QXP', zoneType: 'INTERIOR', placeLabel: 'Bouaké, Côte d’Ivoire', subtotal: 20000, total: null });
    expect(order?.lines).toEqual([{ name: 'Sérum éclat', quantity: 2, unitPrice: 10000, lineTotal: 20000 }]);
    const message = decodeURIComponent(order!.whatsappUrl!.split('?text=')[1]!);
    expect(message).toContain('paiement intégral');
  });
});

describe('decoyOrder', () => {
  it('a la forme d’un succès mais ne contient rien d’exploitable', () => {
    const decoy = decoyOrder();
    expect(decoy.reference).toMatch(ORDER_REFERENCE_PATTERN);
    expect(decoy.lines).toEqual([]);
    expect(decoy.whatsappUrl).toBeNull();
  });
});
