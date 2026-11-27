import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FichePrice } from '@/components/shop/FichePrice';
import { ShowcaseGrid } from '@/components/shop/ShowcaseGrid';
import { ShowcaseGroups } from '@/components/shop/ShowcaseGroups';
import { ShowcaseProductView } from '@/components/shop/ShowcaseProductView';
import { CATALOGUE, COMMON } from '@/content/catalogue';
import { formatFcfa } from '@/lib/money';
import { COMPLETE_RANGE_SLUG, findEntry, showcaseGroups } from '@/lib/shop/catalogue';

const fiche = (slug: string) => renderToStaticMarkup(<ShowcaseProductView entry={findEntry(slug)!} />);
const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;
// Le « & » des textes est échappé dans le HTML.
const esc = (text: string) => text.replace(/&/g, '&amp;');

describe('vitrine : la boutique en trois groupes', () => {
  const html = renderToStaticMarkup(<ShowcaseGroups />);

  it('affiche chaque soin, puis les duos, puis la gamme complète, avec leur titre de groupe', () => {
    expect(count(html, /<section /g)).toBe(3);
    const titles = [...html.matchAll(/class="showcase-group-title">([^<]+)</g)].map((match) => match[1]);
    expect(titles).toEqual(['Nos soins', 'Nos duos', 'La gamme complète']);
    expect(count(html, /class="showcase-cell"/g)).toBe(10);
  });

  it('range les dix cartes dans l’ordre voulu : Fluffy Kinks en tête, puis les duos, puis la gamme complète', () => {
    const names = [...html.matchAll(/<h4 class="showcase-name">([^<]+)</g)].map((match) => match[1]);
    expect(names).toEqual(['Fluffy Kinks', 'SLIK', 'Mousse Kinky', 'Velvet', 'Elixir Wunter', 'Brume', 'Duo jaune', 'Duo orange', 'Duo marron', 'Gamme Kinks complète']);
  });

  it('répartit les dispositions par groupe : six pour les soins, trois pour les duos, une seule en grand pour la gamme', () => {
    const groups = html.split('<section ').slice(1);
    expect([0, 1, 2, 3, 4, 5].every((slot) => groups[0]!.includes(`data-slot="${slot}"`))).toBe(true);
    expect(count(groups[1]!, /class="showcase-cell"/g)).toBe(3);
    expect(groups[2]).toContain('data-single="true"');
  });

  it('chaque carte mène à sa fiche /produit/<id>, avec une seule photo, sans prix ni bouton', () => {
    expect(count(html, /class="showcase-link"/g)).toBe(10);
    for (const entry of CATALOGUE) expect(html).toContain(`href="/produit/${entry.slug}"`);
    expect(count(html, /<img /g)).toBe(10);
    expect(html).not.toMatch(/FCFA|F CFA/);
    expect(html).not.toContain('<button');
    expect(html).not.toContain('showcase-second');
  });

  it('marque les quatre offres d’une pastille « Offre » (trois duos et la gamme complète)', () => {
    expect(count(html, /class="showcase-offer"/g)).toBe(4);
  });

  it('décrit chaque carte par son sous-titre d’étiquette et sa contenance ou son besoin', () => {
    expect(html).toContain(esc('Shampoing ambunu & shikakai'));
    expect(html).toContain('120 g');
    expect(html).toContain(esc('Offre duo · Lavage & pousse'));
    expect(html).toContain('Offre · 6 soins');
  });

  it('rappelle le code couleur : jaune = lavage et pousse, orange = hydratation, marron = nutrition', () => {
    const legend = html.slice(html.indexOf('gamme-legend'), html.indexOf('</ul>'));
    expect(legend).toContain('Jaune');
    expect(legend).toContain('lavage et pousse');
    expect(legend).toContain('hydratation');
    expect(legend).toContain('nutrition');
    expect(count(legend, /class="gamme-dot"/g)).toBe(3);
  });

  it('charge tout de suite les deux premières photos du premier groupe, et laisse les autres en chargement différé', () => {
    expect(count(html, /loading="eager"/g)).toBe(2);
    expect(count(html, /loading="lazy"/g)).toBe(8);
  });

  it('est identique à chaque rendu (pas d’erreur d’hydratation)', () => {
    expect(renderToStaticMarkup(<ShowcaseGroups />)).toBe(html);
  });

  it('une grille sans carte ne rend rien d’autre qu’une liste vide', () => {
    expect(renderToStaticMarkup(<ShowcaseGrid cards={[]} />)).toBe('<ul class="showcase-grid" data-single="false"></ul>');
    expect(showcaseGroups([])).toEqual([]);
  });
});

