import { describe, expect, it } from 'vitest';
import { storeSettingsSchema } from '@/lib/validation/settings.schema';

const valid = {
  storeName: 'Meëra Kinks',
  contactEmail: '',
  contactPhone: '',
  legalName: '',
  address: '',
  sellerWhatsApp: '+225 07 00 00 00 00',
  notificationEmail: 'Contact@Exemple.CI',
  waveNumber: '',
  depositAmount: 2000,
  paymentRules: '',
  instagramUrl: '',
  tiktokUrl: '',
  facebookUrl: '',
};

const messagesFor = (input: unknown): Record<string, string[] | undefined> => {
  const result = storeSettingsSchema.safeParse(input);
  return result.success ? {} : result.error.flatten().fieldErrors;
};

describe('paramètres de la boutique : validation', () => {
  it('accepte un jeu valide : champs vides → null, email d’alerte en minuscules', () => {
    const result = storeSettingsSchema.parse(valid);
    expect(result.contactEmail).toBeNull();
    expect(result.instagramUrl).toBeNull();
    expect(result.paymentRules).toBeNull();
    expect(result.notificationEmail).toBe('contact@exemple.ci');
    expect(result.depositAmount).toBe(2000);
  });

  it('refuse un numéro WhatsApp provisoire ou trop court', () => {
    expect(messagesFor({ ...valid, sellerWhatsApp: 'À configurer' }).sellerWhatsApp?.[0]).toContain('indicatif');
    expect(messagesFor({ ...valid, sellerWhatsApp: '12345' }).sellerWhatsApp).toBeDefined();
  });

  it('acompte : entier entre 500 et 500 000 FCFA', () => {
    expect(messagesFor({ ...valid, depositAmount: 100 }).depositAmount?.[0]).toContain('au moins 500');
    expect(messagesFor({ ...valid, depositAmount: 600_000 }).depositAmount?.[0]).toContain('au plus');
    expect(messagesFor({ ...valid, depositAmount: 2000.5 }).depositAmount).toBeDefined();
    // Un champ vide ou sans chiffre arrive en JSON sous la forme null : message en français, pas de blocage.
    expect(messagesFor({ ...valid, depositAmount: null }).depositAmount?.[0]).toContain('saisissez un nombre entier');
  });

  it('réseaux : https obligatoire, vide autorisé', () => {
    expect(storeSettingsSchema.parse({ ...valid, instagramUrl: 'https://www.instagram.com/meerakinks' }).instagramUrl).toBe('https://www.instagram.com/meerakinks');
    expect(messagesFor({ ...valid, tiktokUrl: 'http://tiktok.com/@x' }).tiktokUrl?.[0]).toContain('https://');
    expect(messagesFor({ ...valid, facebookUrl: 'javascript:alert(1)' }).facebookUrl).toBeDefined();
    expect(messagesFor({ ...valid, facebookUrl: 'pas un lien' }).facebookUrl).toBeDefined();
  });

  it('emails : invalides refusés', () => {
    expect(messagesFor({ ...valid, notificationEmail: 'pas-un-email' }).notificationEmail).toBeDefined();
    expect(messagesFor({ ...valid, contactEmail: 'x@' }).contactEmail).toBeDefined();
    expect(messagesFor({ ...valid, storeName: ' ' }).storeName).toBeDefined();
  });
});
