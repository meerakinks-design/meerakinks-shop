import { createHash, randomBytes } from 'node:crypto';

/** Jeton de session : 256 bits aléatoires. Il n'est jamais stocké, seulement son hash. */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Hash d'un jeton de session : un jeton à 256 bits n'a pas besoin de bcrypt, un hash rapide suffit. */
export function hashToken(token: string): string {
  return sha256Hex(token);
}

/** Identifiant pseudonymisé pour les clés de limitation (jamais d'IP ni d'email en clair en base). */
export function hashIdentifier(value: string): string {
  return sha256Hex(value.trim().toLowerCase());
}
