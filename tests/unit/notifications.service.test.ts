import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailSendError, type EmailTransport, type OutgoingEmail } from '@/server/integrations/resend';
import { buildReceiptData } from '@/server/services/receipt.service';

const { prismaMock, getEmailConfig, loadOrderDocument, logInfo, logError } = vi.hoisted(() => ({
  prismaMock: { emailNotification: { findMany: vi.fn(), updateMany: vi.fn() }, storeSettings: { findUnique: vi.fn() } },
  getEmailConfig: vi.fn(),
  loadOrderDocument: vi.fn(),
  logInfo: vi.fn(),
  logError: vi.fn(),
}));
vi.mock('@/server/db', () => ({ prisma: prismaMock }));
vi.mock('@/server/logger', () => ({ logInfo, logError }));
vi.mock('@/server/services/receipt-pdf.service', () => ({ loadOrderDocument }));
vi.mock('@/server/integrations/resend', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/server/integrations/resend')>()), getEmailConfig }));

const { EMAIL_LEASE_MINUTES, EMAIL_MAX_ATTEMPTS, EMAIL_RETRY_DELAYS_MINUTES, processOutbox, requeueEmail, retryDelayMinutes, sendOrderEmailsNow } = await import('@/server/services/notifications.service');

const NOW = new Date('2026-11-17T10:00:00.000Z');
const clock = () => NOW;
const minutes = (count: number) => new Date(NOW.getTime() + count * 60_000);
const CONFIG = { apiKey: 're_test', from: 'Awa Beauty <commandes@awa.example>' };

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'mail_1',
  type: 'NEW_ORDER_SELLER',
  toEmail: 'vendeuse@example.com',
  dedupeKey: 'CMD-7K3M9QXP:NEW_ORDER_SELLER',
  status: 'PENDING',
  attempts: 0,
  nextAttemptAt: new Date('2026-11-17T09:00:00.000Z'),
  orderId: 'order_1',
  ...overrides,
});

const receiptJson = (email: string | null = 'awa@example.com') =>
  JSON.parse(
    JSON.stringify(
      buildReceiptData({
        issuedAt: NOW,
        shop: { name: 'Awa Beauty', legalName: null, address: null, contactPhone: null, contactEmail: null },
        depositAmount: 2000,
        customer: { fullName: 'Awa Koné', phone: '+2250700000000', email },
        delivery: { zoneType: 'ABIDJAN', country: 'Côte d’Ivoire', city: 'Cocody', address: 'Riviera Palmeraie' },
        lines: [{ name: 'Sérum éclat', unitPrice: 10000, quantity: 2, lineTotal: 20000 }],
        subtotal: 20000,
        deliveryFee: null,
        total: null,
        upfrontAmount: 2000,
      }),
    ),
  );
const orderDocument = (overrides: Record<string, unknown> = {}) => ({
  id: 'order_1',
  reference: 'CMD-7K3M9QXP',
  customerNote: null,
  deliveryStatus: 'PENDING',
  paymentStatus: 'DEPOSIT_DUE',
  receipt: { number: 'REC-7K3M9QXP', data: receiptJson() },
  payments: [],
  ...overrides,
});

const transportReturning = (id = 'msg_1') => {
  const send = vi.fn(async (_email: OutgoingEmail) => ({ id }));
  return { send } satisfies EmailTransport & { send: typeof send };
};
const claimOf = (index = 0) => prismaMock.emailNotification.updateMany.mock.calls[index]![0] as { where: Record<string, unknown>; data: Record<string, any> };
const settleOf = () => claimOf(1);

beforeEach(() => {
  vi.clearAllMocks();
  getEmailConfig.mockReturnValue(CONFIG);
  prismaMock.emailNotification.findMany.mockResolvedValue([row()]);
  prismaMock.emailNotification.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.storeSettings.findUnique.mockResolvedValue({ storeName: 'Awa Beauty', contactEmail: 'contact@awa.example' });
  loadOrderDocument.mockResolvedValue(orderDocument());
});

