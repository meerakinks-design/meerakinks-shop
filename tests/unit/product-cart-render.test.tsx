import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PRODUCT_BADGES } from '@/content/product-page';
import { formatFcfa } from '@/lib/money';
import type { OrderCreated } from '@/lib/shop/order-types';

// Rendu serveur de la fiche produit (galerie, achat, pastilles), du panier et du reçu, sans base ni navigateur.
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...(rest as object)}>
      {children}
    </a>
  ),
}));

const { CartProvider } = await import('@/components/shop/CartProvider');
const { CartModal } = await import('@/components/shop/CartModal');
const { Header } = await import('@/components/shop/Header');
const { ProductGallery } = await import('@/components/shop/ProductGallery');
const { ProductPurchase } = await import('@/components/shop/ProductPurchase');
const { ProductBadges } = await import('@/components/shop/ProductBadges');
const { OrderConfirmation } = await import('@/components/shop/OrderConfirmation');

const image = (id: string) => ({ url: `https://res.cloudinary.com/demo/image/upload/v1/boutique/products/${id}.jpg`, alt: `Photo ${id}` });
const wrap = (node: React.ReactNode) => renderToString(<CartProvider>{node}</CartProvider>);

describe('galerie de la fiche produit', () => {
  it('plusieurs photos : carrousel balayable, flèches et pastilles de position', () => {
    const html = renderToStaticMarkup(<ProductGallery images={[image('a'), image('b'), image('c')]} name="Sérum éclat" />);
    expect(html).toContain('aria-roledescription="carrousel"');
    expect(html.match(/class="gallery-slide"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Photo précédente"');
    expect(html).toContain('aria-label="Photo suivante"');
    expect(html.match(/class="gallery-dot"/g)).toHaveLength(3);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
  });

  it('la première photo est chargée en priorité, les autres en différé', () => {
    const html = renderToStaticMarkup(<ProductGallery images={[image('a'), image('b')]} name="Sérum éclat" />);
    expect(html.match(/loading="eager"/g)).toHaveLength(1);
    expect(html.match(/loading="lazy"/g)).toHaveLength(1);
  });

  it('une seule photo : ni flèches ni pastilles ; aucune photo : emplacement « Photo à venir »', () => {
    const one = renderToStaticMarkup(<ProductGallery images={[image('a')]} name="Sérum éclat" />);
    expect(one).not.toContain('gallery-arrow');
    expect(one).not.toContain('gallery-dot');
    expect(renderToStaticMarkup(<ProductGallery images={[]} name="Sérum éclat" />)).toContain('Photo à venir');
  });
});

describe('achat sur la fiche produit', () => {
  const html = wrap(<ProductPurchase product={{ id: 'p1', name: 'Sérum éclat', price: 10000, stock: null }} />);

  it('ligne de quantité, grand bouton avec le prix à droite', () => {
    expect(html).toContain('Quantité');
    expect(html).toContain('Ajouter au panier');
    expect(html).toContain('purchase-add-price');
    expect(html).toContain(formatFcfa(10000));
  });

  it('barre collée en bas : masquée au départ (inaccessible au clavier et aux lecteurs d’écran)', () => {
    expect(html).toContain('class="sticky-buy"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('tabindex="-1"');
  });

  it('barre collée désactivée (produit mis en avant de la landing) : le bouton principal reste, la barre n’existe pas', () => {
    const out = wrap(<ProductPurchase product={{ id: 'p3', name: 'Crème', price: 6900, stock: 5 }} stickyBar={false} />);
    expect(out).toContain('purchase-add');
    expect(out).not.toContain('sticky-buy');
  });

  it('produit épuisé : message, ni bouton ni barre', () => {
    const out = wrap(<ProductPurchase product={{ id: 'p2', name: 'Savon noir', price: 4000, stock: 0 }} />);
    expect(out).toContain('épuisé');
    expect(out).not.toContain('purchase-add');
    expect(out).not.toContain('sticky-buy');
  });
});

describe('pastilles de réassurance', () => {
  it('une pastille par règle validée, sans promesse inventée', () => {
    const html = renderToStaticMarkup(<ProductBadges />);
    expect(html.match(/<li>/g)).toHaveLength(PRODUCT_BADGES.length);
    expect(html).toContain('Confirmation sur WhatsApp');
    const text = html.toLowerCase();
    for (const invented of ['garantie', 'sous 24', 'gratuit', 'remboursé', 'satisfait']) expect(text).not.toContain(invented);
  });
});

describe('en-tête mobile', () => {
  const html = wrap(<Header storeName="Awa Beauty" showCollections showContact />);
  it('logo à gauche ; panier et hamburger à droite, en icônes', () => {
    expect(html.indexOf('class="brand"')).toBeLessThan(html.indexOf('class="cart-button"'));
    expect(html.indexOf('class="cart-button"')).toBeLessThan(html.indexOf('class="menu-toggle"'));
    expect(html).toContain('M4 7h16M4 12h16M4 17h16'); // hamburger
    expect(html).not.toContain('☰');
  });
});

describe('panier (feuille)', () => {
  it('panier vide : message et lien vers la boutique, pas de pied de commande', () => {
    const html = wrap(<CartModal depositAmount={2000} />);
    expect(html).toContain('modal-cart');
    expect(html).toContain('Votre panier est vide.');
    expect(html).not.toContain('cart-checkout');
  });
});

describe('page de confirmation : reçu façon ticket', () => {
  const created = (overrides: Partial<OrderCreated> = {}): OrderCreated => ({
    reference: 'CMD-7K3M9QXP',
    zoneType: 'ABIDJAN',
    placeLabel: 'Cocody (Abidjan)',
    lines: [{ name: 'Sérum éclat', quantity: 2, unitPrice: 10000, lineTotal: 20000 }],
    subtotal: 20000,
    deliveryFee: null,
    total: null,
    upfrontAmount: 2000,
    whatsappUrl: 'https://wa.me/2250102030405?text=Bonjour',
    ...overrides,
  });

  it('affiche l’imprimante, le statut et le bouton de téléchargement du reçu (désactivé tant que l’image n’est pas prête)', () => {
    const html = renderToStaticMarkup(<OrderConfirmation order={created()} depositAmount={2000} storeName="Awa Beauty" />);
    expect(html).toContain('aria-label="Votre reçu de commande"');
    expect(html).toContain('data-stage="processing"');
    expect(html).toContain('Préparation de votre reçu');
    expect(html).toContain('Télécharger mon reçu (PNG)');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Télécharger mon reçu \(PNG\)/);
  });

  it('le lien WhatsApp (nom, téléphone) n’est pas transmis au composant du reçu et le bouton WhatsApp reste le seul CTA principal', () => {
    const html = renderToStaticMarkup(<OrderConfirmation order={created()} depositAmount={2000} />);
    expect(html.match(/wa\.me/g)).toHaveLength(1);
    expect(html.match(/class="btn btn-block"/g)).toHaveLength(1);
  });

  it('commande sans ligne (leurre anti-robot) : pas de reçu', () => {
    const html = renderToStaticMarkup(<OrderConfirmation order={created({ lines: [] })} depositAmount={2000} />);
    expect(html).not.toContain('receipt-printer');
  });

  it('ne présente jamais un paiement comme reçu (RM-10)', () => {
    const html = renderToStaticMarkup(<OrderConfirmation order={created()} depositAmount={2000} />).toLowerCase();
    for (const forbidden of ['payée', 'paiement reçu', 'paiement confirmé']) expect(html).not.toContain(forbidden);
  });
});
