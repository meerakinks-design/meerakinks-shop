import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { formatFcfa } from '@/lib/money';
import { emptyCheckoutValues, type CheckoutValues } from '@/lib/shop/checkout-form';
import type { OrderCreated } from '@/lib/shop/order-types';
import { emptyZones, type PublicZones } from '@/lib/shop/zones';

// Rendu serveur RÉEL du formulaire de commande et de la confirmation, sans base ni navigateur.
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...(rest as object)}>
      {children}
    </a>
  ),
}));

const { CartProvider } = await import('@/components/shop/CartProvider');
const { CheckoutForm } = await import('@/components/shop/CheckoutForm');
const { CheckoutModal } = await import('@/components/shop/CheckoutModal');
const { OrderConfirmation } = await import('@/components/shop/OrderConfirmation');

const noop = () => undefined;
type FormProps = Parameters<typeof CheckoutForm>[0];
const form = (overrides: Partial<FormProps> = {}, values: Partial<CheckoutValues> = {}) =>
  renderToStaticMarkup(
    <CheckoutForm
      idPrefix="t"
      values={{ ...emptyCheckoutValues(), ...values }}
      errors={{}}
      zones={emptyZones()}
      depositAmount={2000}
      recap={{ lines: [{ productId: 'prod_a', name: 'Sérum éclat', quantity: 2, lineTotal: 20000 }], subtotal: 20000 }}
      amounts={{ deliveryFee: null, total: null, upfrontAmount: 2000 }}
      alert={null}
      status="idle"
      canSubmit
      onChange={noop}
      onZoneTypeChange={noop}
      onSubmit={noop}
      onEditCart={noop}
      {...overrides}
    />,
  );

const zonesWithCommunes = (): PublicZones => ({
  ...emptyZones(),
  ABIDJAN: [
    { id: 'zone_cocody', name: 'Cocody', fee: 1500 },
    { id: 'zone_yop', name: 'Yopougon', fee: null },
  ],
});

