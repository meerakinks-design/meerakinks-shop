import { describe, expect, it } from 'vitest';
import { assertSameOrigin, getClientIp, HttpError, readJson } from '@/server/http';

function request(headers: Record<string, string>, body?: string): Request {
  return new Request('https://boutique.example/api/v1/admin/auth/login', { method: 'POST', headers, body });
}

describe('getClientIp', () => {
  it('prend la première adresse de x-forwarded-for', () => {
    expect(getClientIp(request({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
  });
  it('retombe sur x-real-ip puis sur « unknown »', () => {
    expect(getClientIp(request({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
    expect(getClientIp(request({}))).toBe('unknown');
  });
});

describe('assertSameOrigin', () => {
  it('accepte une origine identique au site', () => {
    expect(() => assertSameOrigin(request({ origin: 'https://boutique.example', host: 'boutique.example' }))).not.toThrow();
  });
  it('utilise x-forwarded-host derrière un proxy', () => {
    expect(() =>
      assertSameOrigin(request({ origin: 'https://boutique.example', host: 'interne:3000', 'x-forwarded-host': 'boutique.example' })),
    ).not.toThrow();
  });
  it('refuse une origine étrangère', () => {
    expect(() => assertSameOrigin(request({ origin: 'https://pirate.example', host: 'boutique.example' }))).toThrowError(HttpError);
  });
  it('refuse une origine illisible', () => {
    expect(() => assertSameOrigin(request({ origin: 'pas-une-url', host: 'boutique.example' }))).toThrowError(HttpError);
  });
  it('refuse une requête navigateur venant d’un autre site (sans Origin)', () => {
    expect(() => assertSameOrigin(request({ 'sec-fetch-site': 'cross-site', host: 'boutique.example' }))).toThrowError(HttpError);
  });
  it('laisse passer un client hors navigateur (curl, tests)', () => {
    expect(() => assertSameOrigin(request({ host: 'boutique.example' }))).not.toThrow();
  });
});

describe('readJson', () => {
  const json = { 'content-type': 'application/json' };

  it('lit un JSON valide', async () => {
    expect(await readJson(request(json, '{"a":1}'))).toEqual({ a: 1 });
  });
  it('refuse un autre type de contenu (415)', async () => {
    await expect(readJson(request({ 'content-type': 'text/plain' }, 'x'))).rejects.toMatchObject({ status: 415 });
  });
  it('refuse un corps trop volumineux (413)', async () => {
    await expect(readJson(request(json, JSON.stringify({ a: 'x'.repeat(200) })), 100)).rejects.toMatchObject({ status: 413 });
  });
  it('refuse un JSON invalide (422)', async () => {
    await expect(readJson(request(json, '{pas du json'))).rejects.toMatchObject({ status: 422 });
  });
});
