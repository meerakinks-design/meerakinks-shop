import { afterEach, describe, expect, it, vi } from 'vitest';

const load = async (env: Record<string, string | undefined>) => {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const name of ['DATABASE_URL', 'NEXT_PUBLIC_SITE_URL', 'RESEND_API_KEY', 'EMAIL_FROM', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CRON_SECRET']) {
    vi.stubEnv(name, env[name] ?? '');
  }
  return (await import('@/lib/env')).getServerEnv();
};
afterEach(() => vi.unstubAllEnvs());

describe('environnement', () => {
  it('une variable vide (comme dans .env.example) équivaut à une variable absente', async () => {
    const env = await load({ DATABASE_URL: 'postgresql://u:p@localhost:5432/db' });
    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.EMAIL_FROM).toBeUndefined();
    expect(env.CRON_SECRET).toBeUndefined();
    expect(env.CLOUDINARY_API_SECRET).toBeUndefined();
    expect(env.NEXT_PUBLIC_SITE_URL).toBeUndefined();
  });

  it('lit les valeurs fournies', async () => {
    const env = await load({
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      RESEND_API_KEY: 're_test',
      EMAIL_FROM: 'commandes@awa.example',
      CRON_SECRET: 'un-secret-de-plus-de-16-caracteres',
      NEXT_PUBLIC_SITE_URL: 'https://boutique.example',
    });
    expect(env).toMatchObject({ RESEND_API_KEY: 're_test', EMAIL_FROM: 'commandes@awa.example', NEXT_PUBLIC_SITE_URL: 'https://boutique.example' });
    expect(env.CRON_SECRET).toBe('un-secret-de-plus-de-16-caracteres');
  });

  it('normalise le domaine du site quand le protocole est omis', async () => {
    const env = await load({
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      NEXT_PUBLIC_SITE_URL: 'meerakinks.vercel.app',
    });
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('https://meerakinks.vercel.app');
  });

  it('exige DATABASE_URL', async () => {
    await expect(load({})).rejects.toThrow('DATABASE_URL');
  });

  it('refuse un secret de cron trop court, en ne citant que le NOM de la variable', async () => {
    const error = await load({ DATABASE_URL: 'postgresql://u:p@localhost:5432/db', CRON_SECRET: 'court-et-secret' }).catch((caught: unknown) => caught as Error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('CRON_SECRET');
    expect((error as Error).message).not.toContain('court-et-secret');
  });
});
