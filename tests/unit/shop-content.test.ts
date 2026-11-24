import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REVIEWS } from '@/content/avis';
import { faqItems } from '@/content/faq';
import { INSTAGRAM_POSTS } from '@/content/instagram';
import { LANDING } from '@/content/landing';
import { PAYMENT_FOLLOW_UP, PAYMENT_OUTSIDE, paymentAbidjan, paymentReminder } from '@/content/livraison';
import { fill } from '@/lib/shop/template';

const CONTENT_DIR = path.resolve(__dirname, '../../src/content');

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('garde-fou de publication (document de la landing §21)', () => {
  it('aucun champ entre crochets (« [NOM DE LA BOUTIQUE] »…) ne reste dans les contenus publiés', () => {
    const placeholder = /\[[A-ZÀ-ÖØ-Ý][A-ZÀ-ÖØ-Ý0-9 '’-]{2,}\]/;
    for (const file of readdirSync(CONTENT_DIR)) {
      const text = readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
      expect(text, `${file} contient un champ à compléter`).not.toMatch(placeholder);
    }
  });

  it('tous les textes de la landing se remplissent avec les seules variables connues', () => {
    for (const text of strings(LANDING)) {
      expect(() => fill(text, { storeName: 'Awa Beauty' })).not.toThrow();
      expect(fill(text, { storeName: 'Awa Beauty' })).not.toMatch(/\{[a-zA-Z]+\}/);
    }
  });

  it('un avis ne peut être publié qu’avec la preuve d’autorisation', () => {
    for (const review of REVIEWS) {
      expect(review.consent.proof.trim()).not.toBe('');
      expect(review.consent.grantedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('aucun avis ni publication Instagram n’est inventé au lancement', () => {
    expect(REVIEWS).toEqual([]);
    expect(INSTAGRAM_POSTS).toEqual([]);
  });
});

describe('mots-clés « ghost » des titres', () => {
  const bare = (word: string) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLocaleLowerCase('fr');
  const sections = Object.values(LANDING).flatMap((section) =>
    'titleGhost' in section ? [section as { title: string; titleGhost: readonly string[] }] : [],
  );

  it('chaque mot ghost est un mot de son titre (aucune faute de frappe) et jamais le titre entier', () => {
    expect(sections.length).toBeGreaterThanOrEqual(10);
    for (const { title, titleGhost } of sections) {
      const words = title.split(/\s+/).map(bare);
      for (const ghost of titleGhost) expect(words, `« ${ghost} » est absent de « ${title} »`).toContain(bare(ghost));
      expect(titleGhost.length).toBeLessThan(words.length);
    }
  });
});

describe('règles de paiement : source unique (RM-41)', () => {
  it('le rappel est la somme des trois phrases validées', () => {
    expect(paymentReminder(2000)).toBe(`${paymentAbidjan(2000)} ${PAYMENT_OUTSIDE} ${PAYMENT_FOLLOW_UP}`);
  });
  it('le montant de l’acompte vient du paramètre, jamais d’une valeur écrite en dur', () => {
    expect(paymentAbidjan(2000).replace(/[\s\u202f\u00a0]/g, ' ')).toContain('2 000 FCFA');
    expect(paymentAbidjan(3500).replace(/[\s\u202f\u00a0]/g, ' ')).toContain('3 500 FCFA');
    const faq = faqItems(3500).map((item) => item.answer).join(' ').replace(/[\s\u202f\u00a0]/g, ' ');
    expect(faq).toContain('3 500 FCFA');
    expect(faq).not.toContain('2 000 FCFA');
  });
  it('la FAQ n’affiche jamais un numéro de téléphone ou de paiement', () => {
    const text = faqItems(2000).map((item) => item.answer).join(' ');
    expect(text).not.toMatch(/\+?\d[\d\s]{7,}\d/);
    expect(text).toContain('au numéro communiqué par la vendeuse après confirmation');
  });
  it('la FAQ couvre les neuf questions des textes v1.0', () => {
    expect(faqItems(2000)).toHaveLength(9);
    expect(faqItems(2000, 'Awa Beauty').some((item) => item.question === 'Comment contacter Awa Beauty ?')).toBe(true);
  });
});