describe('processOutbox — sélection', () => {
  it('sans configuration Resend : ne touche à rien, les emails attendent', async () => {
    getEmailConfig.mockReturnValue(null);
    const summary = await processOutbox({ now: clock, transport: transportReturning() });
    expect(summary).toEqual({ configured: false, claimed: 0, sent: 0, retrying: 0, failed: 0, skipped: 0 });
    expect(prismaMock.emailNotification.findMany).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.updateMany).not.toHaveBeenCalled();
  });

  it('ne retient que les emails dont l’heure est venue : en attente, ou « en cours » dont la réservation a expiré', async () => {
    await processOutbox({ now: clock, transport: transportReturning(), limit: 7 });
    expect(prismaMock.emailNotification.findMany).toHaveBeenCalledWith({
      where: { status: { in: ['PENDING', 'PROCESSING'] }, nextAttemptAt: { lte: NOW } },
      orderBy: { nextAttemptAt: 'asc' },
      take: 7,
      select: expect.objectContaining({ id: true, dedupeKey: true, attempts: true }),
    });
  });

  it('peut se limiter à une commande (tentative immédiate)', async () => {
    await processOutbox({ now: clock, transport: transportReturning(), orderReference: 'CMD-7K3M9QXP' });
    expect(prismaMock.emailNotification.findMany.mock.calls[0]![0].where).toEqual({
      status: { in: ['PENDING', 'PROCESSING'] },
      nextAttemptAt: { lte: NOW },
      order: { reference: 'CMD-7K3M9QXP' },
    });
  });
});

describe('processOutbox — envoi réussi', () => {
  it('réserve la ligne de façon atomique avant d’envoyer', async () => {
    await processOutbox({ now: clock, transport: transportReturning() });
    const claim = claimOf(0);
    expect(claim.where).toEqual({ id: 'mail_1', status: 'PENDING', nextAttemptAt: new Date('2026-11-17T09:00:00.000Z') });
    expect(claim.data).toEqual({ status: 'PROCESSING', attempts: { increment: 1 }, nextAttemptAt: minutes(EMAIL_LEASE_MINUTES) });
  });

  it('envoie l’alerte à la vendeuse avec le reçu PDF joint, puis marque la ligne envoyée', async () => {
    const transport = transportReturning('msg_42');
    const summary = await processOutbox({ now: clock, transport });
    expect(summary).toMatchObject({ configured: true, claimed: 1, sent: 1, retrying: 0, failed: 0, skipped: 0 });

    const sent = transport.send.mock.calls[0]![0];
    expect(sent.from).toBe(CONFIG.from);
    expect(sent.to).toBe('vendeuse@example.com');
    expect(sent.subject).toBe('Nouvelle commande CMD-7K3M9QXP — Awa Koné');
    expect(sent.html).toContain('CMD-7K3M9QXP');
    expect(sent.text).toContain('Sérum éclat');
    expect(sent.replyTo).toBe('awa@example.com');
    expect(sent.idempotencyKey).toBe('CMD-7K3M9QXP:NEW_ORDER_SELLER:a1');
    expect(sent.attachments).toHaveLength(1);
    expect(sent.attachments![0]!.filename).toBe('REC-7K3M9QXP.pdf');
    expect(Buffer.from(sent.attachments![0]!.content, 'base64').subarray(0, 5).toString()).toBe('%PDF-');

    const settle = settleOf();
    expect(settle.where).toEqual({ id: 'mail_1', status: 'PROCESSING' });
    expect(settle.data).toEqual({ status: 'SENT', sentAt: NOW, providerMessageId: 'msg_42', lastError: null });
  });

  it('l’accusé au client n’a pas de pièce jointe et répond à la boutique', async () => {
    prismaMock.emailNotification.findMany.mockResolvedValue([row({ id: 'mail_2', type: 'ORDER_RECEIVED_CUSTOMER', toEmail: 'awa@example.com', dedupeKey: 'CMD-7K3M9QXP:ORDER_RECEIVED_CUSTOMER' })]);
    const transport = transportReturning();
    await processOutbox({ now: clock, transport });
    const sent = transport.send.mock.calls[0]![0];
    expect(sent.to).toBe('awa@example.com');
    expect(sent.subject).toBe('Votre commande CMD-7K3M9QXP est enregistrée');
    expect(sent.attachments).toBeUndefined();
    expect(sent.replyTo).toBe('contact@awa.example');
  });

  it('l’email de changement de statut utilise le statut courant de la commande', async () => {
    prismaMock.emailNotification.findMany.mockResolvedValue([row({ id: 'mail_3', type: 'STATUS_CHANGED_CUSTOMER', toEmail: 'awa@example.com', dedupeKey: 'CMD-7K3M9QXP:STATUS:CONFIRMED' })]);
    loadOrderDocument.mockResolvedValue(orderDocument({ deliveryStatus: 'CONFIRMED' }));
    const transport = transportReturning();
    await processOutbox({ now: clock, transport });
    expect(transport.send.mock.calls[0]![0].subject).toBe('Votre commande CMD-7K3M9QXP : Confirmée');
  });

  it('numérote la tentative dans la clé d’idempotence', async () => {
    prismaMock.emailNotification.findMany.mockResolvedValue([row({ attempts: 2 })]);
    const transport = transportReturning();
    await processOutbox({ now: clock, transport });
    expect(transport.send.mock.calls[0]![0].idempotencyKey).toBe('CMD-7K3M9QXP:NEW_ORDER_SELLER:a3');
  });
});

