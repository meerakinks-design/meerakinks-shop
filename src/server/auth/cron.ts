import { createHash, timingSafeEqual } from 'node:crypto';
import { getServerEnv } from '@/lib/env';
import { HttpError } from '@/server/http';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Une tâche planifiée est une URL publique : seule la requête portant le secret est acceptée. Vercel envoie
 * `Authorization: Bearer <CRON_SECRET>` quand la variable existe. Sans secret configuré, la route est FERMÉE (jamais
 * ouverte par défaut). Comparaison à temps constant, sur des empreintes de même longueur.
 */
export function assertCronAuthorized(request: Request): void {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret) throw new HttpError(503, 'SERVICE_UNAVAILABLE', 'Tâche planifiée non configurée.');
  const header = request.headers.get('authorization') ?? '';
  const expected = digest(`Bearer ${secret}`);
  if (!timingSafeEqual(digest(header), expected)) throw new HttpError(401, 'UNAUTHENTICATED', 'Accès refusé.');
}
