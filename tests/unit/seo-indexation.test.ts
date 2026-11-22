import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { serializeJsonLd } from '@/lib/shop/json-ld';
import { buildProductJsonLd, type ProductJsonLdInput } from '@/lib/shop/product-json-ld';
import { googleVerificationToken, siteBaseUrl } from '@/lib/shop/seo';

// SEO et indexation (cahier §11) : ce qui ne dépend pas d'un navigateur ni de la base.

const { listSitemapEntries } = vi.hoisted(() => ({ listSitemapEntries: vi.fn() }));
vi.mock('@/server/services/catalog.queries', () => ({
  listSitemapEntries,
  listActiveCategories: vi.fn(async () => []),
  listShopProducts: vi.fn(async () => []),
}));
vi.mock('@/server/auth/session', () => ({ getCurrentAdmin: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn(), usePathname: () => '/', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ children }: { children: React.ReactNode }) => children }));

const { default: sitemap } = await import('@/app/sitemap');
const { default: robots } = await import('@/app/robots');
const { generateMetadata: shopMetadata } = await import('@/app/(boutique)/boutique/page');
const { metadata: categoriesMetadata } = await import('@/app/(boutique)/categories/page');
const { metadata: cgvMetadata } = await import('@/app/(boutique)/cgv/page');
const { metadata: cguMetadata } = await import('@/app/(boutique)/cgu/page');
const { metadata: legalNoticeMetadata } = await import('@/app/(boutique)/mentions-legales/page');
const { metadata: cookiesMetadata } = await import('@/app/(boutique)/cookies/page');
const { metadata: adminLoginMetadata } = await import('@/app/admin/login/page');

