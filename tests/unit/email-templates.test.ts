import { describe, expect, it } from 'vitest';
import { formatFcfa } from '@/lib/money';
import { buildCustomerReceivedEmail, buildSellerNewOrderEmail, buildStatusChangedEmail, escapeHtml, toSubject } from '@/server/services/email-templates';
import { buildReceiptData, type ReceiptData } from '@/server/services/receipt.service';

const receipt = (overrides: Partial<Parameters<typeof buildReceiptData>[0]> = {}): ReceiptData =>
  buildReceiptData({
    issuedAt: new Date('2026-11-17T10:00:00.000Z'),
    shop: { name: 'Awa Beauty', legalName: null, address: null, contactPhone: null, contactEmail: null },
    depositAmount: 2000,
    customer: { firstName: 'Awa', lastName: 'Koné', phone: '+2250700000000', email: 'awa@example.com' },
    delivery: { zoneType: 'ABIDJAN', country: 'Côte d’Ivoire', city: 'Cocody', address: 'Riviera Palmeraie\nPortail bleu' },
    lines: [{ name: 'Sérum éclat', unitPrice: 10000, quantity: 2, lineTotal: 20000 }],
    subtotal: 20000,
    deliveryFee: null,
    total: null,
    upfrontAmount: 2000,
    ...overrides,
  });

const seller = (data = receipt(), customerNote: string | null = null) => buildSellerNewOrderEmail({ reference: 'CMD-7K3M9QXP', receipt: data, customerNote, storeName: 'Awa Beauty' });
const customer = (data = receipt()) => buildCustomerReceivedEmail({ reference: 'CMD-7K3M9QXP', receipt: data, storeName: 'Awa Beauty' });

describe('outils', () => {
  it('escapeHtml neutralise tout ce qui peut devenir une balise', () => {
    expect(escapeHtml(`<img src=x onerror="alert('1')"> & co`)).toBe('&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt; &amp; co');
  });
  it('toSubject tient sur une ligne et reste borné', () => {
    expect(toSubject('Nouvelle\r\ncommande\tBcc: x@y.z')).toBe('Nouvelle commande Bcc: x@y.z');
    expect(toSubject('x'.repeat(400))).toHaveLength(150);
  });
});

describe('alerte à la vendeuse', () => {
  it('a un sujet clair et reprend tout ce qu’il faut pour agir', () => {
    const email = seller();
    expect(email.subject).toBe('Nouvelle commande CMD-7K3M9QXP — Awa Koné');
    for (const content of [email.html, email.text]) {
      expect(content).toContain('CMD-7K3M9QXP');
      expect(content).toContain('Awa Koné');
      expect(content).toContain('+225 07 00 00 00 00');
      expect(content).toContain('awa@example.com');
      expect(content).toContain('Cocody (Abidjan)');
      expect(content).toContain('Sérum éclat');
      expect(content).toContain(formatFcfa(20000));
      expect(content).toContain('à confirmer');
      expect(content).toContain('acompte de');
    }
  });

  it('donne le lien WhatsApp du client et les étapes à suivre (annexe B, RM-09)', () => {
    const email = seller();
    expect(email.html).toContain('href="https://wa.me/2250700000000"');
    expect(email.text).toContain('https://wa.me/2250700000000');
    for (const step of ['vérifier les informations fournies', 'confirmer la disponibilité des produits', 'préciser les frais de livraison', 'communiquer les modalités de paiement']) {
      expect(email.text).toContain(step);
    }
    expect(email.text).toContain('Aucun paiement n’est enregistré à ce stade');
  });

  it('ÉCHAPPE tout ce que le client a saisi : aucune balise ne passe dans la boîte de la vendeuse', () => {
    const hostile = receipt({
      customer: { firstName: '<b>Awa</b>', lastName: '"><script>alert(1)</script>', phone: '+2250700000000', email: 'a"b@example.com' },
      delivery: { zoneType: 'ABIDJAN', country: 'Côte d’Ivoire', city: '<i>Cocody</i>', address: '<script>steal()</script>\n<img src=x onerror=alert(2)>' },
      lines: [{ name: '<script>produit()</script>', unitPrice: 1000, quantity: 1, lineTotal: 1000 }],
    });
    const { html } = seller(hostile, '<iframe src="https://evil.example"></iframe>');
    expect(html).not.toMatch(/<script|<iframe|<img |<b>Awa|<i>Cocody/i);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;iframe');
  });

  it('un nom piégé ne peut pas casser le sujet ni y injecter un en-tête', () => {
    const sneaky = receipt({ customer: { firstName: 'Awa', lastName: 'Koné\r\nBcc: pirate@example.com', phone: '+2250700000000', email: null } });
    expect(seller(sneaky).subject).not.toMatch(/[\r\n]/);
  });

  it('la note du client n’apparaît que si elle existe', () => {
    expect(seller().text).not.toContain('Note du client');
    expect(seller(receipt(), 'Appelez avant\nde passer.').text).toContain('Note du client : Appelez avant de passer.');
    expect(seller(receipt(), 'Appelez avant\nde passer.').html).toContain('Appelez avant<br>de passer.');
  });

  it('hors Abidjan : paiement intégral, sans numéro de paiement (RM-08)', () => {
    const outside = receipt({ delivery: { zoneType: 'INTERNATIONAL', country: 'France', city: 'Lyon', address: '12 rue des Fleurs' }, upfrontAmount: null });
    const email = seller(outside);
    expect(email.text).toContain('Lyon, France');
    expect(email.text).toContain('paiement intégral');
    expect(email.text).toContain('À régler avant expédition : montant confirmé par la vendeuse');
    for (const content of [email.html, email.text]) expect(content).not.toMatch(/wave\s*:?\s*\+?\d/i);
  });
});