describe('prix : règle du dossier produit', () => {
  it('un soin seul : un seul prix, sans ancien prix ni économie', () => {
    const html = renderToStaticMarkup(<FichePrice entry={findEntry('velvet')!} />);
    expect(html).toContain(formatFcfa(8000));
    expect(html).not.toMatch(/<s[ >]/);
    expect(html).not.toContain('Économie');
  });

  it('une offre : l’ancien prix barré d’un seul trait, puis le prix réel en évidence, puis l’économie', () => {
    const html = renderToStaticMarkup(<FichePrice entry={findEntry('duo-jaune')!} />);
    const old = html.indexOf(`<s aria-label="Ancien prix ${formatFcfa(10500)}">${formatFcfa(10500)}</s>`);
    const real = html.indexOf(`<strong class="fiche-price-now">${formatFcfa(10000)}</strong>`);
    const saving = html.indexOf(`Économie : ${formatFcfa(500)}`);
    expect(old).toBeGreaterThanOrEqual(0);
    expect(real).toBeGreaterThan(old);
    expect(saving).toBeGreaterThan(real);
    expect(count(html, /<s[ >]/g)).toBe(1); // un seul trait
    expect(html).not.toContain('<del');
  });

  it.each([
    ['duo-orange', 12000, 11500, 500],
    ['duo-marron', 12000, 11500, 500],
    [COMPLETE_RANGE_SLUG, 34500, 32500, 2000],
  ])('%s : %i FCFA barré, %i FCFA, économie %i FCFA', (slug, regular, price, saving) => {
    const html = renderToStaticMarkup(<FichePrice entry={findEntry(slug)!} />);
    expect(html).toContain(`>${formatFcfa(regular)}</s>`);
    expect(html).toContain(`>${formatFcfa(price)}</strong>`);
    expect(html).toContain(`Économie : ${formatFcfa(saving)}`);
  });
});

describe('fiche d’un soin', () => {
  it('affiche un seul titre h1, la couleur, le sous-titre, le prix et la fiche express', () => {
    const page = fiche('mousse-kinky');
    expect(count(page, /<h1[ >]/g)).toBe(1);
    expect(page).toContain('>Mousse Kinky</h1>');
    expect(page).toContain('Gamme jaune · lavage et pousse');
    expect(page).toContain(esc('Shampoing ambunu & shikakai'));
    expect(page).toContain(formatFcfa(6000));
    for (const text of ['Contenance', '250 ml', 'Type', 'Shampoing', 'Bienfaits', 'Nettoyant et démêlant']) expect(page).toContain(text);
  });

  it('dit que la commande n’est pas encore ouverte et ne propose ni panier ni bouton d’achat', () => {
    const page = fiche('slik');
    expect(page).toContain('Commande bientôt disponible.');
    expect(page).not.toContain('Ajouter au panier');
    expect(page).not.toContain('sticky-buy');
    expect(page).toContain('href="/#contact"');
  });

  it('détaille le mode d’emploi en étapes numérotées, les précautions et les ingrédients de l’étiquette', () => {
    const page = fiche('elixir-wunter');
    const steps = page.slice(page.indexOf('class="fiche-steps"'), page.indexOf('</ol>'));
    expect(count(steps, /<li>/g)).toBe(5);
    expect(page).toContain('Masser du bout des doigts pendant 2 à 5 minutes.');
    expect(page).toContain('Faire un test sur le poignet avant la première utilisation.');
    expect(page).toContain('Simmondsia Chinensis Seed Oil, Olea Europaea Fruit Oil');
    expect(page).toContain('Eugenol.');
  });

  it('reprend les mentions de l’étiquette : PAO de 12 mois, fabrication en Côte d’Ivoire, contact', () => {
    const page = fiche('brume');
    expect(page).toContain('PAO : 12 mois après ouverture.');
    expect(page).toContain(COMMON.madeIn);
    expect(page).toContain(`mailto:${COMMON.contactEmail}`);
  });

  it('affiche les deux photos en slide quand le soin en a deux, une seule sans flèches sinon', () => {
    const two = fiche('fluffy-kinks');
    expect(count(two, /class="gallery-slide"/g)).toBe(2);
    expect(two).toContain('gallery-arrow');
    const one = fiche('slik');
    expect(count(one, /class="gallery-slide"/g)).toBe(1);
    expect(one).not.toContain('gallery-arrow');
  });

  it('propose le duo de sa couleur et la gamme complète, avec leur prix et leur économie', () => {
    const page = fiche('velvet');
    const offers = page.slice(page.indexOf('fiche-offers'));
    expect(offers).toContain('href="/produit/duo-marron"');
    expect(offers).toContain(`Économie : ${formatFcfa(500)}`);
    expect(offers).toContain(`>${formatFcfa(11500)}</strong>`);
    expect(offers).toContain('href="/produit/gamme-kinks-complete"');
    expect(offers).toContain(`Économie : ${formatFcfa(2000)}`);
  });

  it('ajoute le prix du soin sans barrer quoi que ce soit dans le bloc de prix principal', () => {
    const page = fiche('velvet');
    const main = page.slice(0, page.indexOf('fiche-about'));
    expect(main).not.toMatch(/<s[ >]/);
  });
});

