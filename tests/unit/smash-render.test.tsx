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
    expect(LANDING.smash.text).toBe('Envie d’une pause ludique ? Lancez Cosmetic Smash et amusez-vous quelques instants.');
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
    expect(plain(html)).toContain('Envie d’une pause ludique ? Lancez Cosmetic Smash et amusez-vous quelques instants.');
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
  it('en trois parties : logo, signature et liens en haut · jeu pleine largeur au milieu · filigrane en texte et crédit en bas', () => {
    const html = renderToString(<Footer settings={settings()} showCollections accents={[]} />);
    const text = plain(html);
    // Partie 1 : signature, informations (à propos, crédits, légal) puis navigation.
    expect(text).toContain('Embrassez vos kinks !');
    for (const label of ['À propos', 'Crédits', 'Mentions légales', 'Conditions générales d’utilisation', 'Gérer mes cookies']) expect(text).toContain(label);
    expect(html.indexOf('footer-brand')).toBeLessThan(html.indexOf('footer-col-info'));
    expect(html.indexOf('footer-col-info')).toBeLessThan(html.indexOf('footer-col-nav'));
    // Partie 2 : le jeu, entre le haut du pied de page et le filigrane.
    expect(html.indexOf('footer-col-nav')).toBeLessThan(html.indexOf('footer-game'));
    expect(html.indexOf('footer-game')).toBeLessThan(html.indexOf('footer-watermark'));
    // Partie 3 : le nom de la marque est ÉCRIT (aucun logo en filigrane), décoratif ; le crédit est un lien.
    expect(html).toMatch(/<p class="footer-watermark" aria-hidden="true">MEËRA KINKS<\/p>/);
    expect(html.match(/logo-meera-kinks-beige/g)).toHaveLength(1); // un seul logo : en haut à gauche, jamais en filigrane
    expect(text).toContain('Créé par');
    expect(html).toContain('href="https://akatech.vercel.app/"');
    expect(html).toContain('credit-reveal');
  });
  it('retire le texte de présentation et le rappel de paiement (ils vivent dans la FAQ, le panier et la commande)', () => {
    const text = plain(renderToString(<Footer settings={settings()} showCollections accents={[]} />));
    expect(text).not.toContain('Ma boutique vous propose');
    expect(text).not.toContain('acompte');
    expect(text).not.toContain('Hors d’Abidjan');
  });
  it('les icônes de contact n’existent que pour les liens configurés', () => {
    const none = renderToString(<Footer settings={settings()} showCollections accents={[]} />);
    expect(none).not.toContain('footer-icons');
    const some = renderToString(<Footer settings={{ ...settings(), whatsappLink: 'https://wa.me/2250700000000', instagramUrl: 'https://instagram.com/awa' }} showCollections accents={[]} />);
    expect(some).toContain('aria-label="WhatsApp"');
    expect(some).toContain('aria-label="Instagram"');
    expect(some).not.toContain('aria-label="TikTok"');
    expect(some).not.toContain('aria-label="Facebook"');
  });
  it('fonctionne sans couleur de catégorie (boutique sans catégorie)', () => {
    expect(() => renderToString(<Footer settings={settings()} showCollections={false} />)).not.toThrow();
  });
});
