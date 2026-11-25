import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PublicSettings } from '@/server/services/catalog.queries';
import { buildShopLayout, type ShopCategory, type ShopProduct } from '@/lib/shop/sections';

// Rendu serveur RÉEL des composants de la vitrine, avec des données d'exemple (aucune base nécessaire).
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...(rest as object)}>
      {children}
    </a>
  ),
}));

const { CartProvider } = await import('@/components/shop/CartProvider');
const { CategorySections } = await import('@/components/shop/CategorySections');
const { ShopGrid } = await import('@/components/shop/ShopGrid');
const { ProductCard } = await import('@/components/shop/ProductCard');
const { Header } = await import('@/components/shop/Header');
const { MenuModal } = await import('@/components/shop/MenuModal');
const { Collections, Contact, Instagram, Reviews, Faq, Hero, Focus } = await import('@/components/shop/LandingSections');

const image = (id: string) => ({ url: `https://res.cloudinary.com/demo/image/upload/v1/boutique/products/${id}.jpg`, alt: `Photo ${id}` });
const product = (id: string, overrides: Partial<ShopProduct> = {}): ShopProduct => ({
  id, slug: `slug-${id}`, name: `Produit ${id}`, price: 5000, salePrice: null, stock: null, isNew: false, image: image(id), category: null, ...overrides,
});
const category = (id: string, position: number, accentColor: string | null = null): ShopCategory => ({
  id, name: `Catégorie ${id}`, slug: `cat-${id}`, description: null, accentColor, position,
});
const settings = (overrides: Partial<PublicSettings> = {}): PublicSettings => ({
  storeName: 'Awa Beauty', whatsappNumber: null, whatsappLink: null, contactEmail: null, contactPhone: null,
  instagramUrl: null, tiktokUrl: null, facebookUrl: null, focusProductId: null, depositAmount: 2000, ...overrides,
});
const wrap = (node: React.ReactNode) => renderToString(<CartProvider>{node}</CartProvider>);
/** Texte visible : balises retirées (l'effet « spaghetti » découpe les textes en éléments). */
const plain = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

describe('mode A — sections sticky par catégorie avec carrousel', () => {
  const layout = buildShopLayout(
    [category('a', 1, '#f2c94c'), category('b', 2, '#7a3f98')],
    [product('1', { category: { id: 'a', name: 'Catégorie a', slug: 'cat-a' } }), product('2', { category: { id: 'a', name: 'Catégorie a', slug: 'cat-a' } }), product('3', { category: { id: 'b', name: 'Catégorie b', slug: 'cat-b' } })],
  );
  if (layout.mode !== 'categories') throw new Error('mode attendu : categories');
  const html = wrap(<CategorySections sections={layout.sections} />);

  it('rend une section par catégorie avec sa couleur et un texte lisible', () => {
    expect(html.match(/class="category-section"/g)).toHaveLength(2);
    expect(html).toContain('--section-bg:#f2c94c');
    expect(html).toContain('--section-fg:#000000');
    expect(html).toContain('--section-bg:#7a3f98');
    expect(html).toContain('--section-fg:#ffffff');
  });
  it('affiche un carrousel de pastilles : une par produit, la première sélectionnée', () => {
    expect(html.match(/class="pill"/g)).toHaveLength(3);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2); // une par section
    expect(html).toContain('Produits précédents de Catégorie a');
    expect(html).toContain('Produits suivants de Catégorie a');
  });
  it('montre le gros visuel du produit sélectionné, avec les liens vers sa fiche et sa catégorie', () => {
    expect(html).toContain('href="/produit/slug-1"');
    expect(html).toContain('href="/categorie/cat-a"');
    expect(html).toContain('Voir toute la catégorie');
    expect(html).toContain('aria-label="Ajouter Produit 1 au panier"');
  });
  it('est identique à chaque rendu (pas d’erreur d’hydratation)', () => {
    expect(wrap(<CategorySections sections={layout.sections} />)).toBe(html);
  });
});

