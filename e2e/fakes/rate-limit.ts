import type { RateLimitResult } from '@/server/services/rate-limit';

export type { RateLimitResult };

export async function consumeRateLimit(): Promise<RateLimitResult> {
  return { allowed: true, count: 1, retryAfterSeconds: 1 };
}
export async function resetRateLimit(): Promise<void> {}
export async function purgeExpiredRateLimits(): Promise<void> {}
