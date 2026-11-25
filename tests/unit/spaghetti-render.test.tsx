import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LANDING } from '@/content/landing';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...(rest as object)}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));

const { default: Spaghetti } = await import('@/components/shop/Spaghetti');
const { Hero, Collections, Faq, Why } = await import('@/components/shop/LandingSections');

/** Texte visible d'un HTML : balises retirées, entités décodées, espaces normalisés. */
const plain = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

describe('<Spaghetti /> — rendu serveur', () => {
  it('titre : le texte complet est dans le HTML, le titre garde un nom accessible complet et les lettres sont masquées', () => {
    const html = renderToStaticMarkup(<Spaghetti as="h2" id="t">Vos essentiels, réunis.</Spaghetti>);
    expect(html).toContain('<h2 ');
    expect(html).toContain('id="t"');
    expect(html).toContain('aria-label="Vos essentiels, réunis."');
    expect(html).toContain('<span aria-hidden="true">');
    expect(plain(html)).toBe('Vos essentiels, réunis.');
  });

  it('titre : un mot n’est jamais coupé (chaque mot est un bloc) et chaque lettre porte son rang', () => {
    const html = renderToStaticMarkup(<Spaghetti as="h2">Vos essentiels</Spaghetti>);
    expect(html.match(/class="sp-w"/g)).toHaveLength(2);
    expect(html.match(/class="sp-u"/g)).toHaveLength(13);
    const ranks = [...html.matchAll(/--i:(\d+)/g)].map((match) => Number(match[1]));
    expect(ranks).toEqual(Array.from({ length: 13 }, (_, index) => index));
    expect(html).toMatch(/<span class="sp-u" style="--i:0">V<\/span><span class="sp-u" style="--i:1">o<\/span><span class="sp-u" style="--i:2">s<\/span><\/span> <span class="sp-w">/);
  });

  it('texte courant : mot par mot, séparés par de vraies espaces, sans nom accessible redondant', () => {
    const html = renderToStaticMarkup(<Spaghetti as="p" className="lead">Découvrez une sélection de produits.</Spaghetti>);
    expect(html).toContain('class="sp sp-words lead"');
    expect(html).not.toContain('aria-label');
    expect(html).not.toContain('aria-hidden');
    expect(html.match(/class="sp-w sp-u"/g)).toHaveLength(5);
    expect(plain(html)).toBe('Découvrez une sélection de produits.');
  });

  it('le mode par défaut dépend de la balise : lettres pour h1 et h2, mots ailleurs', () => {
    expect(renderToStaticMarkup(<Spaghetti as="h1">Bonjour</Spaghetti>)).toContain('sp-chars');
    expect(renderToStaticMarkup(<Spaghetti as="h2">Bonjour</Spaghetti>)).toContain('sp-chars');
    expect(renderToStaticMarkup(<Spaghetti as="h3">Bonjour</Spaghetti>)).toContain('sp-words');
    expect(renderToStaticMarkup(<Spaghetti as="p">Bonjour</Spaghetti>)).toContain('sp-words');
    expect(renderToStaticMarkup(<Spaghetti as="h3" mode="chars">Bonjour</Spaghetti>)).toContain('sp-chars');
  });

  it('seul le Hero (trigger="mount") démarre tout de suite ; le reste attend le défilement (aucun masquage côté serveur)', () => {
    expect(renderToStaticMarkup(<Spaghetti as="h1" trigger="mount">Bonjour</Spaghetti>)).toContain('data-sp="in"');
    expect(renderToStaticMarkup(<Spaghetti as="h2">Bonjour</Spaghetti>)).not.toContain('data-sp');
  });

  it('le décalage entre lettres est écrit sur la racine (15 ms pour un titre ordinaire)', () => {
    expect(renderToStaticMarkup(<Spaghetti as="h2">Bonjour</Spaghetti>)).toContain('--sp-step:15ms');
  });

  it('est identique à chaque rendu (pas d’erreur d’hydratation)', () => {
    const render = () => renderToString(<Spaghetti as="h2">Faites de la place à vos nouveaux essentiels.</Spaghetti>);
    expect(render()).toBe(render());
  });

  it('un texte vide ne produit aucune lettre ni erreur', () => {
    const html = renderToStaticMarkup(<Spaghetti as="p">{''}</Spaghetti>);
    expect(html).not.toContain('sp-u');
  });
});

