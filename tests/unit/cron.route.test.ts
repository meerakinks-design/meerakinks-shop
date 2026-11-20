import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { processOutbox } = vi.hoisted(() => ({ processOutbox: vi.fn() }));
vi.mock('@/server/services/notifications.service', () => ({ processOutbox }));
vi.mock('@/server/logger', () => ({ logInfo: vi.fn(), logError: vi.fn() }));

const SECRET = 'un-secret-de-cron-bien-long-1234';
const SUMMARY = { configured: true, claimed: 3, sent: 2, retrying: 1, failed: 0, skipped: 0 };

async function loadGet(secret: string | undefined) {
  vi.resetModules();
  vi.stubEnv('DATABASE_URL', 'postgresql://u:p@localhost:5432/db');
  vi.stubEnv('CRON_SECRET', secret ?? '');
  return (await import('@/app/api/cron/send-emails/route')).GET;
}
const request = (authorization?: string) =>
  new Request('http://localhost/api/cron/send-emails', { method: 'GET', headers: authorization === undefined ? {} : { authorization } });
const call = async (get: Awaited<ReturnType<typeof loadGet>>, req: Request) => {
  const response = await get(req, undefined);
  return { response, json: (await response.json()) as { ok: boolean; data?: any; error?: any } };
};

beforeEach(() => {
  vi.clearAllMocks();
  processOutbox.mockResolvedValue(SUMMARY);
});
afterEach(() => vi.unstubAllEnvs());

describe('GET /api/cron/send-emails', () => {
  it('lance le traitement quand la requête porte le secret (comme Vercel Cron) et renvoie le bilan', async () => {
    const get = await loadGet(SECRET);
    const { response, json } = await call(get, request(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(json).toMatchObject({ ok: true, data: SUMMARY });
    expect(processOutbox).toHaveBeenCalledTimes(1);
  });

  it('401 sans en-tête, avec un mauvais secret, ou sans le préfixe « Bearer » — rien n’est traité', async () => {
    const get = await loadGet(SECRET);
    for (const header of [undefined, '', 'Bearer', 'Bearer mauvais-secret', `Bearer ${SECRET}x`, `bearer ${SECRET}`, SECRET, `Basic ${SECRET}`]) {
      const { response, json } = await call(get, request(header));
      expect(response.status).toBe(401);
      expect(json.error.code).toBe('UNAUTHENTICATED');
    }
    expect(processOutbox).not.toHaveBeenCalled();
  });

  it('FERMÉE (503) tant que CRON_SECRET n’est pas configuré : jamais ouverte par défaut', async () => {
    const get = await loadGet(undefined);
    const { response, json } = await call(get, request('Bearer '));
    expect(response.status).toBe(503);
    expect(json.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(processOutbox).not.toHaveBeenCalled();
  });

  it('ne dévoile pas le secret dans la réponse d’erreur', async () => {
    const get = await loadGet(SECRET);
    const { json } = await call(get, request('Bearer essai-de-devinette'));
    expect(JSON.stringify(json)).not.toContain(SECRET);
  });

  it('500 sans détail technique quand le traitement plante', async () => {
    processOutbox.mockRejectedValue(new Error('password authentication failed for user "neondb_owner"'));
    const get = await loadGet(SECRET);
    const { response, json } = await call(get, request(`Bearer ${SECRET}`));
    expect(response.status).toBe(500);
    expect(JSON.stringify(json)).not.toContain('neondb_owner');
  });

  it('est planifiée dans vercel.json, une fois par jour (compatible avec tous les plans)', async () => {
    const { readFileSync } = await import('node:fs');
    const config = JSON.parse(readFileSync('vercel.json', 'utf-8')) as { crons: { path: string; schedule: string }[] };
    expect(config.crons).toEqual([{ path: '/api/cron/send-emails', schedule: '0 6 * * *' }]);
  });
});