describe('processOutbox — échecs et reprises', () => {
  const failing = (error: unknown): EmailTransport => ({ send: vi.fn().mockRejectedValue(error) });
  const transient = () => new EmailSendError('Resend 503 (application_error) : indisponible', true, 503, 'application_error');

  it('un échec passager remet la ligne en attente avec un délai croissant', async () => {
    const delays: number[] = [];
    for (const attempts of [0, 1, 2, 3, 4]) {
      vi.clearAllMocks();
      getEmailConfig.mockReturnValue(CONFIG);
      prismaMock.emailNotification.findMany.mockResolvedValue([row({ attempts })]);
      prismaMock.emailNotification.updateMany.mockResolvedValue({ count: 1 });
      loadOrderDocument.mockResolvedValue(orderDocument());
      prismaMock.storeSettings.findUnique.mockResolvedValue(null);
      const summary = await processOutbox({ now: clock, transport: failing(transient()) });
      expect(summary).toMatchObject({ claimed: 1, retrying: 1, failed: 0, sent: 0 });
      const settle = settleOf();
      expect(settle.data.status).toBe('PENDING');
      expect(settle.data.lastError).toContain('503');
      delays.push((settle.data.nextAttemptAt as Date).getTime() - NOW.getTime());
    }
    expect(delays.map((ms) => ms / 60_000)).toEqual([...EMAIL_RETRY_DELAYS_MINUTES]);
    expect(EMAIL_RETRY_DELAYS_MINUTES).toEqual([1, 5, 15, 60, 180]);
  });

  it(`abandonne (FAILED) après ${EMAIL_MAX_ATTEMPTS} tentatives`, async () => {
    prismaMock.emailNotification.findMany.mockResolvedValue([row({ attempts: EMAIL_MAX_ATTEMPTS - 1 })]);
    const summary = await processOutbox({ now: clock, transport: failing(transient()) });
    expect(summary).toMatchObject({ failed: 1, retrying: 0 });
    expect(settleOf().data).toMatchObject({ status: 'FAILED', nextAttemptAt: NOW });
  });

  it('une erreur définitive (adresse refusée) abandonne tout de suite, sans gaspiller de tentatives', async () => {
    const refused = new EmailSendError('Resend 422 (validation_error) : adresse invalide', false, 422, 'validation_error');
    const summary = await processOutbox({ now: clock, transport: failing(refused) });
    expect(summary).toMatchObject({ failed: 1, retrying: 0 });
    expect(settleOf().data.status).toBe('FAILED');
  });

  it('une erreur inattendue (base, bug) est traitée comme passagère', async () => {
    loadOrderDocument.mockRejectedValue(new Error('connexion perdue'));
    const summary = await processOutbox({ now: clock, transport: transportReturning() });
    expect(summary.retrying).toBe(1);
    expect(settleOf().data).toMatchObject({ status: 'PENDING', lastError: 'connexion perdue' });
  });

  it('commande ou reçu introuvable, reçu illisible, ligne orpheline : abandon définitif avec une raison claire', async () => {
    const cases: [() => void, string][] = [
      [() => loadOrderDocument.mockResolvedValue(null), 'introuvable'],
      [() => loadOrderDocument.mockResolvedValue(orderDocument({ receipt: null })), 'introuvable'],
      [() => loadOrderDocument.mockResolvedValue(orderDocument({ receipt: { number: 'REC-1', data: { version: 1 } } })), 'illisibles'],
      [() => prismaMock.emailNotification.findMany.mockResolvedValue([row({ orderId: null })]), 'sans commande'],
    ];
    for (const [arrange, reason] of cases) {
      vi.clearAllMocks();
      getEmailConfig.mockReturnValue(CONFIG);
      prismaMock.emailNotification.findMany.mockResolvedValue([row()]);
      prismaMock.emailNotification.updateMany.mockResolvedValue({ count: 1 });
      arrange();
      const transport = transportReturning();
      const summary = await processOutbox({ now: clock, transport });
      expect(summary.failed).toBe(1);
      expect(transport.send).not.toHaveBeenCalled();
      expect(settleOf().data.status).toBe('FAILED');
      expect(settleOf().data.lastError).toContain(reason);
    }
  });

  it('stocke une erreur bornée et sans clé d’API', async () => {
    const leaky = new EmailSendError(`Resend 500 : ${'x'.repeat(2000)}`, true, 500, null);
    await processOutbox({ now: clock, transport: failing(leaky) });
    expect((settleOf().data.lastError as string).length).toBeLessThanOrEqual(500);

    vi.clearAllMocks();
    getEmailConfig.mockReturnValue(CONFIG);
    prismaMock.emailNotification.findMany.mockResolvedValue([row()]);
    prismaMock.emailNotification.updateMany.mockResolvedValue({ count: 1 });
    loadOrderDocument.mockRejectedValue(new Error('échec avec la clé re_live_SECRET123 dedans'));
    await processOutbox({ now: clock, transport: transportReturning() });
    expect(settleOf().data.lastError).not.toContain('re_live_SECRET123');
  });

  it('n’écrit jamais d’adresse email ni de contenu dans le journal', async () => {
    await processOutbox({ now: clock, transport: failing(new EmailSendError('Resend 422 : vendeuse@example.com refusée', false, 422, 'validation_error')) });
    await processOutbox({ now: clock, transport: transportReturning() });
    const logged = JSON.stringify([...logError.mock.calls, ...logInfo.mock.calls]);
    for (const secret of ['vendeuse@example.com', 'awa@example.com', 'Awa', 'Koné', 'Riviera']) expect(logged).not.toContain(secret);
    expect(logged).toContain('email.failed');
    expect(logged).toContain('email.sent');
  });
});

