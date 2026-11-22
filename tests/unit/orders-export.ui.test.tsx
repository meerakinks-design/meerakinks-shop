import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadFile, filenameFromDisposition } from '@/lib/api-client';
import { buildOrdersExportUrl, EMPTY_ORDERS_EXPORT_FORM, toggleValue } from '@/lib/orders-export-form';

const { requireAdminPage } = vi.hoisted(() => ({ requireAdminPage: vi.fn() }));
vi.mock('@/server/auth/guards', () => ({ requireAdminPage }));
vi.mock('next/navigation', () => ({ usePathname: () => '/admin', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...(rest as object)}>
      {children}
    </a>
  ),
}));

const { default: OrdersExportPage } = await import('@/app/admin/(protege)/export-commandes/page');
const { default: ProtectedAdminLayout } = await import('@/app/admin/(protege)/layout');

const admin = (role: 'OWNER' | 'STAFF') => ({ id: 'u1', name: 'Awa', email: 'a@b.ci', role });

describe('adresse de la route construite par le formulaire', () => {
  it('format seul', () => {
    expect(buildOrdersExportUrl(EMPTY_ORDERS_EXPORT_FORM)).toBe('/api/v1/admin/orders/export?format=xlsx');
  });

  it('période, statuts et zones : champs répétés, vides omis', () => {
    expect(
      buildOrdersExportUrl({
        format: 'csv',
        from: '2026-11-01',
        to: '',
        deliveryStatuses: ['PENDING', 'CONFIRMED'],
        paymentStatuses: ['PAID'],
        zones: ['ABIDJAN'],
      }),
    ).toBe('/api/v1/admin/orders/export?format=csv&from=2026-11-01&deliveryStatus=PENDING&deliveryStatus=CONFIRMED&paymentStatus=PAID&zone=ABIDJAN');
  });

  it('toggleValue ajoute puis retire', () => {
    expect(toggleValue(['A'], 'B')).toEqual(['A', 'B']);
    expect(toggleValue(['A', 'B'], 'A')).toEqual(['B']);
  });
});

describe('page « Export des commandes »', () => {
  it('propriétaire : avertissement sur les données personnelles, formats, filtres, limite, journal', async () => {
    requireAdminPage.mockResolvedValue(admin('OWNER'));
    const html = renderToStaticMarkup(await OrdersExportPage());
    expect(html).toContain('noms, les téléphones et les adresses');
    expect(html).toContain('sous votre responsabilité');
    expect(html).toContain('Excel (.xlsx)');
    expect(html).toContain('CSV');
    expect(html).toContain('Statut de livraison');
    expect(html).toContain('Statut de paiement');
    expect(html).toContain('Zone');
    expect(html).toContain('type="date"');
    expect(html).toContain('5');
    expect(html).toContain('000 commandes au plus');
    expect(html).toContain('inscrit au journal');
    expect(html).toContain('Télécharger');
  });

  it('autre compte : refus, aucun formulaire', async () => {
    requireAdminPage.mockResolvedValue(admin('STAFF'));
    const html = renderToStaticMarkup(await OrdersExportPage());
    expect(html).toContain('réservée au compte propriétaire');
    expect(html).not.toContain('<form');
  });

  it('entrée « Export des commandes » dans l’en-tête : propriétaire seulement', async () => {
    requireAdminPage.mockResolvedValue(admin('OWNER'));
    expect(renderToStaticMarkup(await ProtectedAdminLayout({ children: null }))).toContain('href="/admin/export-commandes"');
    requireAdminPage.mockResolvedValue(admin('STAFF'));
    expect(renderToStaticMarkup(await ProtectedAdminLayout({ children: null }))).not.toContain('/admin/export-commandes');
  });
});

describe('filenameFromDisposition', () => {
  it('lit le nom annoncé, sinon le nom de repli', () => {
    expect(filenameFromDisposition('attachment; filename="commandes-2026-11-20.xlsx"', 'x.xlsx')).toBe('commandes-2026-11-20.xlsx');
    expect(filenameFromDisposition(null, 'commandes.csv')).toBe('commandes.csv');
    expect(filenameFromDisposition('attachment', 'commandes.csv')).toBe('commandes.csv');
  });

  it('refuse un nom qui contient un chemin', () => {
    expect(filenameFromDisposition('attachment; filename="../../etc/passwd"', 'commandes.csv')).toBe('commandes.csv');
  });
});

describe('downloadFile', () => {
  const click = vi.fn();
  const remove = vi.fn();
  const appendChild = vi.fn();
  const link = { href: '', download: '', rel: '', click, remove };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal('document', { createElement: vi.fn(() => link), body: { appendChild } });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fichier');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('succès : déclenche le téléchargement sous le nom du serveur, puis libère le fichier', async () => {
    const fetchMock = vi.fn(async () => new Response('données', { status: 200, headers: { 'content-disposition': 'attachment; filename="commandes-2026-11-20.csv"', 'x-export-rows': '4' } }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await downloadFile('/api/v1/admin/orders/export?format=csv', 'commandes.csv');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/orders/export?format=csv', { credentials: 'same-origin' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filename).toBe('commandes-2026-11-20.csv');
      expect(result.headers.get('x-export-rows')).toBe('4');
    }
    expect(link.download).toBe('commandes-2026-11-20.csv');
    expect(link.href).toBe('blob:fichier');
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fichier');
  });

  it('erreur du serveur : renvoie son message (rien n’est téléchargé)', async () => {
    const body = { ok: false, error: { code: 'FORBIDDEN', message: 'Action réservée au compte propriétaire.', retryable: false } };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 403, headers: { 'content-type': 'application/json' } })));
    const result = await downloadFile('/x', 'commandes.csv');
    expect(result).toEqual({ ok: false, error: body.error });
    expect(click).not.toHaveBeenCalled();
  });

  it('réponse d’erreur qui n’est pas du JSON, ou réseau coupé : message de connexion', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>502</html>', { status: 502 })));
    const bad = await downloadFile('/x', 'commandes.csv');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe('NETWORK_ERROR');

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    const offline = await downloadFile('/x', 'commandes.csv');
    expect(offline.ok).toBe(false);
    expect(click).not.toHaveBeenCalled();
  });
});
