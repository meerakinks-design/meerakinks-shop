import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '@/server/auth/password';

// La base, la limitation et les sessions sont simulées : on teste ici la LOGIQUE de connexion
// (ordre des vérifications, messages, réinitialisations), pas Prisma.
const findUnique = vi.fn();
const update = vi.fn();
const consumeRateLimit = vi.fn();
const resetRateLimit = vi.fn();
const purgeExpiredRateLimits = vi.fn();
const createSession = vi.fn();
const purgeExpiredSessions = vi.fn();

vi.mock('@/server/db', () => ({ prisma: { adminUser: { findUnique: (...a: unknown[]) => findUnique(...a), update: (...a: unknown[]) => update(...a) } } }));
vi.mock('@/server/services/rate-limit', () => ({
  consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a),
  resetRateLimit: (...a: unknown[]) => resetRateLimit(...a),
  purgeExpiredRateLimits: (...a: unknown[]) => purgeExpiredRateLimits(...a),
}));
vi.mock('@/server/auth/session', () => ({
  createSession: (...a: unknown[]) => createSession(...a),
  purgeExpiredSessions: (...a: unknown[]) => purgeExpiredSessions(...a),
}));

const { authenticateAdmin } = await import('@/server/auth/login.service');

const input = { email: 'vendeuse@boutique.ci', password: 'le-bon-mot-de-passe-2026', ip: '203.0.113.7', userAgent: 'test' };
const allowed = { allowed: true, count: 1, retryAfterSeconds: 900 };

let goodHash: string;
beforeEach(async () => {
  vi.clearAllMocks();
  goodHash ||= await hashPassword(input.password);
  consumeRateLimit.mockResolvedValue(allowed);
  createSession.mockResolvedValue({ token: 'jeton-de-test', expiresAt: new Date('2030-01-01') });
  findUnique.mockResolvedValue({ id: 'u1', name: 'Awa', role: 'OWNER', isActive: true, passwordHash: goodHash });
});

describe('authenticateAdmin', () => {
  it('connecte avec les bons identifiants, ouvre une session et remet le compteur d’email à zéro', async () => {
    const result = await authenticateAdmin(input);
    expect(result).toMatchObject({ admin: { name: 'Awa', role: 'OWNER' }, token: 'jeton-de-test' });
    expect(createSession).toHaveBeenCalledWith('u1', 'test');
    expect(resetRateLimit).toHaveBeenCalledWith(expect.stringMatching(/^login:email:[0-9a-f]{64}$/));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' } }));
  });

  it('refuse un mauvais mot de passe avec le message générique et sans ouvrir de session', async () => {
    await expect(authenticateAdmin({ ...input, password: 'mauvais-mot-de-passe' })).rejects.toMatchObject({
      status: 401,
      message: 'Email ou mot de passe incorrect.',
    });
    expect(createSession).not.toHaveBeenCalled();
    expect(resetRateLimit).not.toHaveBeenCalled();
  });

  it('répond exactement pareil pour un email inconnu (pas d’énumération de comptes)', async () => {
    findUnique.mockResolvedValue(null);
    await expect(authenticateAdmin(input)).rejects.toMatchObject({ status: 401, message: 'Email ou mot de passe incorrect.' });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('répond pareil pour un compte désactivé, même avec le bon mot de passe', async () => {
    findUnique.mockResolvedValue({ id: 'u1', name: 'Awa', role: 'OWNER', isActive: false, passwordHash: goodHash });
    await expect(authenticateAdmin(input)).rejects.toMatchObject({ status: 401, message: 'Email ou mot de passe incorrect.' });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('bloque (429) quand la limite par IP est dépassée, sans même lire la base', async () => {
    consumeRateLimit.mockResolvedValueOnce({ allowed: false, count: 11, retryAfterSeconds: 600 });
    await expect(authenticateAdmin(input)).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 600 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('bloque (429) quand la limite par email est dépassée, même si l’email n’existe pas', async () => {
    findUnique.mockResolvedValue(null);
    consumeRateLimit.mockResolvedValueOnce(allowed).mockResolvedValueOnce({ allowed: false, count: 6, retryAfterSeconds: 120 });
    await expect(authenticateAdmin(input)).rejects.toMatchObject({ status: 429, message: 'Trop de tentatives. Réessaie dans 2 minutes.' });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('n’écrit jamais l’IP ni l’email en clair dans les clés de limitation', async () => {
    await authenticateAdmin(input);
    const keys = consumeRateLimit.mock.calls.map((call) => String(call[0]));
    for (const key of keys) {
      expect(key).not.toContain('203.0.113.7');
      expect(key).not.toContain('vendeuse@boutique.ci');
    }
  });
});
