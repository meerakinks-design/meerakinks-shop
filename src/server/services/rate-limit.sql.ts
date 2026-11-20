import { Prisma } from '@prisma/client';

// Séparé de rate-limit.ts : ce fichier n'importe pas le client de base de données,
// ce qui permet de tester la requête SQL réelle sans connexion.

/**
 * Requête atomique de limitation à fenêtre fixe. Une seule instruction SQL : deux requêtes
 * simultanées ne peuvent pas lire la même valeur et « oublier » un passage.
 * Les heures sont calculées en UTC par la base, comme les colonnes DateTime de Prisma.
 */
export function buildConsumeRateLimitQuery(key: string, windowSeconds: number): Prisma.Sql {
  return Prisma.sql`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, (NOW() AT TIME ZONE 'UTC') + (${windowSeconds}::int * INTERVAL '1 second'))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= (NOW() AT TIME ZONE 'UTC') THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= (NOW() AT TIME ZONE 'UTC')
          THEN (NOW() AT TIME ZONE 'UTC') + (${windowSeconds}::int * INTERVAL '1 second')
        ELSE "RateLimitBucket"."resetAt"
      END
    RETURNING "count", EXTRACT(EPOCH FROM ("resetAt" - (NOW() AT TIME ZONE 'UTC')))::int AS "secondsLeft"`;
}