describe('fiche d’une offre', () => {
  it('le duo jaune affiche l’ancien prix barré, le prix réel et l’économie du dossier', () => {
    const page = fiche('duo-jaune');
    const main = page.slice(0, page.indexOf('fiche-about'));
    expect(main).toContain(`>${formatFcfa(10500)}</s>`);
    expect(main).toContain(`>${formatFcfa(10000)}</strong>`);
    expect(main).toContain(`Économie : ${formatFcfa(500)}`);
    expect(main).toContain('Offre duo');
    expect(main).toContain(esc('Lavage & pousse'));
  });

  it('liste les deux produits du duo, chacun avec son lien, sa contenance et son prix', () => {
    const page = fiche('duo-orange');
    const contents = page.slice(page.indexOf('fiche-contents'), page.indexOf('fiche-matrix'));
    expect(count(contents, /class="fiche-content"/g)).toBe(2);
    expect(contents).toContain('href="/produit/slik"');
    expect(contents).toContain('href="/produit/brume"');
    expect(contents).toContain(formatFcfa(6000));
    expect(page).toContain('Dans ce duo');
  });

  it('résume les précautions des soins du duo dans la matrice du dossier', () => {
    const page = fiche('duo-jaune');
    expect(page).toContain(COMMON.commonPrecaution);
    expect(count(page, /<tbody>[\s\S]*?<\/tbody>/g)).toBe(1);
    const rows = page.slice(page.indexOf('<tbody>')).split('<tr>').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('Mousse Kinky');
    expect(count(rows[0]!, /data-on="true"/g)).toBe(0); // Mousse Kinky : aucune précaution particulière
    expect(rows[1]).toContain('Elixir Wunter');
    expect(count(rows[1]!, /data-on="true"/g)).toBe(4);
  });

  it('un duo propose la gamme complète ; la gamme complète ne propose rien d’autre', () => {
    const duo = fiche('duo-marron');
    expect(duo.slice(duo.indexOf('fiche-offers'))).toContain('href="/produit/gamme-kinks-complete"');
    expect(duo.slice(duo.indexOf('fiche-offers'))).not.toContain('href="/produit/duo-');
    expect(fiche(COMPLETE_RANGE_SLUG)).not.toContain('fiche-offers');
  });

  it('la gamme complète réunit les six soins, avec 34 500 FCFA barrés, 32 500 FCFA et 2 000 FCFA d’économie', () => {
    const page = fiche(COMPLETE_RANGE_SLUG);
    expect(page).toContain('Dans cette gamme');
    expect(count(page.slice(page.indexOf('fiche-contents')), /class="fiche-content"/g)).toBe(6);
    expect(page).toContain(`>${formatFcfa(34500)}</s>`);
    expect(page).toContain(`>${formatFcfa(32500)}</strong>`);
    expect(page).toContain(`Économie : ${formatFcfa(2000)}`);
  });
});

describe('les dix fiches', () => {
  it.each(CATALOGUE.map((entry) => [entry.slug]))('%s : un seul h1, une description, des photos, un prix', (slug) => {
    const entry = findEntry(slug)!;
    const page = fiche(slug);
    expect(count(page, /<h1[ >]/g)).toBe(1);
    expect(page).toContain(`>${entry.name}</h1>`);
    expect(page).toContain(esc(entry.description.split('\n\n')[0]!));
    expect(count(page, /class="gallery-slide"/g)).toBe(entry.images.length);
    expect(page).toContain('fiche-price-now');
    expect(page).toContain('application/ld+json');
  });

  it('n’annonce aucune offre (prix, stock) dans les données structurées tant que la commande n’est pas ouverte', () => {
    for (const entry of CATALOGUE) expect(fiche(entry.slug)).not.toContain('"offers"');
  });
});
