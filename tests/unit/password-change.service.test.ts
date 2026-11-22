import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { hashToken } from '@/server/auth/tokens';

// Base, limitation et journal simulés : on teste la LOGIQUE du changement (ordre, limites, révocation, atomicité).
const findUnique = vi.fn();
const userUpdate = vi.fn((args: unknown) => ({ op: 'user.update', args }));
const sessionDeleteMany = vi.fn((args: unknown) => ({ op: 'session.deleteMany', args }));
const sessionCreate = vi.fn((args: unknown) => ({ op: 'session.create', args }));
const transaction = vi.fn(async (operations: unknown[]) => operations);
const consumeRateLimit = vi.fn();
const resetRateLimit = vi.fn();
const auditEntry = vi.fn((entry: unknown) => ({ op: 'audit', entry }));

vi.mock('@/server/db', () => ({
  prisma: {
    adminUser: { findUnique: (...a: unknown[]) => findUnique(...a), update: (a: unknown) => userUpdate(a) },
    adminSession: { deleteMany: (a: unknown) => sessionDeleteMany(a), create: (a: unknown) => sessionCreate(a) },
    $transaction: (ops: unknown[]) => transaction(ops),
  },
}));
vi.mock('@/server/services/rate-limit', () => ({
  consumeRateLimit: (...a: unknown[]) => consumeRateLimit(...a),
  resetRateLimit: (...a: unknown[]) => resetRateLimit(...a),
}));
vi.mock('@/server/services/audit.service', () => ({ auditEntry: (e: unknown) => auditEntry(e) }));

const { changeAdminPassword } = await import('@/server/auth/password-change.service');

const CURRENT = 'le-mot-de-passe-actuel-2026';
const NEXT = 'un-nouveau-mot-de-passe-long-2027';
const input = { currentPassword: CURRENT, newPassword: NEXT, confirmPassword: NEXT, adminId: 'u1', userAgent: 'Chrome Android' };
const allowed = { allowed: true, count: 1, retryAfterSeconds: 900 };

let currentHash: string;
beforeEach(async () => {
  vi.clearAllMocks();
  currentHash ||= await hashPassword(CURRENT);
  consumeRateLimit.mockResolvedValue(allowed);
  findUnique.mockResolvedValue({ id: 'u1', isActive: true, passwordHash: currentHash });
});

describe('changeAdminPassword', () => {
  it('remplace le hash, révoque TOUTES les sessions, en ouvre une neuve et journalise — dans une seule transaction', async () => {
    const result = await changeAdminPassword(input);

    expect(transaction).toHaveBeenCalledTimes(1);
    const operations = transaction.mock.calls[0]![0] as Array<{ op: string; args?: any; entry?: any }>;
    expect(operations.map((o) => o.op)).toEqual(['user.update', 'session.deleteMany', 'session.create', 'audit']);

    // Le nouveau mot de passe est haché (jamais en clair) et se vérifie.
    const storedHash = operations[0]!.args.data.passwordHash as string;
    expect(storedHash).not.toContain(NEXT);
    expect(await verifyPassword(NEXT, storedHash)).toBe(true);
    expect(await verifyPassword(CURRENT, storedHash)).toBe(false);

    // Toutes les sessions du compte disparaissent, y compris l'actuelle (son jeton est remplacé).
    expect(operations[1]!.args).toEqual({ where: { adminUserId: 'u1' } });

    // La session neuve : seul le hash du jeton est stocké, le jeton est rendu à l'appelant pour le cookie.
    expect(operations[2]!.args.data).toMatchObject({ adminUserId: 'u1', userAgent: 'Chrome Android', tokenHash: hashToken(result.token) });
    expect(operations[2]!.args.data.tokenHash).not.toBe(result.token);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 3600 * 1000);

    expect(operations[3]!.entry).toEqual({ action: 'ADMIN_PASSWORD_CHANGED', adminUserId: 'u1' });
    expect(resetRateLimit).toHaveBeenCalledWith('password-change:admin:u1');
  });

  it('refuse un mot de passe actuel incorrect (422 sur le champ), sans rien modifier', async () => {
    await expect(changeAdminPassword({ ...input, currentPassword: 'pas-le-bon-mot-de-passe' })).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      fields: { currentPassword: ['Mot de passe actuel incorrect.'] },
    });
    expect(transaction).not.toHaveBeenCalled();
    expect(resetRateLimit).not.toHaveBeenCalled(); // l'échec compte dans la limite
  });

  it('bloque (429) après trop d’essais, avant même de lire le compte ou de comparer un mot de passe', async () => {
    consumeRateLimit.mockResolvedValue({ allowed: false, count: 6, retryAfterSeconds: 300 });
    await expect(changeAdminPassword(input)).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 300, message: 'Trop de tentatives. Réessaie dans 5 minutes.' });
    expect(findUnique).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('la limite est par compte', async () => {
    await changeAdminPassword(input);
    expect(consumeRateLimit).toHaveBeenCalledWith('password-change:admin:u1', 5, 900);
  });

  it('refuse (401) un compte introuvable ou désactivé en cours de route', async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(changeAdminPassword(input)).rejects.toMatchObject({ status: 401 });
    findUnique.mockResolvedValueOnce({ id: 'u1', isActive: false, passwordHash: currentHash });
    await expect(changeAdminPassword(input)).rejects.toMatchObject({ status: 401 });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('si la transaction échoue, rien n’est confirmé : la limite n’est pas remise à zéro et l’erreur remonte', async () => {
    transaction.mockRejectedValueOnce(new Error('base indisponible'));
    await expect(changeAdminPassword(input)).rejects.toThrow('base indisponible');
    expect(resetRateLimit).not.toHaveBeenCalled();
  });
});