describe('formulaire de commande — champs', () => {
  const html = form();

  it('affiche les champs du cahier §6.2, chacun avec son libellé', () => {
    for (const label of ['Prénom', 'Nom', 'Téléphone (WhatsApp)', 'Email', 'Adresse précise', 'Précisions', 'Note pour la vendeuse']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('(facultatif)');
    expect(html).toContain('Où livrer ?');
    expect(html).toContain('Une commune d’Abidjan');
    expect(html).toContain('Une autre ville de Côte d’Ivoire');
    expect(html).toContain('Un autre pays');
  });

  it('associe chaque libellé à son champ (htmlFor ↔ id) et aide les claviers mobiles', () => {
    expect(html).toContain('for="t-firstName"');
    expect(html).toContain('id="t-firstName"');
    expect(html).toContain('autoComplete="given-name"');
    expect(html).toContain('autoComplete="tel-national"');
    expect(html).toContain('inputMode="tel"');
    expect(html).toContain('type="email"');
  });

  it('propose les indicatifs avec la Côte d’Ivoire d’abord et « Autre pays »', () => {
    expect(html).toContain('aria-label="Indicatif du pays"');
    expect(html.indexOf('Côte d’Ivoire (+225)')).toBeLessThan(html.indexOf('Burkina Faso (+226)'));
    expect(html).toContain('Autre pays</option>');
  });

  it('cache le champ piège aux humains et aux lecteurs d’écran, hors du parcours clavier', () => {
    expect(html).toMatch(/class="hp-field" aria-hidden="true"/);
    expect(html).toContain('name="companyFax"');
    expect(html).toContain('tabindex="-1"');
  });

  it('empêche l’envoi pendant l’envoi et quand le panier n’est pas prêt', () => {
    expect(form()).not.toMatch(/<button type="submit"[^>]*disabled/);
    expect(form({ canSubmit: false })).toMatch(/<button type="submit"[^>]*disabled/);
    const sending = form({ status: 'sending' });
    expect(sending).toMatch(/<button type="submit"[^>]*disabled/);
    expect(sending).toContain('Envoi en cours…');
    expect(sending).toContain('aria-busy="true"');
  });
});

describe('formulaire de commande — destination', () => {
  it('sans zone configurée : champ libre « Commune »', () => {
    const html = form();
    expect(html).toContain('for="t-destination">Commune</label>');
    expect(html).toMatch(/<input type="text"[^>]*id="t-destination"/);
    expect(html).not.toContain('Choisir…');
  });

  it('avec des zones configurées : liste déroulante des communes desservies', () => {
    const html = form({ zones: zonesWithCommunes() });
    expect(html).toMatch(/<select[^>]*id="t-destination"/);
    expect(html).toContain('Choisir…');
    expect(html).toContain('>Cocody</option>');
    expect(html).toContain('>Yopougon</option>');
  });

  it('intérieur : « Ville » ; étranger : « Pays » et « Ville »', () => {
    expect(form({}, { zoneType: 'INTERIOR' })).toContain('for="t-destination">Ville</label>');
    const international = form({}, { zoneType: 'INTERNATIONAL' });
    expect(international).toContain('for="t-destination">Pays</label>');
    expect(international).toContain('for="t-city">Ville</label>');
    expect(form({}, { zoneType: 'ABIDJAN' })).not.toContain('for="t-city"');
  });

  it('coche la zone choisie', () => {
    expect(form({}, { zoneType: 'INTERIOR' })).toMatch(/checked="" value="INTERIOR"/);
  });
});

describe('formulaire de commande — erreurs', () => {
  const html = form({ errors: { firstName: 'Indiquez votre prénom.', phone: 'Un numéro ivoirien compte 10 chiffres (ex. 07 00 00 00 00).', placeName: 'Indiquez votre commune.' } });

  it('affiche chaque message à côté de son champ et le relie par aria', () => {
    expect(html).toContain('id="t-firstName-error"');
    expect(html).toContain('Indiquez votre prénom.');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="t-firstName-error"');
    expect(html).toContain('aria-describedby="t-phone-error"');
    expect(html).toContain('aria-describedby="t-destination-error"');
  });

  it('ne marque pas invalides les champs sans erreur', () => {
    expect(html).not.toContain('aria-describedby="t-lastName-error"');
  });

  it('une alerte de conflit propose de revoir le panier ; une alerte réseau, non', () => {
    const conflict = form({ alert: { tone: 'conflict', message: 'Votre panier a changé.', details: ['Savon noir : épuisé.'] } });
    expect(conflict).toContain('role="alert"');
    expect(conflict).toContain('Savon noir : épuisé.');
    expect(conflict).toContain('Revoir mon panier');
    const network = form({ alert: { tone: 'error', message: 'Connexion impossible.' } });
    expect(network).toContain('Connexion impossible.');
    expect(network).not.toContain('Revoir mon panier');
  });
});

describe('formulaire de commande — montants et note de paiement', () => {
  it('Abidjan : montants à confirmer, acompte, et texte validé de l’annexe B (RM-11)', () => {
    const html = form();
    expect(html).toContain('Total estimé');
    expect(html).toContain('à confirmer');
    expect(html).toContain('Acompte pour confirmer');
    expect(html).toContain(formatFcfa(2000));
    expect(html).toContain('Pour les commandes dans les communes d’Abidjan : le paiement s’effectue à la livraison ; un acompte de');
    expect(html).toContain('le solde est réglé à la réception de la commande.');
    expect(html).not.toContain('Pour les commandes provenant de l’intérieur');
    for (const step of ['vérifier les informations fournies', 'confirmer la disponibilité des produits', 'préciser les frais de livraison', 'communiquer les modalités de paiement']) {
      expect(html).toContain(step);
    }
  });

  it('hors Abidjan : paiement intégral par Wave, sans numéro (RM-08)', () => {
    const html = form({ amounts: { deliveryFee: null, total: null, upfrontAmount: null } }, { zoneType: 'INTERNATIONAL' });
    expect(html).toContain('le paiement intégral de la commande est requis avant l’expédition');
    expect(html).toContain('le paiement s’effectue par Wave au numéro communiqué par la vendeuse après confirmation de la commande.');
    expect(html).not.toContain('Pour les commandes dans les communes d’Abidjan');
    expect(html).toContain('À régler avant expédition');
    expect(html).toContain('montant confirmé par la vendeuse');
  });

  it('frais connus : affiche frais et total estimé', () => {
    const html = form({ amounts: { deliveryFee: 1500, total: 21500, upfrontAmount: 2000 } });
    expect(html).toContain(formatFcfa(1500));
    expect(html).toContain(formatFcfa(21500));
  });

  it('renvoie à la politique de confidentialité et récapitule le panier', () => {
    const html = form();
    expect(html).toContain('href="/politique-de-confidentialite"');
    expect(html).toContain('2 × Sérum éclat');
    expect(html).toContain('Modifier mon panier');
  });
});

const order = (overrides: Partial<OrderCreated> = {}): OrderCreated => ({
  reference: 'CMD-7K3M9QXP',
  zoneType: 'ABIDJAN',
  placeLabel: 'Cocody (Abidjan)',
  lines: [
    { name: 'Sérum éclat', quantity: 2, unitPrice: 10000, lineTotal: 20000 },
    { name: 'Savon noir', quantity: 1, unitPrice: 4000, lineTotal: 4000 },
  ],
  subtotal: 24000,
  deliveryFee: null,
  total: null,
  upfrontAmount: 2000,
  whatsappUrl: 'https://wa.me/2250102030405?text=Bonjour%20CMD-7K3M9QXP',
  ...overrides,
});

describe('page de confirmation', () => {
  it('affiche la référence, le récapitulatif et « à confirmer » (§6.4)', () => {
    const html = renderToStaticMarkup(<OrderConfirmation order={order()} depositAmount={2000} />);
    expect(html).toContain('Merci pour votre confiance !');
    expect(html).toContain('CMD-7K3M9QXP');
    expect(html).toContain('2 × Sérum éclat');
    expect(html).toContain('Cocody (Abidjan)');
    expect(html).toContain(formatFcfa(24000));
    expect(html).toContain('à confirmer');
    expect(html).toContain('Acompte pour confirmer');
  });

  it('propose le bouton WhatsApp (action manuelle) vers le lien de la commande enregistrée', () => {
    const html = renderToStaticMarkup(<OrderConfirmation order={order()} depositAmount={2000} />);
    expect(html).toContain('href="https://wa.me/2250102030405?text=Bonjour%20CMD-7K3M9QXP"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Envoyer ma commande sur WhatsApp');
  });

  it('sans numéro WhatsApp configuré : aucun lien, mais l’information reste claire', () => {
    const html = renderToStaticMarkup(<OrderConfirmation order={order({ whatsappUrl: null })} depositAmount={2000} />);
    expect(html).not.toContain('wa.me');
    expect(html).not.toContain('Envoyer ma commande sur WhatsApp');
    expect(html).toContain('L’équipe vous contactera sur WhatsApp');
  });

  it('ne présente jamais un paiement comme reçu (RM-10)', () => {
    const html = renderToStaticMarkup(<OrderConfirmation order={order()} depositAmount={2000} />).toLowerCase();
    expect(html).not.toContain('payée');
    expect(html).not.toContain('paiement reçu');
    expect(html).not.toContain('paiement confirmé');
  });

  it('hors Abidjan : paiement intégral, frais inclus', () => {
    const html = renderToStaticMarkup(<OrderConfirmation order={order({ zoneType: 'INTERIOR', placeLabel: 'Bouaké, Côte d’Ivoire', upfrontAmount: null })} depositAmount={2000} />);
    expect(html).toContain('le paiement intégral de la commande est requis');
    expect(html).toContain('Bouaké, Côte d’Ivoire');
  });
});

describe('modal de commande (rendu serveur)', () => {
  const html = renderToString(
    <CartProvider>
      <CheckoutModal depositAmount={2000} zones={emptyZones()} />
    </CartProvider>,
  );

  it('est un <dialog> titré « Passer commande »', () => {
    expect(html).toContain('<dialog');
    expect(html).toContain('Passer commande');
    expect(html).toContain('modal-checkout');
  });

  it('n’affiche pas le formulaire avant que le panier soit chargé dans le navigateur', () => {
    expect(html).not.toContain('Envoyer ma commande');
    expect(html).toContain('aria-busy="true"');
  });
});