describe('landing — l’effet est branché sur les titres, sans rien perdre du texte', () => {
  it('Hero : titre composé à la main (graisse très forte + cursive) animé dès l’affichage ; la description reste un texte fixe', () => {
    const html = renderToStaticMarkup(<Hero showCollections iconSrc="/brand/favicon-icon.png" />);
    expect(html).toContain('id="hero-title"');
    expect(plain(html)).toContain(`${LANDING.hero.titleMain} ${LANDING.hero.titleScript}`);
    expect(plain(html)).toContain(LANDING.hero.title);
    expect(plain(html)).toContain(LANDING.hero.text);
    expect(html).toContain(`<p class="lead hero-lead">${LANDING.hero.text}</p>`); // description : pas d’effet élastique
  });

  it('une section garde son titre accessible (aria-labelledby → titre nommé) et son texte lisible', () => {
    const html = renderToStaticMarkup(<Collections sections={[]} hasOffers={false} />);
    expect(html).toContain('aria-labelledby="collections-title"');
    expect(html).toContain('id="collections-title"');
    expect(html).toContain(`aria-label="${LANDING.collections.title}"`);
    expect(plain(html)).toContain(LANDING.collections.text);
    expect(html).not.toContain('data-sp');
  });

  it('Pourquoi nous : les sous-titres sont animés par mot, les descriptions restent fixes, texte intact', () => {
    const html = renderToStaticMarkup(<Why storeName="Awa Beauty" />);
    for (const item of LANDING.why.items) {
      expect(plain(html)).toContain(item.title);
      expect(plain(html)).toContain(item.text);
    }
  });

  it('Pourquoi nous : de vraies étapes (liste ordonnée de cartes à onglet), plus d’accordéon ; deux mots-clés en ghost', () => {
    const html = renderToStaticMarkup(<Why storeName="Awa Beauty" />);
    expect(html).toContain('<ol class="why-steps"');
    expect(html.match(/class="why-step"/g)).toHaveLength(LANDING.why.items.length);
    expect(html.match(/class="why-step-tab"/g)).toHaveLength(LANDING.why.items.length);
    expect(html).not.toContain('<details');
    expect(html.match(/is-ghost/g)).toHaveLength(LANDING.why.titleGhost.length);
  });

  it('ghost : seuls les mots-clés reçoivent la classe ; le texte et le nom accessible restent intacts', () => {
    const html = renderToStaticMarkup(<Spaghetti as="h2" ghost={['kinks']}>La beauté de vos Kinks, ici</Spaghetti>);
    expect(html.match(/class="sp-w is-ghost"/g)).toHaveLength(1);
    expect(html.match(/class="sp-w"/g)).toHaveLength(5);
    expect(html).toContain('aria-label="La beauté de vos Kinks, ici"');
    expect(plain(html)).toBe('La beauté de vos Kinks, ici');
    // sans mot-clé : le rendu est strictement celui d’avant
    expect(renderToStaticMarkup(<Spaghetti as="h2">Vos kinks</Spaghetti>)).not.toContain('is-ghost');
  });

  it('FAQ : les réponses restent un texte simple (exception de la landing §26)', () => {
    const html = renderToStaticMarkup(<Faq settings={{ storeName: 'Awa Beauty', whatsappNumber: null, whatsappLink: null, contactEmail: null, contactPhone: null, instagramUrl: null, tiktokUrl: null, facebookUrl: null, focusProductId: null, depositAmount: 2000 }} />);
    const answers = [...html.matchAll(/<summary>.*?<\/summary><p>(.*?)<\/p>/g)].map((match) => match[1]);
    expect(answers.length).toBeGreaterThan(0);
    for (const answer of answers) expect(answer).not.toContain('sp-u');
  });

  it('les descriptions de la landing n’ont plus l’effet élastique (titres seulement : plus de surtitre)', () => {
    const source = readFileSync(path.resolve(__dirname, '../../src/components/shop/LandingSections.tsx'), 'utf-8');
    expect(source).not.toMatch(/<Spaghetti as="p"/);
    expect(source).not.toMatch(/<Spaghetti as="p" className="lead"/);
  });

  it('aucun titre h1 ou h2 de la landing n’échappe à l’effet', () => {
    const source = readFileSync(path.resolve(__dirname, '../../src/components/shop/LandingSections.tsx'), 'utf-8');
    // Seule exception : le h1 du héros, composé en deux polices (graisse très forte + cursive), dont chaque ligne reçoit l’effet.
    expect(source.match(/<h1[ >]/g) ?? []).toHaveLength(1);
    expect(source).not.toMatch(/<h2[ >]/);
  });
});
