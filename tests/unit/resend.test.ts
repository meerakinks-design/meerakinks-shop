import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmailSendError, createResendTransport, isRetryableStatus, scrubError, type OutgoingEmail } from '@/server/integrations/resend';

const email = (overrides: Partial<OutgoingEmail> = {}): OutgoingEmail => ({
  from: 'Awa Beauty <commandes@awa.example>',
  to: 'vendeuse@example.com',
  subject: 'Nouvelle commande',
  html: '<p>Bonjour</p>',
  text: 'Bonjour',
  idempotencyKey: 'CMD-7K3M9QXP:NEW_ORDER_SELLER:a1',
  ...overrides,
});

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const failureOf = async (promise: Promise<unknown>): Promise<EmailSendError> => {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(EmailSendError);
  return error as EmailSendError;
};

describe('transport Resend — requête', () => {
  it('appelle POST /emails avec la clé, un User-Agent, une clé d’idempotence et le corps attendu', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { id: 'msg_123' }));
    const result = await createResendTransport('re_test_key', fetchMock as unknown as typeof fetch).send(email({ replyTo: 'awa@example.com' }));
    expect(result).toEqual({ id: 'msg_123' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer re_test_key');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['User-Agent']).toMatch(/^boutique-ecommerce\//);
    expect(headers['Idempotency-Key']).toBe('CMD-7K3M9QXP:NEW_ORDER_SELLER:a1');
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'Awa Beauty <commandes@awa.example>',
      to: ['vendeuse@example.com'],
      subject: 'Nouvelle commande',
      html: '<p>Bonjour</p>',
      text: 'Bonjour',
      reply_to: 'awa@example.com',
    });
  });

  it('joint le PDF en base64 sous le nom prévu, et n’envoie aucun champ vide sinon', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => reply(200, { id: 'msg_1' }));
    const transport = createResendTransport('re_k', fetchMock as unknown as typeof fetch);
    await transport.send(email({ attachments: [{ filename: 'REC-7K3M9QXP.pdf', content: 'JVBERi0xLjc=' }] }));
    expect(JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string).attachments).toEqual([{ filename: 'REC-7K3M9QXP.pdf', content: 'JVBERi0xLjc=' }]);

    await transport.send(email({ attachments: [] }));
    const body = JSON.parse((fetchMock.mock.calls[1]![1] as RequestInit).body as string);
    expect(body).not.toHaveProperty('attachments');
    expect(body).not.toHaveProperty('reply_to');
  });

  it('borne l’attente (délai d’abandon) quand le navigateur de Node sait le faire', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { id: 'msg_1' }));
    await createResendTransport('re_k', fetchMock as unknown as typeof fetch).send(email(), { timeoutMs: 4000 });
    expect((fetchMock.mock.calls[0]![1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });
});

describe('transport Resend — erreurs', () => {
  const failing = (status: number, body: unknown = { name: 'validation_error', message: 'Adresse refusée' }) =>
    createResendTransport('re_k', vi.fn().mockResolvedValue(reply(status, body)) as unknown as typeof fetch).send(email());

  it.each([401, 403, 408, 409, 425, 429, 500, 502, 503])('HTTP %i : on réessaiera', async (status) => {
    const error = await failureOf(failing(status));
    expect(error.retryable).toBe(true);
    expect(error.status).toBe(status);
    expect(isRetryableStatus(status)).toBe(true);
  });

  it.each([400, 404, 422])('HTTP %i : inutile de réessayer', async (status) => {
    const error = await failureOf(failing(status));
    expect(error.retryable).toBe(false);
    expect(isRetryableStatus(status)).toBe(false);
  });

  it('garde le code et le message du prestataire, sans jamais exposer une clé d’API', async () => {
    const error = await failureOf(failing(403, { name: 'validation_error', message: 'The domain is not verified. Key re_AbC123_xyz rejected.' }));
    expect(error.code).toBe('validation_error');
    expect(error.message).toContain('403');
    expect(error.message).toContain('The domain is not verified');
    expect(error.message).not.toContain('re_AbC123_xyz');
  });

  it('tolère une réponse d’erreur qui n’est pas du JSON', async () => {
    const transport = createResendTransport('re_k', vi.fn().mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 })) as unknown as typeof fetch);
    const error = await failureOf(transport.send(email()));
    expect(error.retryable).toBe(true);
    expect(error.message).toContain('502');
  });

  it('réseau coupé ou délai dépassé : on réessaiera', async () => {
    const network = await failureOf(createResendTransport('re_k', vi.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch).send(email()));
    expect(network).toMatchObject({ retryable: true, code: 'network', status: null });
    const timeout = await failureOf(createResendTransport('re_k', vi.fn().mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' })) as unknown as typeof fetch).send(email()));
    expect(timeout).toMatchObject({ retryable: true, code: 'timeout' });
  });

  it('une réponse « OK » sans identifiant est traitée comme un échec à réessayer', async () => {
    const transport = createResendTransport('re_k', vi.fn().mockResolvedValue(reply(200, { oops: true })) as unknown as typeof fetch);
    expect(await failureOf(transport.send(email()))).toMatchObject({ retryable: true, code: 'bad_response' });
  });

  it('scrubError masque les clés, aplatit les espaces et borne la longueur', () => {
    expect(scrubError('clé re_live_ABC123 invalide')).toBe('clé [clé masquée] invalide');
    expect(scrubError('a\n\n  b')).toBe('a b');
    expect(scrubError('x'.repeat(1000))).toHaveLength(300);
  });
});

describe('configuration', () => {
  const load = async (env: Record<string, string | undefined>) => {
    vi.resetModules();
    vi.stubEnv('DATABASE_URL', 'postgresql://u:p@localhost:5432/db');
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value as string);
    return (await import('@/server/integrations/resend')).getEmailConfig();
  };
  afterEach(() => vi.unstubAllEnvs());

  it('exige la clé ET un expéditeur valide ; sinon null (les emails attendent)', async () => {
    expect(await load({ RESEND_API_KEY: '', EMAIL_FROM: '' })).toBeNull();
    expect(await load({ RESEND_API_KEY: 're_k', EMAIL_FROM: '' })).toBeNull();
    expect(await load({ RESEND_API_KEY: '', EMAIL_FROM: 'commandes@awa.example' })).toBeNull();
    expect(await load({ RESEND_API_KEY: 're_k', EMAIL_FROM: 'pas une adresse' })).toBeNull();
    expect(await load({ RESEND_API_KEY: 're_k', EMAIL_FROM: 'Awa <pas-une-adresse>' })).toBeNull();
  });

  it('accepte « adresse » et « Nom <adresse> »', async () => {
    expect(await load({ RESEND_API_KEY: 're_k', EMAIL_FROM: 'commandes@awa.example' })).toEqual({ apiKey: 're_k', from: 'commandes@awa.example' });
    expect(await load({ RESEND_API_KEY: 're_k', EMAIL_FROM: '  Awa Beauty <commandes@awa.example> ' })).toEqual({ apiKey: 're_k', from: 'Awa Beauty <commandes@awa.example>' });
  });
});
