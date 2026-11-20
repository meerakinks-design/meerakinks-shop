import { describe, expect, it } from 'vitest';
import { generateSessionToken, hashIdentifier, hashToken } from '@/server/auth/tokens';

describe('tokens', () => {
  it('génère des jetons de session uniques et assez longs (256 bits)', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateSessionToken()));
    expect(tokens.size).toBe(200);
    for (const token of tokens) expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it('hache un jeton de façon déterministe, sans jamais le contenir', () => {
    const token = generateSessionToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });

  it('pseudonymise un identifiant sans tenir compte de la casse ni des espaces', () => {
    expect(hashIdentifier('  Aka@Example.com ')).toBe(hashIdentifier('aka@example.com'));
    expect(hashIdentifier('203.0.113.7')).not.toContain('203.0.113.7');
  });
});