describe('processOutbox — concurrence et budget', () => {
  it('ne fait rien si une autre exécution a déjà réservé la ligne (aucun double envoi)', async () => {
    prismaMock.emailNotification.updateMany.mockResolvedValue({ count: 0 });
    const transport = transportReturning();
    const summary = await processOutbox({ now: clock, transport });
    expect(summary).toMatchObject({ claimed: 0, skipped: 1, sent: 0 });
    expect(transport.send).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.updateMany).toHaveBeenCalledTimes(1); // seulement la tentative de réservation
  });

  it('reprend une ligne « en cours » dont la réservation a expiré (exécution interrompue)', async () => {
    prismaMock.emailNotification.findMany.mockResolvedValue([row({ status: 'PROCESSING', attempts: 1, nextAttemptAt: new Date('2026-11-17T09:49:00.000Z') })]);
    const transport = transportReturning();
    const summary = await processOutbox({ now: clock, transport });
    expect(summary.sent).toBe(1);
    expect(claimOf(0).where).toMatchObject({ status: 'PROCESSING', nextAttemptAt: new Date('2026-11-17T09:49:00.000Z') });
    expect(transport.send.mock.calls[0]![0].idempotencyKey).toBe('CMD-7K3M9QXP:NEW_ORDER_SELLER:a2');
  });

  it('un échec n’empêche pas de traiter les lignes suivantes', async () => {
    prismaMock.emailNotification.findMany.mockResolvedValue([row({ id: 'a' }), row({ id: 'b', dedupeKey: 'CMD-7K3M9QXP:ORDER_RECEIVED_CUSTOMER', type: 'ORDER_RECEIVED_CUSTOMER', toEmail: 'awa@example.com' })]);
    const send = vi.fn().mockRejectedValueOnce(new EmailSendError('Resend 503', true, 503, null)).mockResolvedValueOnce({ id: 'msg_b' });
    const summary = await processOutbox({ now: clock, transport: { send } });
    expect(summary).toMatchObject({ claimed: 2, retrying: 1, sent: 1 });
  });

  it('s’arrête de démarrer de nouvelles lignes une fois le budget de temps dépassé', async () => {
    prismaMock.emailNotification.findMany.mockResolvedValue([row({ id: 'a' }), row({ id: 'b' })]);
    const transport = transportReturning();
    const summary = await processOutbox({ now: clock, transport, timeBudgetMs: -1 });
    expect(summary).toMatchObject({ claimed: 0, sent: 0 });
    expect(transport.send).not.toHaveBeenCalled();
    expect(prismaMock.emailNotification.updateMany).not.toHaveBeenCalled();
  });

  it('traite plusieurs lignes en parallèle quand on le demande', async () => {
    prismaMock.emailNotification.findMany.mockResolvedValue([row({ id: 'a' }), row({ id: 'b' })]);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started: string[] = [];
    const send = vi.fn(async (email: OutgoingEmail) => {
      started.push(email.idempotencyKey);
      await gate;
      return { id: 'msg' };
    });
    const running = processOutbox({ now: clock, transport: { send }, concurrency: 2 });
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2)); // les deux envois sont partis avant qu'aucun ne se termine
    release();
    expect((await running).sent).toBe(2);
  });
});

