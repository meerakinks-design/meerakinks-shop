import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendContactMessage, consumeRateLimit } = vi.hoisted(() => ({ sendContactMessage: vi.fn(), consumeRateLimit: vi.fn() }));
vi.mock('@/server/services/contact.service', () => ({ sendContactMessage }));
vi.mock('@/server/services/rate-limit', () => ({ consumeRateLimit }));
vi.mock('@/server/logger', () => ({ logInfo: vi.fn(), logError: vi.fn() }));

const KEY = '0b9d6f1e-6a43-4d6a-9d0e-3f6a5c2b7e11';
const IP = '203.0.113.9';
const validBody = (overrides: Record<string, unknown> = {}) => ({
  topic: 'PRODUCT',
  name: 'Awa Koné',
  replyChannel: 'WHATSAPP',
  dialCode: '225',
  phone: '07 00 00 00 00',
  message: 'Bonjour, ce soin convient-il aux cheveux très secs ?',
  consent: true,
  idempotencyKey: KEY,
  companyFax: '',
  ...overrides,
});

async function loadPost(enabled = true) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_CONTACT_FORM_ENABLED', enabled ? '1' : '0');
  return (await import('@/app/api/v1/contact/route')).POST;
}
const request = (body: unknown) =>
  new Request('http://localhost/api/v1/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': IP },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const call = async (post: Awaited<ReturnType<typeof loadPost>>, req: Request) => {
  const response = await post(req, undefined);
  return { response, json: (await response.json()) as { ok: boolean; data?: any; error?: any } };
};

beforeEach(() => {
  vi.clearAllMocks();
  consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  sendContactMessage.mockResolvedValue(undefined);
});

describe('POST /api/v1/contact', () => {
  it('201 : valide le message puis le transmet à la vendeuse', async () => {
    const post = await loadPost();
    const { response, json } = await call(post, request(validBody()));
    expect(response.status).toBe(201);
    expect(json).toMatchObject({ ok: true, data: { sent: true } });
    const input = sendContactMessage.mock.calls[0]![0];
    expect(input.phoneE164).toBe('+2250700000000');
    expect(input.topic).toBe('PRODUCT');
    expect(input).not.toHaveProperty('consent');
  });

  it('422 : un champ à corriger est signalé par son nom, rien n’est envoyé', async () => {
    const post = await loadPost();
    const { response, json } = await call(post, request(validBody({ topic: 'ORDER' })));
    expect(response.status).toBe(422);
    expect(json.error.fields.orderReference).toBeDefined();
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('champ piège rempli : faux succès, rien n’est envoyé', async () => {
    const post = await loadPost();
    const { response, json } = await call(post, request(validBody({ companyFax: 'http://spam.example' })));
    expect(response.status).toBe(201);
    expect(json.data.sent).toBe(true);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('429 : trop de messages depuis la même adresse', async () => {
    consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 120 });
    const post = await loadPost();
    const { response, json } = await call(post, request(validBody()));
    expect(response.status).toBe(429);
    expect(json.error.code).toBe('RATE_LIMITED');
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('429 : trop de messages pour le même contact (deuxième limite)', async () => {
    consumeRateLimit.mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 }).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 3000 });
    const post = await loadPost();
    const { response } = await call(post, request(validBody()));
    expect(response.status).toBe(429);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('503 : formulaire désactivé par l’interrupteur', async () => {
    const post = await loadPost(false);
    const { response, json } = await call(post, request(validBody()));
    expect(response.status).toBe(503);
    expect(json.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(sendContactMessage).not.toHaveBeenCalled();
  });

  it('une corps qui n’est pas du JSON est refusé proprement', async () => {
    const post = await loadPost();
    const { response } = await call(post, request('pas du json'));
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(sendContactMessage).not.toHaveBeenCalled();
  });
});