beforeEach(() => {
  vi.clearAllMocks();
  listSitemapEntries.mockResolvedValue({
    products: [{ slug: 'beurre-de-karite', updatedAt: new Date('2026-11-01T10:00:00Z') }],
    categories: [{ slug: 'soins' }],
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('siteBaseUrl', () => {
  it('adresse configurée : sans « / » final', () => {
    expect(siteBaseUrl('https://boutique.ci', 'production')).toBe('https://boutique.ci');
    expect(siteBaseUrl('https://boutique.ci///', 'production')).toBe('https://boutique.ci');
  });

  it('production sans adresse : null (jamais d’adresse locale publiée)', () => {
    expect(siteBaseUrl(undefined, 'production')).toBeNull();
    expect(siteBaseUrl('', 'production')).toBeNull();
  });

  it('hors production : repli local pour tester', () => {
    expect(siteBaseUrl(undefined, 'development')).toBe('http://localhost:3000');
    expect(siteBaseUrl(undefined, 'test')).toBe('http://localhost:3000');
  });
});

describe('sitemap.xml', () => {
  it('liste accueil, boutique, catégories, catégories actives et produits publiés, en adresses absolues', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://boutique.ci/');
    const entries = await sitemap();
    expect(entries.map((entry) => entry.url)).toEqual([
      'https://boutique.ci/',
      'https://boutique.ci/boutique',
      'https://boutique.ci/categories',
      'https://boutique.ci/categorie/soins',
      'https://boutique.ci/produit/beurre-de-karite',
    ]);
    expect(entries[4]?.lastModified).toEqual(new Date('2026-11-01T10:00:00Z'));
  });

  it('ne contient ni le back-office, ni la commande, ni les pages légales encore provisoires', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://boutique.ci');
    const urls = (await sitemap()).map((entry) => entry.url).join('\n');
    for (const hidden of ['/admin', '/api', '/commande', '/cookies', '/cgv', '/cgu', '/mentions-legales', '/politique-de-confidentialite']) {
      expect(urls).not.toContain(hidden);
    }
  });

  it('production sans adresse de site : vide (pas d’adresses locales)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(await sitemap()).toEqual([]);
    expect(listSitemapEntries).not.toHaveBeenCalled();
  });
});

describe('robots.txt', () => {
  it('bloque le back-office, l’API et la confirmation ; annonce le sitemap', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://boutique.ci');
    const result = robots();
    expect(result.rules).toEqual([{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/commande/'] }]);
    expect(result.sitemap).toBe('https://boutique.ci/sitemap.xml');
  });

  it('production sans adresse de site : aucune ligne Sitemap', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(robots()).not.toHaveProperty('sitemap');
  });
});

describe('/boutique : pas de contenu dupliqué', () => {
  it('catalogue complet : canonique /boutique, indexable', () => {
    const metadata = shopMetadata({ searchParams: {} });
    expect(metadata.alternates?.canonical).toBe('/boutique');
    expect(metadata.robots).toBeUndefined();
  });

  it('catégorie, tri ou offres : canonique /boutique (la page « canonique » est le catalogue complet)', () => {
    for (const searchParams of [{ categorie: 'soins' }, { tri: 'prix-croissant' }, { filtre: 'offres' }]) {
      expect(shopMetadata({ searchParams }).alternates?.canonical).toBe('/boutique');
    }
  });

  it('recherche libre : noindex, sans canonique (les deux ensemble se contredisent)', () => {
    const metadata = shopMetadata({ searchParams: { q: 'karité' } });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toBeUndefined();
  });

  it('une recherche vide n’est pas une recherche', () => {
    expect(shopMetadata({ searchParams: { q: '   ' } }).alternates?.canonical).toBe('/boutique');
  });
});

describe('pages non indexées', () => {
  it('pages légales provisoires, cookies et connexion du back-office : noindex', () => {
    for (const metadata of [cgvMetadata, cguMetadata, legalNoticeMetadata, cookiesMetadata, adminLoginMetadata]) {
      expect(metadata.robots).toMatchObject({ index: false });
    }
  });

  it('/categories : titre, description et canonique', () => {
    expect(categoriesMetadata.title).toBe('Catégories');
    expect(String(categoriesMetadata.description).length).toBeGreaterThan(30);
    expect(categoriesMetadata.alternates?.canonical).toBe('/categories');
  });
});

describe('Search Console', () => {
  it('jeton de vérification accepté seulement s’il a la forme attendue', () => {
    expect(googleVerificationToken('abcDEF123_-xyz456')).toBe('abcDEF123_-xyz456');
    expect(googleVerificationToken(undefined)).toBeNull();
    expect(googleVerificationToken('')).toBeNull();
    expect(googleVerificationToken('court')).toBeNull();
    expect(googleVerificationToken('"><script>alert(1)</script>')).toBeNull();
  });
});

describe('données structurées Product', () => {
  const base: ProductJsonLdInput = {
    name: 'Beurre de karité',
    description: 'Un beurre doux.',
    sku: 'BK-001',
    imageUrls: ['https://res.cloudinary.com/x/a.jpg', 'https://res.cloudinary.com/x/b.jpg'],
    url: 'https://boutique.ci/produit/beurre-de-karite',
    price: 4500,
    inStock: true,
  };

  it('sans variante : une seule offre (même forme qu’avant les variantes)', () => {
    expect(buildProductJsonLd(base)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Beurre de karité',
      description: 'Un beurre doux.',
      sku: 'BK-001',
      image: ['https://res.cloudinary.com/x/a.jpg', 'https://res.cloudinary.com/x/b.jpg'],
      url: 'https://boutique.ci/produit/beurre-de-karite',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'XOF',
        price: 4500,
        availability: 'https://schema.org/InStock',
        url: 'https://boutique.ci/produit/beurre-de-karite',
      },
    });
  });

  it('rupture de stock : OutOfStock', () => {
    expect(buildProductJsonLd({ ...base, inStock: false }).offers).toMatchObject({ availability: 'https://schema.org/OutOfStock' });
  });

  it('avec variantes : une offre par variante (prix et disponibilité propres), plus d’offre unique', () => {
    const json = buildProductJsonLd({
      ...base,
      variants: [
        { name: '100 g', price: 2500, inStock: true, sku: 'BK-100' },
        { name: '250 g', price: 4500, inStock: false },
      ],
    });
    expect(json.offers).toEqual([
      { '@type': 'Offer', name: '100 g', sku: 'BK-100', priceCurrency: 'XOF', price: 2500, availability: 'https://schema.org/InStock', url: base.url },
      { '@type': 'Offer', name: '250 g', priceCurrency: 'XOF', price: 4500, availability: 'https://schema.org/OutOfStock', url: base.url },
    ]);
  });

  it('un tableau de variantes vide revient à l’offre unique', () => {
    expect(Array.isArray(buildProductJsonLd({ ...base, variants: [] }).offers)).toBe(false);
  });

  it('adresse du site non configurée : aucun champ url inventé ; sans SKU ni photo : champs absents', () => {
    const json = buildProductJsonLd({ ...base, url: null, sku: null, imageUrls: [] });
    expect(json).not.toHaveProperty('url');
    expect(json).not.toHaveProperty('sku');
    expect(json).not.toHaveProperty('image');
    expect(json.offers).not.toHaveProperty('url');
  });

  it('jamais de note moyenne ni d’avis inventés (RM-40)', () => {
    const text = JSON.stringify(buildProductJsonLd(base));
    expect(text).not.toMatch(/aggregateRating|review|ratingValue/i);
  });

  it('un nom ou une description hostile ne peut pas fermer la balise <script>', () => {
    const output = serializeJsonLd(buildProductJsonLd({ ...base, name: '</script><script>alert(1)</script>' }));
    expect(output).not.toContain('</script>');
  });
});
