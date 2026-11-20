import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderCreated } from '@/lib/shop/order-types';

const { createOrder, decoyOrder, consumeRateLimit, sendOrderEmailsNow } = vi.hoisted(() => ({ createOrder: vi.fn(), decoyOrder: vi.fn(), consumeRateLimit: vi.fn(), sendOrderEmailsNow: vi.fn() }));
vi.mock('@/server/services/orders.service', () => ({ createOrder, decoyOrder }));
vi.mock('@/server/services/rate-limit', () => ({ consumeRateLimit }));
vi.mock('@/server/services/notifications.service', () => ({ sendOrderEmailsNow }));
vi.mock('@/server/logger', () => ({ logInfo: vi.fn(), logError: vi.fn() }));

const KEY = '0b9d6f1e-6a43-4d6a-9d0e-3f6a5c2b7e11';
const IP = '203.0.113.7';
const validBody = (overrides: Record<string, unknown> = {}) => ({
  idempotencyKey: KEY,
  items: [{ productId: 'prod_a', quantity: 1 }],
  firstName: 'Awa',
  lastName: 'Koné',
  phoneDialCode: '225',
  phone: '07 00 00 00 00',
  zoneType: 'ABIDJAN',
  placeName: 'Cocody',
  address: 'Riviera Palmeraie, rue des jardins',
  companyFax: '',
  ...overrides,
});
const ORDER: OrderCreated = {
  reference: 'CMD-7K3M9QXP',
  zoneType: 'ABIDJAN',
  placeLabel: 'Cocody (Abidjan)',
  lines: [{ name: 'Sérum éclat', quantity: 1, unitPrice: 10000, lineTotal: 10000 }],
  subtotal: 10000,
  deliveryFee: null,
  total: null,
  upfrontAmount: 2000,
  whatsappUrl: 'https://wa.me/2250102030405?text=Bonjour',
};

async function loadPost(enabled = true) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_CHECKOUT_ENABLED', enabled ? '1' : '0');
  return (await import('@/app/api/v1/orders/route')).POST;
}
const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/v1/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': IP, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const call = async (post: Awaited<ReturnType<typeof loadPost>>, req: Request) => {
  const response = await post(req, undefined);
  return { response, json: (await response.json()) as { ok: boolean; data?: any; error?: any } };
};

beforeEach(() => {
  vi.clearAllMocks();
  consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  createOrder.mockResolvedValue({ order: ORDER, created: true });
  decoyOrder.mockReturnValue({ ...ORDER, reference: 'CMD-00000000', lines: [], whatsappUrl: null });
  sendOrderEmailsNow.mockResolvedValue({ configured: true, claimed: 2, sent: 2, retrying: 0, failed: 0, skipped: 0 });
});

