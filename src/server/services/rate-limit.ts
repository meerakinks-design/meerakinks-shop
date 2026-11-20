import { prisma } from '@/server/db';
import { buildConsumeRateLimitQuery } from '@/server/services/rate-limit.sql';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
}

export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<{ count: number; secondsLeft: number }[]>(
    buildConsumeRateLimitQuery(key, windowSeconds),
  );
  const row = rows[0];
  if (!row) throw new Error('rate-limit: aucune ligne retournée');
  return { allowed: row.count <= limit, count: row.count, retryAfterSeconds: Math.max(row.secondsLeft, 1) };
}

export async function resetRateLimit(key: string): Promise<void> {
  await prisma.rateLimitBucket.deleteMany({ where: { key } });
}

/** Nettoyage opportuniste des fenêtres expirées. */
export async function purgeExpiredRateLimits(): Promise<void> {
  await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date() } } });
}
