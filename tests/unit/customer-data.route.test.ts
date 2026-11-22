import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/server/http';

const { requireOwnerApi, anonymizeCustomerByPhone, runRetentionJob } = vi.hoisted(() => ({
  requireOwnerApi: vi.fn(),
  anonymizeCustomerByPhone: vi.fn(),
  runRetentionJob: vi.fn(),
}));
vi.mock('@/server/auth/guards', () => ({ requireOwnerApi }));
vi.mock('@/server/services/customer-data.service', () => ({ anonymizeCustomerByPhone, runRetentionJob }));
vi.mock('@/server/logger', () => ({ logInfo: vi.fn(), logError: vi.fn() }));

const { POST } = await import('@/app/api/v1/admin/customers/anonymize/route');

const GOOD = { phone: '07 00 00 00 00', confirm: true };
const call = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request('http://localhost/api/v1/admin/customers/anonymize', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'localhost', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    undefined,
  );
const json = async (response: Response) => (await response.json()) as { ok: boolean; data?: any; error?: { code: string; message: string; fields?: Record<string, string[]> } };

beforeEach(() => {
  vi.clearAllMocks();
  requireOwnerApi.mockResolvedValue({ id: 'admin_1', name: 'Awa', email: 'a@b.ci', role: 'OWNER' });
  anonymizeCustomerByPhone.mockResolvedValue({ customerId: 'cus_1', alreadyAnonymized: false, orders: 3, unreadableReceipts: 0 });
});

describe('POST /api/v1/admin/customers/anonymize', () => {
  it('efface le client et répond avec le nombre de commandes conservées (sans identifiant ni donnée personnelle)', async () => {
    const response = await call(GOOD);
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ ok: true, data: { anonymized: true, orders: 3 } });
    expect(anonymizeCustomerByPhone).toHaveBeenCalledWith({ dialCode: '225', phone: '07 00 00 00 00', adminUserId: 'admin_1' });
  });

  it('transmet l’indicatif choisi', async () => {
    await call({ ...GOOD, phoneDialCode: '33', phone: '612345678' });
    expect(anonymizeCustomerByPhone).toHaveBeenCalledWith(expect.objectContaining({ dialCode: '33', phone: '612345678' }));
  });

  it('indique quand la fiche était déjà effacée', async () => {
    anonymizeCustomerByPhone.mockResolvedValue({ customerId: 'cus_1', alreadyAnonymized: true, orders: 3, unreadableReceipts: 0 });
    expect((await json(await call(GOOD))).data).toEqual({ anonymized: false, orders: 3 });
  });

  it('403 pour un compte qui n’est pas propriétaire : rien n’est lu ni effacé', async () => {
    requireOwnerApi.mockRejectedValue(new HttpError(403, 'FORBIDDEN', 'Action réservée au compte propriétaire.'));
    const response = await call(GOOD);
    expect(response.status).toBe(403);
    expect(anonymizeCustomerByPhone).not.toHaveBeenCalled();
  });

  it('401 sans session', async () => {
    requireOwnerApi.mockRejectedValue(new HttpError(401, 'UNAUTHENTICATED', 'Connexion requise.'));
    expect((await call(GOOD)).status).toBe(401);
    expect(anonymizeCustomerByPhone).not.toHaveBeenCalled();
  });

  it('403 pour une requête venue d’un autre site (anti-CSRF), avant toute vérification de session', async () => {
    const response = await call(GOOD, { origin: 'https://site-pirate.example' });
    expect(response.status).toBe(403);
    expect((await json(response)).error?.code).toBe('INVALID_ORIGIN');
    expect(requireOwnerApi).not.toHaveBeenCalled();
    expect(anonymizeCustomerByPhone).not.toHaveBeenCalled();
  });

  it('422 sans confirmation explicite : un appel direct ne peut rien effacer par erreur', async () => {
    for (const body of [{ phone: GOOD.phone }, { ...GOOD, confirm: false }, { ...GOOD, confirm: 'true' }, { ...GOOD, confirm: 1 }]) {
      const response = await call(body);
      expect(response.status).toBe(422);
      expect((await json(response)).error?.fields?.confirm?.[0]).toContain('confirmer');
    }
    expect(anonymizeCustomerByPhone).not.toHaveBeenCalled();
  });

  it('422 sans numéro', async () => {
    for (const body of [{ confirm: true }, { confirm: true, phone: '   ' }]) {
      const response = await call(body);
      expect(response.status).toBe(422);
      expect((await json(response)).error?.fields?.phone).toBeDefined();
    }
    expect(anonymizeCustomerByPhone).not.toHaveBeenCalled();
  });

  it('relaie le refus du service (commande en cours) en 409 avec un message clair', async () => {
    anonymizeCustomerByPhone.mockRejectedValue(new HttpError(409, 'CONFLICT', 'Ce client a 1 commande en cours (ni livrée ni annulée). Termine ou annule cette commande d’abord.'));
    const response = await call(GOOD);
    expect(response.status).toBe(409);
    expect((await json(response)).error?.message).toContain('commande en cours');
  });

  it('500 sans détail technique quand la base plante', async () => {
    anonymizeCustomerByPhone.mockRejectedValue(new Error('password authentication failed for user "neondb_owner"'));
    const response = await call(GOOD);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await json(response))).not.toContain('neondb_owner');
  });
});

describe('GET /api/cron/retention', () => {
  const SECRET = 'un-secret-de-cron-bien-long-1234';
  async function loadGet(secret: string | undefined) {
    vi.resetModules();
    vi.stubEnv('DATABASE_URL', 'postgresql://u:p@localhost:5432/db');
    vi.stubEnv('CRON_SECRET', secret ?? '');
    return (await import('@/app/api/cron/retention/route')).GET;
  }
  const request = (authorization?: string) =>
    new Request('http://localhost/api/cron/retention', { method: 'GET', headers: authorization === undefined ? {} : { authorization } });
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => runRetentionJob.mockResolvedValue({ rateLimitsPurged: true, customers: { enabled: false } }));

  it('401 sans le secret et 503 tant que CRON_SECRET n’est pas configuré — rien n’est traité', async () => {
    const get = await loadGet(SECRET);
    for (const header of [undefined, 'Bearer mauvais-secret', SECRET]) expect((await get(request(header), undefined)).status).toBe(401);
    const closed = await loadGet(undefined);
    expect((await closed(request('Bearer '), undefined)).status).toBe(503);
    expect(runRetentionJob).not.toHaveBeenCalled();
  });

  it('la purge des clients est FERMÉE par défaut : seule la variable RETENTION_PURGE_ENABLED=1 l’ouvre', async () => {
    const get = await loadGet(SECRET);
    for (const value of [undefined, '', '0', 'true', 'yes']) {
      vi.stubEnv('RETENTION_PURGE_ENABLED', value ?? '');
      await get(request(`Bearer ${SECRET}`), undefined);
      expect(runRetentionJob).toHaveBeenLastCalledWith({ purgeCustomers: false });
    }
    vi.stubEnv('RETENTION_PURGE_ENABLED', '1');
    const response = await get(request(`Bearer ${SECRET}`), undefined);
    expect(response.status).toBe(200);
    expect(runRetentionJob).toHaveBeenLastCalledWith({ purgeCustomers: true });
  });
});