describe('accusé de réception au client', () => {
  it('remercie, rappelle la référence et le récapitulatif', () => {
    const email = customer();
    expect(email.subject).toBe('Votre commande CMD-7K3M9QXP est enregistrée');
    for (const content of [email.html, email.text]) {
      expect(content).toContain('Bonjour Awa,');
      expect(content).toContain('Merci pour votre confiance !');
      expect(content).toContain('CMD-7K3M9QXP');
      expect(content).toContain('Sérum éclat');
      expect(content).toContain('à confirmer');
    }
  });

  it('reprend le texte validé de l’annexe B selon la zone (RM-11, RM-41)', () => {
    expect(customer().text).toContain('Pour les commandes dans les communes d’Abidjan : le paiement s’effectue à la livraison ; un acompte de');
    const outside = customer(receipt({ delivery: { zoneType: 'INTERIOR', country: 'Côte d’Ivoire', city: 'Bouaké', address: 'Quartier Air France' }, upfrontAmount: null }));
    expect(outside.text).toContain('le paiement intégral de la commande est requis avant l’expédition');
    expect(outside.text).not.toContain('communes d’Abidjan');
    expect(customer().text).toContain('Après réception de la commande, l’équipe vous contacte sur WhatsApp afin de :');
  });

  it('ne promet rien : ni paiement reçu, ni délai de livraison (RM-10, RM-42)', () => {
    const text = customer().text.toLowerCase();
    expect(text).not.toMatch(/payée|paiement reçu|paiement confirmé|bien reçu votre paiement/);
    expect(text).not.toMatch(/\d+\s*(heures|jours)|sous 24|sous 48|livraison express|garantie/);
  });

  it('n’ajoute les coordonnées de la boutique que si elles existent', () => {
    expect(customer().text).not.toContain('Une question ?');
    const withContact = receipt({ shop: { name: 'Awa Beauty', legalName: null, address: null, contactPhone: '+225 01 02 03 04 05', contactEmail: 'contact@awa.example' } });
    expect(customer(withContact).text).toContain('Une question ? +225 01 02 03 04 05 · contact@awa.example');
  });

  it('échappe le prénom et les noms de produits', () => {
    const hostile = receipt({
      customer: { firstName: '<script>x</script>', lastName: 'Koné', phone: '+2250700000000', email: null },
      lines: [{ name: '<b>Pack</b>', unitPrice: 1000, quantity: 1, lineTotal: 1000 }],
    });
    expect(customer(hostile).html).not.toMatch(/<script|<b>Pack/);
  });
});

describe('changement de statut', () => {
  it('annonce le nouveau statut avec son libellé', () => {
    const email = buildStatusChangedEmail({ reference: 'CMD-7K3M9QXP', receipt: receipt(), storeName: 'Awa Beauty', deliveryStatus: 'CONFIRMED' });
    expect(email.subject).toBe('Votre commande CMD-7K3M9QXP : Confirmée');
    expect(email.text).toContain('Bonjour Awa,');
    expect(email.html).toContain('<strong>Confirmée</strong>');
  });
});

describe('forme des emails', () => {
  it('sont des documents HTML autonomes (aucune image distante, aucun script) avec alternative texte', () => {
    for (const email of [seller(), customer()]) {
      expect(email.html).toMatch(/^<!doctype html><html lang="fr">/);
      expect(email.html).not.toMatch(/<script|<img|<link|src="http/i);
      expect(email.text.length).toBeGreaterThan(50);
      expect(email.text).not.toContain('<');
    }
  });
});
