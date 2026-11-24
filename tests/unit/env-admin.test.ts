import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, verifyPassword } from '@/server/auth/password';

vi.mock('@/server/logger', () => ({ logInfo: vi.fn(), logError: vi.fn() }));

const { ensureEnvAdmin, isEnvManagedEmail, readEnvAdminConfig, resetEnvAdminCache, syncEnvAdmin } = await import('@/server/auth/env-admin');

const ENV = { ADMIN_EMAIL: 'Vendeuse@Boutique.ci ', ADMIN_PASSWORD: 'un-mot-de-passe-solide-2026', ADMIN_NAME: 'Awa' };

describe('readEnvAdminConfig', () => {
  it('sans variables : le compte n’est pas piloté par l’environnement', () => {
    expect(readEnvAdminConfig({})).toEqual({ status: 'absent' });
    expect(readEnvAdminConfig({ ADMIN_EMAIL: '', ADMIN_PASSWORD: '' })).toEqual({ status: 'absent' });
  });
  it('normalise l’email, garde le mot de passe tel quel et donne un nom par défaut', () => {
    expect(readEnvAdminConfig(ENV)).toEqual({ status: 'ok', email: 'vendeuse@boutique.ci', password: ENV.ADMIN_PASSWORD, name: 'Awa' });
    expect(readEnvAdminConfig({ ...ENV, ADMIN_NAME: '' })).toMatchObject({ name: 'Propriétaire' });
  });
  it('signale ce qui manque ou est refusé, en citant les noms des variables et jamais leurs valeurs', () => {
    const missing = readEnvAdminConfig({ ADMIN_EMAIL: 'vendeuse@boutique.ci' });
    expect(missing).toMatchObject({ status: 'invalid' });
    expect(JSON.stringify(missing)).toMatch(/ADMIN_PASSWORD est manquante/);

    const weak = readEnvAdminConfig({ ADMIN_EMAIL: 'vendeuse@boutique.ci', ADMIN_PASSWORD: 'court' });
    expect(weak).toMatchObject({ status: 'invalid' });
    expect(JSON.stringify(weak)).not.toContain('court"');

    expect(readEnvAdminConfig({ ADMIN_EMAIL: 'pas-un-email', ADMIN_PASSWORD: ENV.ADMIN_PASSWORD })).toMatchObject({ status: 'invalid' });
  });
});

describe('isEnvManagedEmail', () => {
  it('vrai seulement pour l’adresse de ADMIN_EMAIL (casse ignorée)', () => {
    expect(isEnvManagedEmail('vendeuse@boutique.ci', ENV)).toBe(true);
    expect(isEnvManagedEmail('VENDEUSE@boutique.ci', ENV)).toBe(true);
    expect(isEnvManagedEmail('autre@boutique.ci', ENV)).toBe(false);
    expect(isEnvManagedEmail(undefined, ENV)).toBe(false);
    expect(isEnvManagedEmail('vendeuse@boutique.ci', {})).toBe(false);
  });
});

