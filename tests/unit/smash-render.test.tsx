import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LANDING } from '@/content/landing';
import type { PublicSettings } from '@/server/services/catalog.queries';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...(rest as object)}>
      {children}
    </a>
  ),
}));

const { SmashGame } = await import('@/components/shop/SmashGame');
const { Footer } = await import('@/components/shop/Footer');

const plain = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const settings = (): PublicSettings => ({ storeName: 'Awa Beauty', whatsappNumber: null, whatsappLink: null, contactEmail: null, contactPhone: null, instagramUrl: null, tiktokUrl: null, facebookUrl: null, focusProductId: null, depositAmount: 2000 });

describe('textes validés du mini-jeu (landing §15)', () => {
  it('reprennent mot pour mot le document', () => {
    expect(LANDING.smash.title).toBe('Une petite pause beauté ?');
    expect(LANDING.smash.text).toBe('Envie d’une petite pause ludique ? Lancez Cosmetic Smash et amusez-vous quelques instants.');
    expect(LANDING.smash.play).toBe('Jouer');
    expect([LANDING.smash.score, LANDING.smash.time, LANDING.smash.pause, LANDING.smash.restart]).toEqual(['Score', 'Temps', 'Pause', 'Recommencer']);
    expect(LANDING.smash.over).toBe('Bien joué ! Envie de refaire une partie ?');
    expect(LANDING.smash.replay).toBe('Rejouer');
    expect(LANDING.smash.reducedMotion).toBe('Le jeu est désactivé car vous avez demandé moins d’animations.');
  });
});

describe('bloc du jeu, rendu serveur', () => {
  const html = renderToString(<SmashGame accents={['#f4a6c0']} />);

  it('le titre et le texte sont dans le HTML dès le chargement (effet « spaghetti », texte complet)', () => {
    expect(plain(html)).toContain('Une petite pause beauté ?');
    expect(plain(html)).toContain('Envie d’une petite pause ludique ? Lancez Cosmetic Smash et amusez-vous quelques instants.');
    expect(html).toMatch(/<h2[^>]*class="[^"]*smash-title/);
  });

  it('propose « Jouer » et, en parallèle, le message « moins d’animations » (CSS choisit lequel afficher)', () => {
    expect(html).toMatch(/<button[^>]*class="[^"]*smash-play[^"]*"[^>]*>Jouer<\/button>/);
    expect(plain(html)).toContain('Le jeu est désactivé car vous avez demandé moins d’animations.');
  });

  it('le jeu ne démarre pas tout seul : aucun canvas, aucun score, aucun chronomètre avant « Jouer »', () => {
    expect(html).not.toContain('<canvas');
    expect(plain(html)).not.toContain('Score');
    expect(plain(html)).not.toContain('Temps :');
    expect(html).toContain('data-smash="idle"');
    expect(html).toContain('data-code="waiting"');
  });

  it('le bouton est inerte tant que la page n’est pas hydratée (pas de clic mort sans JavaScript)', () => {
    expect(html).toMatch(/<button[^>]*smash-play[^>]*disabled/);
  });
});

describe('footer', () => {
  it('affiche le bloc du jeu sans retirer aucun lien du footer', () => {
    const html = renderToString(<Footer settings={settings()} showCollections accents={['#f4a6c0', '#b69bd6']} />);
    expect(plain(html)).toContain('Une petite pause beauté ?');
    for (const label of ['Accueil', 'Boutique', 'Questions fréquentes', 'Conditions générales de vente', 'Politique de confidentialité']) expect(plain(html)).toContain(label);
  });
  it('fonctionne sans couleur de catégorie (boutique sans catégorie)', () => {
    expect(() => renderToString(<Footer settings={settings()} showCollections={false} />)).not.toThrow();
  });
});
