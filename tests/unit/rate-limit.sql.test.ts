import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildConsumeRateLimitQuery } from '@/server/services/rate-limit.sql';

// On exécute la VRAIE requête SQL de production sur un Postgres en mémoire (PGlite).
// La table reproduit exactement ce que `prisma migrate` génère pour le modèle RateLimitBucket.
let db: PGlite;

async function consume(key: string, windowSeconds = 900) {
  const query = buildConsumeRateLimitQuery(key, windowSeconds);
  const result = await db.query<{ count: number; secondsLeft: number }>(query.text, query.values);
  return result.rows[0]!;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE "RateLimitBucket" (
      "key" TEXT NOT NULL,
      "count" INTEGER NOT NULL DEFAULT 0,
      "resetAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
    );`);
});

afterAll(async () => {
  await db.close();
});

describe('requête de limitation (SQL réel)', () => {
  it('compte 1 au premier passage puis incrémente', async () => {
    expect((await consume('k:a')).count).toBe(1);
    expect((await consume('k:a')).count).toBe(2);
    expect((await consume('k:a')).count).toBe(3);
  });

  it('garde les clés indépendantes', async () => {
    await consume('k:b');
    expect((await consume('k:c')).count).toBe(1);
  });

  it('renvoie un délai d’attente cohérent avec la fenêtre', async () => {
    const { secondsLeft } = await consume('k:d', 900);
    expect(secondsLeft).toBeGreaterThan(890);
    expect(secondsLeft).toBeLessThanOrEqual(900);
  });

  it('repart à 1 quand la fenêtre est expirée', async () => {
    await consume('k:e');
    await consume('k:e');
    await db.exec(`UPDATE "RateLimitBucket" SET "resetAt" = (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 second' WHERE "key" = 'k:e';`);
    expect((await consume('k:e')).count).toBe(1);
  });

  it('ne perd aucun passage sous requêtes simultanées', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => consume('k:parallel')));
    expect(Math.max(...results.map((row) => row.count))).toBe(20);
  });
});
