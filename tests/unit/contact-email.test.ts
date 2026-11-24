import { describe, expect, it } from 'vitest';
import type { ContactInput } from '@/lib/validation/contact.schema';
import { buildContactEmail } from '@/server/services/contact-email';

const input = (overrides: Partial<ContactInput> = {}): ContactInput => ({
  topic: 'ORDER',
  name: 'Awa Koné',
  replyChannel: 'WHATSAPP',
  phoneE164: '+2250700000000',
  email: undefined,
  orderReference: 'CMD-7K3M9QXP',
  message: 'Bonjour,\nOù en est ma commande ?',
  idempotencyKey: '0b9d6f1e-6a43-4d6a-9d0e-3f6a5c2b7e11',
  ...overrides,
});

describe('courriel du formulaire de contact', () => {
  it('sujet, nom et référence sont dans le courriel, texte et HTML', () => {
    const mail = buildContactEmail(input(), 'Meëra Kinks');
    expect(mail.subject).toBe('Nouveau message : Ma commande — Awa Koné');
    expect(mail.text).toContain('Sujet : Ma commande');
    expect(mail.text).toContain('Commande : CMD-7K3M9QXP');
    expect(mail.text).toContain('Où en est ma commande ?');
    expect(mail.html).toContain('CMD-7K3M9QXP');
    expect(mail.html).toContain('https://wa.me/2250700000000');
  });

  it('tout ce que le client a saisi est échappé (aucune injection HTML dans la boîte de la vendeuse)', () => {
    const mail = buildContactEmail(input({ name: '<img src=x onerror=alert(1)>', message: '<script>alert(1)</script> & plus', orderReference: undefined, topic: 'OTHER' }), 'Meëra Kinks');
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('&amp; plus');
  });

  it('le sujet tient sur une ligne même si le nom contient des retours à la ligne', () => {
    const mail = buildContactEmail(input({ name: 'Awa\r\nBcc: x@y.z' }), 'Meëra Kinks');
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });

  it('réponse par e-mail : l’adresse est proposée en réponse directe', () => {
    const mail = buildContactEmail(input({ replyChannel: 'EMAIL', phoneE164: undefined, email: 'awa@example.com' }), 'Meëra Kinks');
    expect(mail.html).toContain('mailto:awa@example.com');
    expect(mail.text).toContain('E-mail : awa@example.com');
  });
});
