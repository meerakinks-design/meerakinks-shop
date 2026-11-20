import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/server/http';

const { requireAdminApi, getReceiptPdf } = vi.hoisted(() => ({ requireAdminApi: vi.fn(), getReceiptPdf: vi.fn() }));
vi.mock('@/server/auth/guards', () => ({ requireAdminApi }));
vi.mock('@/server/services/receipt-pdf.service', () => ({ getReceiptPdf }));
vi.mock('@/server/logger', () => ({ logInfo: vi.fn(), logError: vi.fn() }));

const { GET } = await import('@/app/api/v1/admin/orders/[id]/receipt/route');
const PDF = new Uint8Array(Buffer.from('%PDF-1.7 contenu'));
const call = (id: string) => GET(new Request(`http://localhost/api/v1/admin/orders/${id}/receipt`), { params: { id } });

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApi.mockResolvedValue({ id: 'admin_1', role: 'OWNER' });
  getReceiptPdf.mockResolvedValue({ number: 'REC-7K3M9QXP', filename: 'REC-7K3M9QXP.pdf', bytes: PDF });
});

describe('GET /api/v1/admin/orders/[id]/receipt', () => {
  it('sert le PDF en ligne, sans mise en cache partagée', async () => {
    const response = await call('CMD-7K3M9QXP');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toBe('inline; filename="REC-7K3M9QXP.pdf"');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('%PDF-1.7 contenu');
    expect(getReceiptPdf).toHaveBeenCalledWith('CMD-7K3M9QXP');
  });

  it('réservé au back-office : sans session, 401 et aucun document produit', async () => {
    requireAdminApi.mockRejectedValue(new HttpError(401, 'UNAUTHENTICATED', 'Connexion requise.'));
    const response = await call('CMD-7K3M9QXP');
    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).not.toBe('application/pdf');
    expect(getReceiptPdf).not.toHaveBeenCalled();
  });

  it('404 pour une commande inconnue', async () => {
    getReceiptPdf.mockRejectedValue(new HttpError(404, 'NOT_FOUND', 'Commande introuvable.'));
    const response = await call('inconnue');
    expect(response.status).toBe(404);
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('NOT_FOUND');
  });
});
