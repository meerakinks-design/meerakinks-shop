import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/server/http';

const { requireAdminApi, changeAdminPassword, setSessionCookie } = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  changeAdminPassword: vi.fn(),
  setSessionCookie: vi.fn(),
}));
vi.mock('@/server/auth/guards', () => ({ requireAdminApi }));
vi.mock('@/server/auth/password-change.service', () => ({ changeAdminPassword }));
vi.mock('@/server/auth/session', () => ({ setSessionCookie }));
vi.mock('@/server/logger', () => ({ logInfo: vi.fn(), logError: vi.fn() }));

const { POST } = await import('@/app/api/v1/admin/auth/password/route');

const GOOD = { currentPassword: 'le-mot-de-passe-actuel', newPassword: 'un-nouveau-mot-de-passe-long', confirmPassword: 'un-nouveau-mot-de-passe-long' };
const call = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request('http://localhost/api/v1/admin/auth/password', {
      method: 'POST',
      headers: { 'content-type': 'application/json', host: 'localhost', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    undefined,
  );
const json = async (response: Response) => (await response.json()) as { ok: boolean; data?: unknown; error?: { code: string; fields?: Record<string, string[]> } };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApi.mockResolvedValue({ id: 'u1', name: 'Awa', email: 'a@b.ci', role: 'OWNER' });
  changeAdminPassword.mockResolvedValue({ token: 'jeton-neuf', expiresAt: new Date('2030-01-01') });
});

describe('POST /api/v1/admin/auth/password', () => {
  it('change le mot de passe du compte connecté et pose le cookie de la session neuve', async () => {
    const response = await call(GOOD, { 'user-agent': 'Chrome' });
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({ ok: true, data: {} });
    expect(changeAdminPassword).toHaveBeenCalledWith(expect.objectContaining({ adminId: 'u1', currentPassword: GOOD.currentPassword, newPassword: GOOD.newPassword, userAgent: 'Chrome' }));
    expect(setSessionCookie).toHaveBeenCalledWith('jeton-neuf', new Date('2030-01-01'));
  });

  it('401 sans session : rien n’est lu ni changé', async () => {
    requireAdminApi.mockRejectedValue(new HttpError(401, 'UNAUTHENTICATED', 'Connexion requise.'));
    const response = await call(GOOD);
    expect(response.status).toBe(401);
    expect(changeAdminPassword).not.toHaveBeenCalled();
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it('403 pour une requête venue d’un autre site (anti-CSRF), avant toute vérification de session', async () => {
    const response = await call(GOOD, { origin: 'https://site-pirate.example' });
    expect(response.status).toBe(403);
    expect((await json(response)).error?.code).toBe('INVALID_ORIGIN');
    expect(requireAdminApi).not.toHaveBeenCalled();
    expect(changeAdminPassword).not.toHaveBeenCalled();
  });

  it('422 avec le détail par champ quand la confirmation ne correspond pas ou que le mot de passe est trop court', async () => {
    let response = await call({ ...GOOD, confirmPassword: 'autre-chose-completement' });
    expect(response.status).toBe(422);
    expect((await json(response)).error?.fields?.confirmPassword?.[0]).toBe('Les deux mots de passe ne sont pas identiques.');

    response = await call({ ...GOOD, newPassword: 'court', confirmPassword: 'court' });
    expect(response.status).toBe(422);
    expect((await json(response)).error?.fields?.newPassword?.[0]).toContain('au moins 12 caractères');
    expect(changeAdminPassword).not.toHaveBeenCalled();
  });

  it('422 si le nouveau mot de passe est identique à l’actuel', async () => {
    const same = 'le-meme-mot-de-passe-12345';
    const response = await call({ currentPassword: same, newPassword: same, confirmPassword: same });
    expect(response.status).toBe(422);
    expect((await json(response)).error?.fields?.newPassword?.[0]).toBe('Choisis un mot de passe différent de l’actuel.');
  });

  it('415 sans JSON et 422 pour un JSON illisible', async () => {
    const noJson = await POST(new Request('http://localhost/api/v1/admin/auth/password', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' }), undefined);
    expect(noJson.status).toBe(415);
    expect((await call('{pas du json')).status).toBe(422);
  });

  it('transmet l’erreur de limite (429) du service', async () => {
    changeAdminPassword.mockRejectedValue(new HttpError(429, 'RATE_LIMITED', 'Trop de tentatives. Réessaie dans 5 minutes.', { retryable: true, retryAfterSeconds: 300 }));
    const response = await call(GOOD);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('300');
    expect(setSessionCookie).not.toHaveBeenCalled();
  });
});