function fakeDb(existing: null | { id: string; name: string; role: 'OWNER' | 'STAFF'; isActive: boolean; passwordHash: string }) {
  return {
    adminUser: { findUnique: vi.fn().mockResolvedValue(existing), create: vi.fn().mockResolvedValue({ id: 'new' }), update: vi.fn().mockResolvedValue({ id: 'u1' }) },
    adminSession: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
}
const credentials = { email: 'vendeuse@boutique.ci', password: ENV.ADMIN_PASSWORD, name: 'Awa' };

describe('syncEnvAdmin', () => {
  it('crée le compte propriétaire avec un HASH, jamais le mot de passe', async () => {
    const db = fakeDb(null);
    expect(await syncEnvAdmin(db as never, credentials)).toBe('created');
    const data = db.adminUser.create.mock.calls[0]?.[0].data as { passwordHash: string; role: string };
    expect(data.role).toBe('OWNER');
    expect(data.passwordHash).not.toContain(credentials.password);
    expect(await verifyPassword(credentials.password, data.passwordHash)).toBe(true);
  });

  it('ne touche à rien quand tout est déjà aligné', async () => {
    const db = fakeDb({ id: 'u1', name: 'Awa', role: 'OWNER', isActive: true, passwordHash: await hashPassword(credentials.password) });
    expect(await syncEnvAdmin(db as never, credentials)).toBe('unchanged');
    expect(db.adminUser.update).not.toHaveBeenCalled();
    expect(db.adminSession.deleteMany).not.toHaveBeenCalled();
  });

  it('mot de passe changé dans l’environnement : nouveau hash et sessions fermées', async () => {
    const db = fakeDb({ id: 'u1', name: 'Awa', role: 'OWNER', isActive: true, passwordHash: await hashPassword('ancien-mot-de-passe-2025') });
    expect(await syncEnvAdmin(db as never, credentials)).toBe('updated');
    const changes = db.adminUser.update.mock.calls[0]?.[0].data as { passwordHash: string };
    expect(await verifyPassword(credentials.password, changes.passwordHash)).toBe(true);
    expect(db.adminSession.deleteMany).toHaveBeenCalledWith({ where: { adminUserId: 'u1' } });
  });

  it('un compte désactivé ou rétrogradé redevient propriétaire actif ; un simple changement de nom ne ferme pas les sessions', async () => {
    const hash = await hashPassword(credentials.password);
    const reactivated = fakeDb({ id: 'u1', name: 'Awa', role: 'STAFF', isActive: false, passwordHash: hash });
    expect(await syncEnvAdmin(reactivated as never, credentials)).toBe('updated');
    expect(reactivated.adminUser.update.mock.calls[0]?.[0].data).toEqual({ role: 'OWNER', isActive: true });
    expect(reactivated.adminSession.deleteMany).toHaveBeenCalled();

    const renamed = fakeDb({ id: 'u1', name: 'Ancien nom', role: 'OWNER', isActive: true, passwordHash: hash });
    expect(await syncEnvAdmin(renamed as never, credentials)).toBe('updated');
    expect(renamed.adminSession.deleteMany).not.toHaveBeenCalled();
  });

  it('deux serveurs qui démarrent ensemble : la violation d’unicité est absorbée et on reprend sur le compte créé par l’autre', async () => {
    const hash = await hashPassword(credentials.password);
    const db = fakeDb(null);
    db.adminUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'u1', name: 'Awa', role: 'OWNER', isActive: true, passwordHash: hash });
    db.adminUser.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(await syncEnvAdmin(db as never, credentials)).toBe('unchanged');
  });
});

describe('ensureEnvAdmin', () => {
  beforeEach(() => resetEnvAdminCache());

  it('sans variables : aucun accès à la base', async () => {
    const db = fakeDb(null);
    await ensureEnvAdmin(db as never, {});
    expect(db.adminUser.findUnique).not.toHaveBeenCalled();
  });

  it('aligne la base une seule fois par valeur d’environnement', async () => {
    const db = fakeDb(null);
    await ensureEnvAdmin(db as never, ENV);
    await ensureEnvAdmin(db as never, ENV);
    expect(db.adminUser.create).toHaveBeenCalledTimes(1);
  });

  it('une base injoignable ne casse pas la connexion, et on réessaie ensuite', async () => {
    const db = fakeDb(null);
    db.adminUser.findUnique.mockRejectedValueOnce(new Error('base injoignable'));
    await expect(ensureEnvAdmin(db as never, ENV)).resolves.toBeUndefined();
    await ensureEnvAdmin(db as never, ENV);
    expect(db.adminUser.create).toHaveBeenCalledTimes(1);
  });

  it('une configuration invalide ne crée rien', async () => {
    const db = fakeDb(null);
    await ensureEnvAdmin(db as never, { ADMIN_EMAIL: 'vendeuse@boutique.ci', ADMIN_PASSWORD: 'court' });
    expect(db.adminUser.findUnique).not.toHaveBeenCalled();
  });
});