describe('sendOrderEmailsNow — tentative immédiate', () => {
  it('cible la commande, avec des délais courts', async () => {
    const send = vi.fn().mockResolvedValue({ id: 'msg' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ id: 'msg_x' }), { status: 200 }));
    const summary = await sendOrderEmailsNow('CMD-7K3M9QXP');
    expect(summary).toMatchObject({ configured: true, claimed: 1, sent: 1 });
    expect(prismaMock.emailNotification.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5, where: expect.objectContaining({ order: { reference: 'CMD-7K3M9QXP' } }) }));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect((fetchSpy.mock.calls[0]![1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
    expect(send).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('ne lève JAMAIS : la commande est déjà enregistrée', async () => {
    prismaMock.emailNotification.findMany.mockRejectedValue(new Error('base indisponible'));
    await expect(sendOrderEmailsNow('CMD-7K3M9QXP')).resolves.toBeNull();
    expect(logError).toHaveBeenCalledWith('email.immediate_failed', { reference: 'CMD-7K3M9QXP' }, expect.any(Error));
  });

  it('sans configuration Resend : rend la main sans erreur', async () => {
    getEmailConfig.mockReturnValue(null);
    expect(await sendOrderEmailsNow('CMD-7K3M9QXP')).toMatchObject({ configured: false });
  });
});

describe('requeueEmail', () => {
  it('relance seulement un email abandonné', async () => {
    expect(await requeueEmail('mail_1')).toBe(true);
    expect(prismaMock.emailNotification.updateMany).toHaveBeenCalledWith({
      where: { id: 'mail_1', status: 'FAILED' },
      data: { status: 'PENDING', attempts: 0, nextAttemptAt: expect.any(Date), lastError: null },
    });
    prismaMock.emailNotification.updateMany.mockResolvedValue({ count: 0 });
    expect(await requeueEmail('mail_1')).toBe(false);
  });
});

describe('retryDelayMinutes', () => {
  it('suit la grille et reste borné', () => {
    expect([1, 2, 3, 4, 5, 6, 99].map(retryDelayMinutes)).toEqual([1, 5, 15, 60, 180, 180, 180]);
    expect(retryDelayMinutes(0)).toBe(1);
  });
});