describe('mode B — grille asymétrique', () => {
  const products = Array.from({ length: 12 }, (_, index) => product(`p${index}`));
  const html = wrap(<ShopGrid products={products} />);

  it('rend tous les produits, avec des tailles et décalages variés', () => {
    expect(html.match(/class="grid-cell /g)).toHaveLength(12);
    expect(new Set(html.match(/size-(small|medium|large)/g)).size).toBeGreaterThan(1);
    expect(new Set(html.match(/offset-[012]/g)).size).toBeGreaterThan(1);
  });
  it('est STABLE : deux rendus donnent exactement le même HTML', () => {
    expect(wrap(<ShopGrid products={products} />)).toBe(html);
  });
  it('garde l’ordre choisi par la vendeuse', () => {
    const order = [...html.matchAll(/href="\/produit\/(slug-p\d+)"/g)].map((match) => match[1]);
    const unique = [...new Set(order)];
    expect(unique).toEqual(products.map((item) => item.slug));
  });
  it('la variante régulière (pages triées ou filtrées) n’a aucune classe de disposition', () => {
    const uniform = wrap(<ShopGrid products={products} uniform />);
    expect(uniform).toContain('uniform-grid');
    expect(uniform).not.toContain('grid-cell');
  });
});

describe('carte produit', () => {
  it('affiche le prix promotionnel avec l’ancien prix barré, le badge Nouveau et le bouton d’ajout', () => {
    const html = wrap(<ProductCard product={product('1', { price: 5000, salePrice: 4000, isNew: true })} />);
    expect(html).toMatch(/4[\s\u202f\u00a0]000 FCFA/);
    expect(html).toContain('<s ');
    expect(html).toContain('Ancien prix');
    expect(html).toContain('badge-new');
    expect(html).toContain('card-add');
    expect(html).toContain('href="/produit/slug-1"');
  });
  it('un produit épuisé affiche « Épuisé » et n’a aucun bouton d’ajout', () => {
    const html = wrap(<ProductCard product={product('1', { stock: 0 })} />);
    expect(html).toContain('badge-out');
    expect(html).toContain('Épuisé');
    expect(html).not.toContain('card-add');
  });
  it('affiche la catégorie sous forme de point + nom quand on le demande', () => {
    const html = wrap(<ProductCard showCategory product={product('1', { category: { id: 'a', name: 'Accessoires', slug: 'accessoires' } })} />);
    expect(html).toContain('Accessoires');
    expect(html).toContain('class="dot"');
  });
  it('une photo absente donne un espace réservé accessible, pas une image cassée', () => {
    const html = wrap(<ProductCard product={product('1', { image: null })} />);
    expect(html).toContain('img-placeholder');
    expect(html).toContain('Photo à venir');
  });
  it('les images Cloudinary sont demandées en 4:5, format et qualité automatiques', () => {
    const html = wrap(<ProductCard product={product('1')} />);
    expect(html).toContain('c_fill,ar_4:5,w_');
    expect(html).toContain('f_auto,q_auto');
  });
});

describe('en-tête et panier', () => {
  const html = wrap(<Header storeName="Awa Beauty" />);
  it('affiche le logo à gauche, le bouton Commander, le panier (nom accessible complet) et le bouton menu', () => {
    expect(html).toContain('Awa Beauty');
    expect(html).toContain('href="/#boutique"');
    expect(html).toContain('href="#panier"');
    expect(html).toContain('href="#menu"');
    expect(html).toContain('aria-label="Panier : vide"');
    expect(html).toContain('aria-label="Ouvrir le menu"');
    expect(html.indexOf('class="brand"')).toBeLessThan(html.indexOf('class="header-shop"'));
    expect(html.indexOf('class="header-shop"')).toBeLessThan(html.indexOf('cart-button'));
    expect(html.indexOf('cart-button')).toBeLessThan(html.indexOf('menu-toggle'));
  });
  it('panier vide : ni badge ni montant', () => {
    expect(html).not.toContain('cart-badge');
    expect(html).not.toContain('cart-total');
  });
  it('aucune navigation en ligne : tout le reste passe par le menu en modal', () => {
    expect(html).not.toContain('main-nav');
    expect(html).not.toContain('/#collections');
    expect(html).not.toContain('notre-histoire');
  });
});

describe('menu en modal', () => {
  const socials = [
    { name: 'whatsapp' as const, label: 'WhatsApp', href: 'https://wa.me/2250700000000' },
    { name: 'instagram' as const, label: 'Instagram', href: 'https://instagram.com/awa' },
    { name: 'tiktok' as const, label: 'TikTok', href: 'https://tiktok.com/@awa' },
    { name: 'facebook' as const, label: 'Facebook', href: 'https://facebook.com/awa' },
  ];
  it('liste Boutique, Notre histoire et Mon panier, et le contrôle de fermeture', () => {
    const html = wrap(<MenuModal storeName="Awa Beauty" showCollections={false} showContact={false} socials={[]} />);
    expect(html).toContain('<dialog');
    expect(html).toContain('aria-label="Menu"');
    expect(html).toContain('href="/#boutique"');
    expect(html).toContain('href="/a-propos"'); // « Notre histoire » est une page dédiée, plus un modal
    expect(html).toContain('href="#panier"');
    expect(html).toContain('aria-label="Fermer le menu"');
  });
  it('n’affiche aucun lien mort : « Collections » et « Contact » disparaissent quand leur section n’existe pas', () => {
    const bare = wrap(<MenuModal storeName="Awa Beauty" showCollections={false} showContact={false} socials={[]} />);
    expect(bare).not.toContain('href="/#collections"');
    expect(bare).not.toContain('href="/#contact"');
    const full = wrap(<MenuModal storeName="Awa Beauty" showCollections showContact socials={[]} />);
    expect(full).toContain('href="/#collections"');
    expect(full).toContain('href="/#contact"');
  });
  it('réseaux sociaux : seulement ceux configurés, dans un nouvel onglet sans fuite de référent', () => {
    expect(wrap(<MenuModal storeName="Awa Beauty" showCollections showContact socials={[]} />)).not.toContain('menu-socials');
    const html = wrap(<MenuModal storeName="Awa Beauty" showCollections showContact socials={socials} />);
    expect(html).toContain('href="https://instagram.com/awa"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it('pied du menu : les icônes WhatsApp, Instagram, TikTok et Facebook, nommées pour les lecteurs d’écran', () => {
    const html = wrap(<MenuModal storeName="Awa Beauty" showCollections showContact socials={socials} />);
    for (const label of ['WhatsApp', 'Instagram', 'TikTok', 'Facebook']) expect(html).toContain(`aria-label="${label}"`);
    expect(html.match(/class="menu-social"/g)).toHaveLength(4);
    // les icônes sont des pictogrammes (svg), pas du texte : plus de libellé visible dans les liens
    expect(html).not.toMatch(/<span>(WhatsApp|Instagram|TikTok|Facebook)<\/span>/);
  });
});

describe('sections de la landing', () => {
  it('Hero : le lien vers les collections n’existe que si la section existe', () => {
    expect(renderToStaticMarkup(<Hero showCollections iconSrc="/brand/favicon-icon.png" />)).toContain('href="/#collections"');
    const without = renderToStaticMarkup(<Hero showCollections={false} iconSrc="/brand/favicon-icon.png" />);
    expect(without).not.toContain('/#collections');
    expect(without).toContain('href="/#boutique"');
  });

  it('Hero : titre en deux temps (slogan de la charte), badge qui tourne, et l’affiche des soins à droite', () => {
    const html = renderToStaticMarkup(<Hero showCollections={false} iconSrc="/brand/favicon-icon.png" />);
    expect(html).toContain('hero-title-main');
    expect(html).toContain('hero-title-script');
    expect(html).toContain('aria-label="Vos kinks méritent le meilleur de votre routine."'); // titre complet pour les lecteurs d'écran et le référencement
    expect(html).toContain('Un besoin, une couleur.'); // phrase de réassurance, sous les boutons
    expect(html).toContain('class="hero-badge"');
    expect(html).toContain('src="/stage/hero2.webp"');
    expect(html).toContain('data-stage-anchor="hero"'); // repère du pot Fluffy Kinks 3D (ScrollStage)
    expect(html).not.toContain('hero-lead'); // aucune description sous le titre du héros
    expect(html).not.toContain('hero-main');
  });

  it('Hero : l’affiche remplace le disque et les produits flottants ; ses produits ne dépendent plus du catalogue', () => {
    const html = renderToStaticMarkup(<Hero showCollections iconSrc="/brand/favicon-icon.png" />);
    expect(html).toContain('class="hero-poster-img"');
    expect(html).not.toContain('hero-float');
    expect(html).not.toContain('class="hero-icon"');
  });

  it('Collections : une carte par catégorie vers /categorie/[slug], et « Offres » comme raccourci de la boutique', () => {
    const layout = buildShopLayout([category('a', 1)], [product('1', { category: { id: 'a', name: 'Catégorie a', slug: 'cat-a' } })]);
    if (layout.mode !== 'categories') throw new Error('mode attendu : categories');
    const html = renderToStaticMarkup(<Collections sections={layout.sections} hasOffers />);
    expect(html).toContain('href="/categorie/cat-a"');
    expect(html).toContain('href="/?filtre=offres#boutique"');
    expect(renderToStaticMarkup(<Collections sections={layout.sections} hasOffers={false} />)).not.toContain('filtre=offres');
  });

  it('Avis : au lancement, seulement l’invitation (aucune carte, aucune étoile)', () => {
    const html = renderToStaticMarkup(<Reviews settings={settings({ whatsappNumber: '+2250700000000', whatsappLink: 'https://wa.me/2250700000000' })} />);
    expect(html).toContain('Vos retours nous font avancer.');
    expect(plain(html)).toContain('Vous avez déjà commandé chez Awa Beauty'); // la description reste un texte fixe, avec le nom de la boutique
    expect(html).not.toContain('review-cards');
    expect(html).not.toContain('★');
    expect(html).toContain('https://wa.me/2250700000000?text=');
    expect(html).toContain('Partager mon expérience');
  });
  it('Avis : sans WhatsApp configuré, pas de bouton cassé', () => {
    expect(renderToStaticMarkup(<Reviews settings={settings()} />)).not.toContain('Partager mon expérience');
  });

  it('Instagram : section non affichée sous 4 publications', () => {
    expect(renderToStaticMarkup(<Instagram settings={settings()} />)).toBe('');
  });

  it('Contact : le formulaire est toujours là (Resend) ; seules les coordonnées qui existent s’y ajoutent', () => {
    const bare = renderToStaticMarkup(<Contact settings={settings()} />);
    expect(bare).toContain('id="contact"');
    expect(bare).toContain('contact-form');
    expect(bare).not.toContain('mailto:');
    const html = renderToStaticMarkup(<Contact settings={settings({ whatsappNumber: '+2250700000000', whatsappLink: 'https://wa.me/2250700000000', contactEmail: 'bonjour@awa.ci', instagramUrl: 'https://instagram.com/awa' })} />);
    expect(html).toContain('id="contact"');
    expect(html).toContain('mailto:bonjour@awa.ci');
    expect(html).toContain('Instagram');
    expect(html).not.toContain('TikTok');
    expect(html).not.toContain('Facebook');
  });

  it('FAQ : neuf questions repliables, données structurées échappées et acompte venu des paramètres', () => {
    const html = renderToStaticMarkup(<Faq settings={settings({ depositAmount: 3500 })} />);
    expect(html.match(/<details/g)).toHaveLength(9);
    expect(html).toContain('id="faq"');
    expect(html).toContain('FAQPage');
    expect(html.replace(/[\s\u202f\u00a0]/g, ' ')).toContain('3 500 FCFA');
    expect(html).not.toContain('2 000 FCFA');
    expect(html).not.toMatch(/<script[^>]*>[^<]*<[^/]/); // rien de non échappé dans le JSON-LD
  });
});

describe('produit mis en avant de la landing', () => {
  it('pas de barre d’achat collée : elle est prévue pour la fiche produit seulement (cahier §4.3)', () => {
    const html = wrap(<Focus product={{ ...product('f1', { price: 8000 }), description: 'Une crème douce.', characteristics: ['Pot de 50 ml'], usageAdvice: null }} />);
    expect(html).toContain('purchase-add');
    expect(html).not.toContain('sticky-buy');
  });
});

describe('loader d’entrée et transition de page', () => {
  it('le serveur ne rend jamais le loader : le contenu est dans le HTML (référencement, accessibilité, pas de décalage d’hydratation)', async () => {
    const { IntroLoader } = await import('@/components/shop/IntroLoader');
    expect(renderToStaticMarkup(<IntroLoader logoSrc="/l.png" iconSrc="/i.png" storeName="Awa Beauty" />)).toBe('');
  });
  it('le calque de transition est un canvas masqué aux lecteurs d’écran, sans effet sur les clics', async () => {
    const { PageTransition } = await import('@/components/shop/PageTransition');
    const html = renderToStaticMarkup(<PageTransition />);
    expect(html).toContain('<canvas');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('class="page-transition"');
  });
});
