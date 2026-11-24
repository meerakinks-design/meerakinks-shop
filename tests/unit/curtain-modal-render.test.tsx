import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { emptyZones } from '@/lib/shop/zones';

// Menu, panier, commande et confirmation : UN SEUL mécanisme « rideaux » qui entre par la droite.
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...(rest as object)}>
      {children}
    </a>
  ),
}));

const { CartProvider } = await import('@/components/shop/CartProvider');
const { MenuModal } = await import('@/components/shop/MenuModal');
const { CartModal } = await import('@/components/shop/CartModal');
const { CheckoutModal } = await import('@/components/shop/CheckoutModal');
const { ConfirmationModal } = await import('@/components/shop/ConfirmationModal');
const { OrderConfirmation } = await import('@/components/shop/OrderConfirmation');

const wrap = (node: React.ReactNode) => renderToString(<CartProvider>{node}</CartProvider>);
const modals = {
  menu: wrap(<MenuModal storeName="Awa Beauty" showCollections showContact socials={[]} />),
  cart: wrap(<CartModal depositAmount={2000} />),
  checkout: wrap(<CheckoutModal depositAmount={2000} zones={emptyZones()} />),
  confirmation: wrap(<ConfirmationModal depositAmount={2000} storeName="Awa Beauty" />),
};

describe('modals à rideaux (même mécanisme partout)', () => {
  for (const [name, html] of Object.entries(modals)) {
    it(`${name} : <dialog> natif, deux rideaux de couleur, panneau, en-tête et bouton de fermeture`, () => {
      expect(html).toContain('<dialog');
      expect(html).toContain('curtain-dialog');
      expect(html).toContain('curtain-layer-1');
      expect(html).toContain('curtain-layer-2');
      expect(html).toContain('curtain-panel');
      expect(html).toContain('curtain-head');
      expect(html).toContain('class="curtain-close"');
    });
  }

  it('chaque modal garde son nom accessible et sa fermeture', () => {
    expect(modals.menu).toContain('aria-label="Menu"');
    expect(modals.menu).toContain('aria-label="Fermer le menu"');
    expect(modals.cart).toContain('Votre panier');
    expect(modals.cart).toContain('aria-label="Fermer le panier"');
    expect(modals.confirmation).toContain('aria-label="Fermer la confirmation"');
  });

  it('les rideaux sont décoratifs (cachés des lecteurs d’écran)', () => {
    expect(modals.menu).toContain('curtain-layer curtain-layer-1" aria-hidden="true"');
  });

  it('confirmation : rien n’est monté avant la première ouverture (le reçu ne s’imprime pas en arrière-plan)', () => {
    expect(modals.confirmation).toContain('modal-confirmation');
    expect(modals.confirmation).not.toContain('order-confirmation');
    expect(modals.confirmation).not.toContain('receipt');
  });

  it('le menu mène à la page « À propos » ; le panier ouvre le modal du panier', () => {
    expect(modals.menu).toContain('href="/a-propos"');
    expect(modals.menu).toContain('href="#panier"');
  });
});

describe('confirmation de commande : même contenu en page et en modal', () => {
  const order = {
    reference: 'CMD-7K3M9QXP',
    zoneType: 'ABIDJAN' as const,
    placeLabel: 'Cocody (Abidjan)',
    lines: [{ name: 'Sérum éclat', quantity: 1, unitPrice: 10000, lineTotal: 10000 }],
    subtotal: 10000,
    deliveryFee: null,
    total: null,
    upfrontAmount: 2000,
    whatsappUrl: 'https://wa.me/2250102030405?text=Bonjour',
  };
  it('page : titre h1 ; modal : pas de second titre (celui du modal fait foi)', () => {
    const page = renderToString(<OrderConfirmation order={order} depositAmount={2000} />);
    const inModal = renderToString(<OrderConfirmation order={order} depositAmount={2000} variant="modal" />);
    expect(page).toContain('<h1>');
    expect(inModal).not.toContain('<h1');
    expect(inModal).toContain('is-modal');
    for (const html of [page, inModal]) {
      expect(html).toContain('CMD-7K3M9QXP');
      expect(html).toContain('Envoyer ma commande sur WhatsApp');
    }
  });
});

describe('plus de modal « Notre histoire »', () => {
  it('le composant et le mécanisme historique n’existent plus ; l’ancre de la confirmation existe', () => {
    const layout = readFileSync(path.resolve(__dirname, '../../src/app/(boutique)/layout.tsx'), 'utf-8');
    expect(layout).not.toContain('HistoryModal');
    expect(layout).toContain('ConfirmationModal');
  });
});
