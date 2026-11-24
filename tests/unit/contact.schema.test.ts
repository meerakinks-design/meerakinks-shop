import { describe, expect, it } from 'vitest';
import { contactInputSchema } from '@/lib/validation/contact.schema';

const KEY = '0b9d6f1e-6a43-4d6a-9d0e-3f6a5c2b7e11';
const base = (overrides: Record<string, unknown> = {}) => ({
  topic: 'PRODUCT',
  name: 'Awa Koné',
  replyChannel: 'WHATSAPP',
  dialCode: '225',
  phone: '07 00 00 00 00',
  email: '',
  orderReference: '',
  message: 'Bonjour, ce soin convient-il aux cheveux très secs ?',
  consent: true,
  idempotencyKey: KEY,
  companyFax: '',
  ...overrides,
});
const errors = (input: unknown) => {
  const result = contactInputSchema.safeParse(input);
  return result.success ? null : result.error.flatten().fieldErrors;
};

describe('formulaire de contact : champs exigés selon les choix', () => {
  it('réponse sur WhatsApp : le numéro est normalisé en E.164', () => {
    const result = contactInputSchema.parse(base());
    expect(result.phoneE164).toBe('+2250700000000');
    expect(result.email).toBeUndefined();
  });

  it('réponse sur WhatsApp : un numéro absent ou invalide est refusé, champ par champ', () => {
    expect(errors(base({ phone: '' }))?.phone?.[0]).toContain('numéro');
    expect(errors(base({ phone: '12' }))?.phone).toBeDefined();
  });

  it('réponse par e-mail : l’adresse est exigée, le numéro ne l’est plus', () => {
    expect(errors(base({ replyChannel: 'EMAIL', phone: '', email: '' }))?.email?.[0]).toBe('Indiquez votre adresse e-mail.');
    expect(errors(base({ replyChannel: 'EMAIL', phone: '', email: 'pas-un-mail' }))?.email?.[0]).toBe('Adresse e-mail invalide.');
    const ok = contactInputSchema.parse(base({ replyChannel: 'EMAIL', phone: '', email: 'AWA@Example.com ' }));
    expect(ok.email).toBe('awa@example.com');
    expect(ok.phoneE164).toBeUndefined();
  });

  it('sujet « Ma commande » : la référence devient obligatoire et doit avoir la bonne forme', () => {
    expect(errors(base({ topic: 'ORDER' }))?.orderReference?.[0]).toBe('Indiquez votre référence de commande.');
    expect(errors(base({ topic: 'ORDER', orderReference: 'CMD-123' }))?.orderReference?.[0]).toContain('pas valide');
    expect(contactInputSchema.parse(base({ topic: 'ORDER', orderReference: 'cmd-7k3m9qxp' })).orderReference).toBe('CMD-7K3M9QXP');
  });

  it('une référence saisie puis un autre sujet choisi : elle n’est pas envoyée', () => {
    expect(contactInputSchema.parse(base({ topic: 'PRODUCT', orderReference: 'CMD-7K3M9QXP' })).orderReference).toBeUndefined();
  });

  it('le message doit être assez long, pas trop, sans caractère de contrôle', () => {
    expect(errors(base({ message: '' }))?.message?.[0]).toBe('Écrivez votre message.');
    expect(errors(base({ message: 'Bonjour' }))?.message?.[0]).toContain('trop court');
    expect(errors(base({ message: 'a'.repeat(1201) }))?.message?.[0]).toContain('Maximum 1200');
    expect(errors(base({ message: 'Bonjour\u0007 ce soin est-il bio ?' }))?.message?.[0]).toContain('caractères');
    expect(contactInputSchema.parse(base({ message: 'Ligne 1\r\nLigne 2 du message' })).message).toBe('Ligne 1\nLigne 2 du message');
  });

  it('le consentement est obligatoire', () => {
    expect(errors(base({ consent: false }))?.consent?.[0]).toContain('Cochez la case');
    expect(errors(base({ consent: undefined }))?.consent).toBeDefined();
  });

  it('nom, sujet, canal et clé sont contrôlés', () => {
    expect(errors(base({ name: '' }))?.name?.[0]).toBe('Indiquez votre nom.');
    expect(errors(base({ name: 'A' }))?.name?.[0]).toBe('Votre nom est trop court.');
    expect(errors(base({ topic: 'SPAM' }))?.topic?.[0]).toBe('Choisissez votre sujet.');
    expect(errors(base({ replyChannel: 'PIGEON' }))?.replyChannel?.[0]).toContain('Choisissez');
    expect(errors(base({ idempotencyKey: 'court' }))?.idempotencyKey).toBeDefined();
  });

  it('ne laisse passer que les champs connus (aucun champ inconnu ni piège dans le résultat)', () => {
    const parsed = contactInputSchema.parse(base({ role: 'admin', companyFax: '' })) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(['email', 'idempotencyKey', 'message', 'name', 'orderReference', 'phoneE164', 'replyChannel', 'topic']);
  });
});