describe('POST /api/v1/orders', () => {
  it('201 : enregistre la commande et renvoie la référence et le lien WhatsApp', async () => {
    const post = await loadPost();
    const { response, json } = await call(post, request(validBody()));
    expect(response.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(json.data.reference).toBe('CMD-7K3M9QXP');
    expect(json.data.whatsappUrl).toContain('wa.me');
    expect(response.headers.get('X-Request-Id')).toBeTruthy();

    const input = createOrder.mock.calls[0]![0];
    expect(input.phoneE164).toBe('+2250700000000');
    expect(input.idempotencyKey).toBe(KEY);
  });

  it('tente l’envoi des emails après l’enregistrement, pour CETTE commande (cahier §6.3, point 4)', async () => {
    const post = await loadPost();
    await call(post, request(validBody()));
    expect(sendOrderEmailsNow).toHaveBeenCalledTimes(1);
    expect(sendOrderEmailsNow).toHaveBeenCalledWith('CMD-7K3M9QXP');
    expect(createOrder.mock.invocationCallOrder[0]).toBeLessThan(sendOrderEmailsNow.mock.invocationCallOrder[0] as number);
  });

  it('la commande réussit même si l’envoi des emails est indisponible (RM-34)', async () => {
    sendOrderEmailsNow.mockResolvedValue(null);
    const post = await loadPost();
    const { response, json } = await call(post, request(validBody()));
    expect(response.status).toBe(201);
    expect(json.data.reference).toBe('CMD-7K3M9QXP');
  });

  it('ne renvoie pas les emails pour un renvoi de la même clé, ni pour un robot, ni pour une commande refusée', async () => {
    const post = await loadPost();
    createOrder.mockResolvedValue({ order: ORDER, created: false });
    await call(post, request(validBody()));
    await call(post, request(validBody({ companyFax: 'robot' })));
    createOrder.mockRejectedValue(new Error('refusée'));
    await call(post, request(validBody()));
    expect(sendOrderEmailsNow).not.toHaveBeenCalled();
  });

  it('200 : un renvoi avec la même clé retrouve la commande existante', async () => {
    createOrder.mockResolvedValue({ order: ORDER, created: false });
    const post = await loadPost();
    const { response, json } = await call(post, request(validBody()));
    expect(response.status).toBe(200);
    expect(json.data.reference).toBe('CMD-7K3M9QXP');
  });

  it('503 tant que la commande en ligne n’est pas ouverte, sans rien enregistrer', async () => {
    const post = await loadPost(false);
    const { response, json } = await call(post, request(validBody()));
    expect(response.status).toBe(503);
    expect(json.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('403 pour une requête venant d’un autre site', async () => {
    const post = await loadPost();
    const { response, json } = await call(post, request(validBody(), { origin: 'https://autre-site.example', host: 'localhost' }));
    expect(response.status).toBe(403);
    expect(json.error.code).toBe('INVALID_ORIGIN');
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('415 si le contenu n’est pas du JSON, 422 si le JSON est cassé', async () => {
    const post = await loadPost();
    expect((await call(post, request('x', { 'content-type': 'text/plain' }))).response.status).toBe(415);
    expect((await call(post, request('{pas du json'))).response.status).toBe(422);
  });

  it('422 avec le détail par champ quand la validation échoue', async () => {
    const post = await loadPost();
    const { response, json } = await call(post, request(validBody({ firstName: '', phone: '07 00', items: [] })));
    expect(response.status).toBe(422);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.fields.firstName[0]).toBe('Indiquez votre prénom.');
    expect(json.error.fields.phone[0]).toContain('10 chiffres');
    expect(json.error.fields.items[0]).toBe('Votre panier est vide.');
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('champ piège rempli : faux succès, rien n’est enregistré (§6.3)', async () => {
    const post = await loadPost();
    const { response, json } = await call(post, request(validBody({ companyFax: '0102030405', firstName: '' })));
    expect(response.status).toBe(201);
    expect(json.data.reference).toBe('CMD-00000000');
    expect(createOrder).not.toHaveBeenCalled();
    expect(consumeRateLimit).toHaveBeenCalledTimes(1); // seule la limite par IP a été consommée
  });

  it('429 quand la limite par IP est atteinte, avec Retry-After', async () => {
    consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 120 });
    const post = await loadPost();
    const { response, json } = await call(post, request(validBody()));
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('120');
    expect(json.error.code).toBe('RATE_LIMITED');
    expect(json.error.retryable).toBe(true);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('429 quand la limite par téléphone est atteinte', async () => {
    consumeRateLimit.mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 }).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 3000 });
    const post = await loadPost();
    const { response } = await call(post, request(validBody()));
    expect(response.status).toBe(429);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('pseudonymise l’IP et le téléphone dans les clés de limitation (jamais en clair en base)', async () => {
    const post = await loadPost();
    await call(post, request(validBody()));
    const keys = consumeRateLimit.mock.calls.map((args) => String(args[0]));
    expect(keys[0]).toMatch(/^order:ip:[0-9a-f]{64}$/);
    expect(keys[1]).toMatch(/^order:phone:[0-9a-f]{64}$/);
    expect(keys.join()).not.toContain(IP);
    expect(keys.join()).not.toContain('2250700000000');
  });

  it('propage les conflits du service (stock, panier changé) au format standard', async () => {
    const { HttpError } = await import('@/server/http');
    const post = await loadPost();
    const { HttpError: FreshHttpError } = await import('@/server/http');
    createOrder.mockRejectedValue(new FreshHttpError(409, 'CONFLICT', 'Votre panier a changé.', { fields: { items: ['Savon noir : épuisé.'] } }));
    const { response, json } = await call(post, request(validBody()));
    expect(HttpError).toBeDefined();
    expect(response.status).toBe(409);
    expect(json.error.code).toBe('CONFLICT');
    expect(json.error.fields.items).toEqual(['Savon noir : épuisé.']);
  });

  it('500 sans fuite de détail technique quand le service plante', async () => {
    createOrder.mockRejectedValue(new Error('password authentication failed for user "neondb_owner"'));
    const post = await loadPost();
    const { response, json } = await call(post, request(validBody()));
    expect(response.status).toBe(500);
    expect(JSON.stringify(json)).not.toContain('neondb_owner');
    expect(json.error.message).toContain('Référence');
  });
});
