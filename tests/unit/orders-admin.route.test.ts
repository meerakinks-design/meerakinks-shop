import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/server/http';

const { requireAdminApi, changeDeliveryStatus, recordPayment, voidPayment, setDeliveryFee, setInternalNote } = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  changeDeliveryStatus: vi.fn(),
  recordPayment: vi.fn(),
  voidPayment: vi.fn(),
  setDeliveryFee: vi.fn(),
  setInternalNote: vi.fn(),
}));
vi.mock('@/server/auth/guards', () => ({ requireAdminApi }));
vi.mock('@/server/services/orders-admin.service', () => ({ changeDeliveryStatus, recordPayment, voidPayment, setDeliveryFee, setInternalNote }));
vi.mock('@/server/logger', () => ({ logInfo: vi.fn(), logError: vi.fn() }));

const status = await import('@/app/api/v1/admin/orders/[id]/status/route');
const payments = await import('@/app/api/v1/admin/orders/[id]/payments/route');
const voidRoute = await import('@/app/api/v1/admin/orders/[id]/payments/[paymentId]/void/route');
const fee = await import('@/app/api/v1/admin/orders/[id]/delivery-fee/route');
const note = await import('@/app/api/v1/admin/orders/[id]/note/route');

const ADMIN = { id: 'admin_1', name: 'Awa', email: 'a@b.ci', role: 'STAFF' };
const request = (method: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/v1/admin/orders/ord_1/x', {
    method,
    headers: { 'content-type': 'application/json', host: 'localhost', ...headers },
    body: JSON.stringify(body),
  });
const json = async (response: Response) => (await response.json()) as { ok: boolean; data?: unknown; error?: { code: string; fields?: Record<string, string[]> } };
const ctx = { params: { id: 'ord_1' } };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApi.mockResolvedValue(ADMIN);
  changeDeliveryStatus.mockResolvedValue({ deliveryStatus: 'CONFIRMED', paymentStatus: 'DEPOSIT_DUE', stockRestored: false, refundDue: 0 });
  recordPayment.mockResolvedValue({ paymentId: 'pay_1', paymentStatus: 'DEPOSIT_PAID', netPaid: 2000 });
  voidPayment.mockResolvedValue({ paymentId: 'pay_1', paymentStatus: 'DEPOSIT_DUE', netPaid: 0 });
  setDeliveryFee.mockResolvedValue({ deliveryFee: 1500, total: 16500, upfrontAmount: 2000, paymentStatus: 'DEPOSIT_DUE' });
  setInternalNote.mockResolvedValue(undefined);
});

describe('POST /orders/[id]/status', () => {
  it('transmet le statut, la note et l’administrateur au service', async () => {
    const response = await status.POST(request('POST', { status: 'CONFIRMED', note: 'Appelée' }), ctx);
    expect(response.status).toBe(200);
    expect((await json(response)).ok).toBe(true);
    expect(changeDeliveryStatus).toHaveBeenCalledWith({ orderId: 'ord_1', to: 'CONFIRMED', note: 'Appelée', admin: ADMIN });
  });
  it('422 pour un statut inconnu, rien n’est modifié', async () => {
    const response = await status.POST(request('POST', { status: 'LOST' }), ctx);
    expect(response.status).toBe(422);
    expect(changeDeliveryStatus).not.toHaveBeenCalled();
  });
  it('401 sans session', async () => {
    requireAdminApi.mockRejectedValue(new HttpError(401, 'UNAUTHENTICATED', 'Connexion requise.'));
    expect((await status.POST(request('POST', { status: 'CONFIRMED' }), ctx)).status).toBe(401);
    expect(changeDeliveryStatus).not.toHaveBeenCalled();
  });
  it('403 pour une requête venue d’un autre site (anti-CSRF), avant toute vérification de session', async () => {
    const response = await status.POST(request('POST', { status: 'CONFIRMED' }, { origin: 'https://site-pirate.example' }), ctx);
    expect(response.status).toBe(403);
    expect(requireAdminApi).not.toHaveBeenCalled();
    expect(changeDeliveryStatus).not.toHaveBeenCalled();
  });
  it('renvoie telle quelle l’erreur du service (409 : statut définitif)', async () => {
    changeDeliveryStatus.mockRejectedValue(new HttpError(409, 'CONFLICT', 'Une commande « livrée » ne peut plus changer de statut.'));
    const response = await status.POST(request('POST', { status: 'CANCELLED' }), ctx);
    expect(response.status).toBe(409);
    expect((await json(response)).error?.code).toBe('CONFLICT');
  });
});

describe('POST /orders/[id]/payments', () => {
  it('enregistre le paiement (201)', async () => {
    const response = await payments.POST(request('POST', { kind: 'DEPOSIT', method: 'WAVE', amount: 2000 }), ctx);
    expect(response.status).toBe(201);
    expect(recordPayment).toHaveBeenCalledWith({ orderId: 'ord_1', payment: expect.objectContaining({ kind: 'DEPOSIT', method: 'WAVE', amount: 2000 }), admin: ADMIN });
  });
  it('422 avec le champ en cause pour un montant invalide ou un remboursement sans motif', async () => {
    const bad = await payments.POST(request('POST', { kind: 'DEPOSIT', method: 'WAVE', amount: -1 }), ctx);
    expect(bad.status).toBe(422);
    expect((await json(bad)).error?.fields).toHaveProperty('amount');
    const refund = await payments.POST(request('POST', { kind: 'REFUND', method: 'WAVE', amount: 500 }), ctx);
    expect(refund.status).toBe(422);
    expect((await json(refund)).error?.fields).toHaveProperty('note');
    expect(recordPayment).not.toHaveBeenCalled();
  });
});

describe('autres routes', () => {
  it('annule un paiement avec son motif', async () => {
    const response = await voidRoute.POST(request('POST', { reason: 'Saisi en double' }), { params: { id: 'ord_1', paymentId: 'pay_1' } });
    expect(response.status).toBe(200);
    expect(voidPayment).toHaveBeenCalledWith({ orderId: 'ord_1', paymentId: 'pay_1', reason: 'Saisi en double', admin: ADMIN });
    expect((await voidRoute.POST(request('POST', { reason: '' }), { params: { id: 'ord_1', paymentId: 'pay_1' } })).status).toBe(422);
  });
  it('fixe les frais de livraison (entier ≥ 0)', async () => {
    expect((await fee.PUT(request('PUT', { fee: 1500 }), ctx)).status).toBe(200);
    expect(setDeliveryFee).toHaveBeenCalledWith({ orderId: 'ord_1', fee: 1500, admin: ADMIN });
    expect((await fee.PUT(request('PUT', { fee: -5 }), ctx)).status).toBe(422);
  });
  it('enregistre la note interne', async () => {
    expect((await note.PUT(request('PUT', { note: ' À rappeler ' }), ctx)).status).toBe(200);
    expect(setInternalNote).toHaveBeenCalledWith({ orderId: 'ord_1', note: 'À rappeler' });
  });
});
