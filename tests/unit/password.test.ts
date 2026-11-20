import { describe, expect, it } from 'vitest';
import { hashPassword, spendTimeLikeARealCheck, verifyPassword } from '@/server/auth/password';

describe('password', () => {
  it('hache avec bcrypt (coût 12) et ne stocke jamais le mot de passe en clair', async () => {
    const hash = await hashPassword('un-mot-de-passe-solide-2026');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(hash).not.toContain('un-mot-de-passe-solide-2026');
  });

  it('accepte le bon mot de passe et refuse le mauvais', async () => {
    const hash = await hashPassword('un-mot-de-passe-solide-2026');
    expect(await verifyPassword('un-mot-de-passe-solide-2026', hash)).toBe(true);
    expect(await verifyPassword('un-autre-mot-de-passe', hash)).toBe(false);
  });

  it('produit deux hash différents pour le même mot de passe (sel aléatoire)', async () => {
    const [first, second] = await Promise.all([hashPassword('meme-mot-de-passe-12'), hashPassword('meme-mot-de-passe-12')]);
    expect(first).not.toBe(second);
  });

  it('la vérification factice prend un temps comparable à une vraie vérification', async () => {
    const hash = await hashPassword('mot-de-passe-de-reference');
    const realStart = performance.now();
    await verifyPassword('essai', hash);
    const realMs = performance.now() - realStart;

    const dummyStart = performance.now();
    await spendTimeLikeARealCheck('essai');
    const dummyMs = performance.now() - dummyStart;

    // Même coût bcrypt : on tolère un facteur 4 pour éviter les tests instables sur machine chargée.
    expect(dummyMs).toBeGreaterThan(realMs / 4);
    expect(dummyMs).toBeLessThan(realMs * 4);
  });
});
