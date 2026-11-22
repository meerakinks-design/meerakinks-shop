import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/server/http';

const { requireOwnerApi, exportOrders } = vi.hoisted(() => ({ requireOwnerApi: vi.fn(), exportOrders: vi.fn() }));
vi.mock('@/server/auth/guards', () => ({ requireOwnerApi }));
vi.mock('@/server/services/orders-export.service', () => ({ exportOrders }));
vi.mock('@/server/logger', () => ({ logInfo: vi.fn(), logError: vi.fn() }));

const { GET } = await import('@/app/api/v1/admin/orders/export/route');

const call = (query: string) => GET(new Request(`http://localhost/api/v1/admin/orders/export${query}`, { headers: { host: 'localhost' } }), undefined);
const json = async (response: Response) => (await response.json()) as { ok: boolean; error?: { code: string; fields?: Record<string, string[]> } };

beforeEach(() => {
  vi.clearAllMocks();
  requireOwnerApi.mockResolvedValue({ id: 'admin_1', name: 'Awa', email: 'a@b.ci', role: 'OWNER' });
  exportOrders.mockResolvedValue({ format: 'csv', filename: 'commandes-2026-11-20.csv', body: Buffer.from('﻿Référence\r\n', 'utf8'), rows: 7 });
});

describe('GET /api/v1/admin/orders/export', () => {
  it('propriétaire : fichier en pièce jointe, jamais mis en cache, avec le nombre de lignes', async () => {
    const response = await call('?format=csv');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="commandes-2026-11-20.csv"');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-export-rows')).toBe('7');
    expect(Buffer.from(await response.arrayBuffer()).toString('utf8')).toBe('﻿Référence\r\n');
  });

  it('Excel : type de contenu .xlsx', async () => {
    exportOrders.mockResolvedValue({ format: 'xlsx', filename: 'commandes-2026-11-20.xlsx', body: Buffer.from('PK'), rows: 0 });
    const response = await call('?format=xlsx');
    expect(response.headers.get('content-type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.headers.get('content-disposition')).toContain('attachment');
  });

  it('transmet au service les filtres lus dans l’adresse et le compte connecté', async () => {
    await call('?format=csv&from=2026-11-01&to=2026-11-30&deliveryStatus=PENDING&paymentStatus=PAID&paymentStatus=PARTIALLY_PAID&zone=ABIDJAN');
    expect(exportOrders).toHaveBeenCalledWith({
      query: {
        format: 'csv',
        from: '2026-11-01',
        to: '2026-11-30',
        deliveryStatuses: ['PENDING'],
        paymentStatuses: ['PAID', 'PARTIALLY_PAID'],
        zones: ['ABIDJAN'],
      },
      adminUserId: 'admin_1',
    });
  });

  it('403 pour un compte qui n’est pas propriétaire : aucune lecture, aucun fichier', async () => {
    requireOwnerApi.mockRejectedValue(new HttpError(403, 'FORBIDDEN', 'Action réservée au compte propriétaire.'));
    const response = await call('?format=csv');
    expect(response.status).toBe(403);
    expect((await json(response)).error?.code).toBe('FORBIDDEN');
    expect(exportOrders).not.toHaveBeenCalled();
  });

  it('401 sans session', async () => {
    requireOwnerApi.mockRejectedValue(new HttpError(401, 'UNAUTHENTICATED', 'Connexion requise.'));
    expect((await call('?format=csv')).status).toBe(401);
    expect(exportOrders).not.toHaveBeenCalled();
  });

  it('l’accès est vérifié avant les paramètres : un non-propriétaire ne voit pas les erreurs de validation', async () => {
    requireOwnerApi.mockRejectedValue(new HttpError(403, 'FORBIDDEN', 'Action réservée au compte propriétaire.'));
    expect((await call('?format=pdf')).status).toBe(403);
  });

  it('422 avec le champ fautif : format inconnu, date impossible, période inversée', async () => {
    for (const [query, field] of [
      ['', 'format'],
      ['?format=pdf', 'format'],
      ['?format=csv&from=2026-02-30', 'from'],
      ['?format=csv&from=2026-12-01&to=2026-11-01', 'to'],
      ['?format=csv&zone=MARS', 'zones'],
    ] as const) {
      const response = await call(query);
      expect(response.status).toBe(422);
      const body = await json(response);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
      expect(Object.keys(body.error?.fields ?? {})).toContain(field);
    }
    expect(exportOrders).not.toHaveBeenCalled();
  });

  it('plus de lignes que la limite : le message du service est transmis tel quel', async () => {
    exportOrders.mockRejectedValue(new HttpError(422, 'VALIDATION_ERROR', 'Plus de 5 000 commandes correspondent à ces filtres. Réduisez la période ou ajoutez un filtre.'));
    const response = await call('?format=csv');
    expect(response.status).toBe(422);
    expect(JSON.stringify(await json(response))).toContain('Réduisez la période');
  });
});
