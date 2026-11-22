import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const { default: CustomerDataPage } = await import('@/app/admin/(protege)/donnees-clients/page');
const { default: ProtectedAdminLayout } = await import('@/app/admin/(protege)/layout');

const admin = (role: 'OWNER' | 'STAFF') => ({ id: 'u1', name: 'Awa', email: 'a@b.ci', role });
beforeEach(() => vi.clearAllMocks());

describe('page « Données clients » (back-office)', () => {
  it('propriétaire : explique ce qui est effacé et ce qui reste, avec la case de confirmation', async () => {
    requireAdminPage.mockResolvedValue(admin('OWNER'));
    const html = renderToStaticMarkup(await CustomerDataPage());
    expect(html).toContain('Effacer les données d’un client');
    expect(html).toContain('Les commandes restent dans vos comptes');
    expect(html).toContain('commande en cours');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('Cette action est définitive');
    expect(html).toContain('36 mois'); // lue dans la constante, comme la politique de confidentialité
  });

  it('autre compte : message de refus, aucun formulaire', async () => {
    requireAdminPage.mockResolvedValue(admin('STAFF'));
    const html = renderToStaticMarkup(await CustomerDataPage());
    expect(html).toContain('réservée au compte propriétaire');
    expect(html).not.toContain('<form');
  });
});

describe('entrée « Données clients » dans l’en-tête du back-office', () => {
  it('visible pour le propriétaire seulement', async () => {
    requireAdminPage.mockResolvedValue(admin('OWNER'));
    expect(renderToStaticMarkup(await ProtectedAdminLayout({ children: null }))).toContain('href="/admin/donnees-clients"');
    requireAdminPage.mockResolvedValue(admin('STAFF'));
    expect(renderToStaticMarkup(await ProtectedAdminLayout({ children: null }))).not.toContain('/admin/donnees-clients');
  });
});
