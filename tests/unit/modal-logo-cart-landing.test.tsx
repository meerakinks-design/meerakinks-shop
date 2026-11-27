import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LANDING } from '@/content/landing';
import { emptyZones } from '@/lib/shop/zones';

// Retouches du 25 novembre 2026 : logo à gauche du menu et du panier, corbeille par produit, CTA allégé,
// un seul fond (celui du héros) du héros jusqu'au CTA, et plus aucun feston ni vague (vitrine et back-office).
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
const { FinalCta, Hero, Why } = await import('@/components/shop/LandingSections');

const root = path.resolve(__dirname, '../..');
const read = (file: string) => readFileSync(path.resolve(root, file), 'utf-8');
const wrap = (node: React.ReactNode) => renderToString(<CartProvider>{node}</CartProvider>);
const plain = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

describe('menu et panier : le logo est à gauche de l’en-tête, le ✕ à droite', () => {
  const menu = wrap(<MenuModal storeName="Awa Beauty" showCollections showContact socials={[]} />);
  const cart = wrap(<CartModal depositAmount={2000} storeName="Awa Beauty" />);

  for (const [name, html] of [['menu', menu], ['panier', cart]] as const) {
    it(`${name} : logo de la marque avant le bouton de fermeture`, () => {
      expect(html).toContain('class="curtain-logo"');
      expect(html).toContain('logo-meera-kinks');
      expect(html.indexOf('class="curtain-logo"')).toBeLessThan(html.indexOf('class="curtain-close"'));
      expect(html).toContain('alt="Awa Beauty"');
    });
  }

  it('le titre reste dans le HTML (nom accessible du panier) mais n’est plus affiché', () => {
    expect(cart).toContain('curtain-title visually-hidden');
    expect(plain(cart)).toContain('Votre panier');
  });

  it('commande et confirmation gardent leur titre : pas de logo', () => {
    const checkout = wrap(<CheckoutModal depositAmount={2000} zones={emptyZones()} />);
    const confirmation = wrap(<ConfirmationModal depositAmount={2000} storeName="Awa Beauty" />);
    expect(checkout).not.toContain('curtain-logo');
    expect(confirmation).not.toContain('curtain-logo');
  });
});

describe('panier : une corbeille sur chaque produit', () => {
  const source = read('src/components/shop/CartModal.tsx');

  it('chaque ligne a un bouton corbeille nommé pour les lecteurs d’écran, qui retire le produit', () => {
    expect(source).toContain('className="cart-trash"');
    expect(source).toContain('aria-label={`Retirer ${line.name} du panier`}');
    expect(source).toContain('onClick={() => remove(line.productId)}');
  });

  it('l’ancien lien texte « Retirer » n’existe plus', () => {
    expect(source).not.toContain('cart-remove');
    expect(read('src/styles/shop.css')).not.toContain('.cart-remove');
  });

  it('la corbeille garde une zone tactile de 44 px, et la barre de commande est sombre (réf. Bucks)', () => {
    const css = read('src/styles/shop.css');
    const trash = css.split('\n').find((line) => line.startsWith('.cart-trash {')) ?? '';
    expect(trash).toContain('width: 2.75rem');
    expect(trash).toContain('height: 2.75rem');
    const bar = css.split('\n').find((line) => line.startsWith('.cart-checkout-bar {')) ?? '';
    expect(bar).toContain('--color-brown-deep');
  });
});

describe('CTA final : titre, texte, bouton et lien seulement', () => {
  it('plus de trois points ni de note sous le bouton', () => {
    const html = renderToStaticMarkup(<FinalCta />);
    expect(html).toContain('cta-btn');
    expect(html).toContain('cta-link');
    expect(html).not.toContain('cta-checks');
    expect(html).not.toContain('cta-note');
    expect(plain(html)).not.toContain('Des soins classés par besoin');
    expect(plain(html)).not.toContain('Une question avant de commander');
  });

  it('les textes retirés ne sont plus dans le contenu, ni dans les styles ; la scène 3D (et son animation des trois points) n’existe plus', () => {
    expect(Object.keys(LANDING.finalCta)).not.toContain('checks');
    expect(Object.keys(LANDING.finalCta)).not.toContain('note');
    expect(existsSync(path.resolve(root, 'src/lib/stage/engine.ts'))).toBe(false); // retirée avec la scène 3D (maj3)
    expect(read('src/styles/stage.css')).not.toContain('cta-checks');
  });
});

describe('du héros au CTA : un seul fond, celui du héros', () => {
  it('la section « guide » n’est plus un aplat orange, Instagram et Contact ne sont plus teintés', () => {
    expect(renderToStaticMarkup(<Why storeName="Awa Beauty" />)).not.toContain('section-brand');
    const source = read('src/components/shop/LandingSections.tsx');
    expect(source).not.toContain('section-tinted');
    expect(read('src/styles/shop.css')).not.toContain('.section-tinted');
  });

  it('le bandeau défilant n’a plus d’aplat de couleur', () => {
    const rule = read('src/styles/shop.css').split('\n').find((line) => line.startsWith('.marquee {')) ?? '';
    expect(rule).not.toMatch(/background/);
  });
});

describe('plus de festons ni de vague', () => {
  it('héros : plus de vague sous l’affiche', () => {
    expect(renderToStaticMarkup(<Hero showCollections={false} iconSrc="/brand/favicon-icon.png" />)).not.toContain('hero-wave');
    expect(read('src/styles/ui.css')).not.toContain('.hero-wave');
  });

  it('pied de page : plus de feston', () => {
    expect(read('src/components/shop/Footer.tsx')).not.toContain('footer-scallop');
    expect(read('src/styles/ui.css')).not.toContain('footer-scallop');
  });

  it('back-office : plus de festons sous la barre du haut ni sur le bord du menu latéral', () => {
    const css = read('src/styles/admin.css');
    expect(css).not.toContain('admin-side-edge');
    expect(css).not.toContain('.admin-topbar::after');
    expect(css).not.toMatch(/radial-gradient\(circle at (50% 0|0 50%)/);
    expect(read('src/app/admin/(protege)/layout.tsx')).not.toContain('admin-side-edge');
  });
});
