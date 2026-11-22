import Link from 'next/link';
import { LANDING } from '@/content/landing';
import { paymentReminder } from '@/content/livraison';
import { cld } from '@/lib/cloudinary-static';
import { MODAL_HASHES, PUBLIC_ROUTES } from '@/lib/constants/routes';
import { fill } from '@/lib/shop/template';
import type { PublicSettings } from '@/server/services/catalog.queries';
import { ModalLink } from './ModalLink';
import { SmashGame } from './SmashGame';

/**
 * Pied de page (référence Palmo) : bord festonné beige sur fond marron, accroche (repère 1), liens centrés (repère 2),
 * très grand logo beige (version L3 de la charte, la seule autorisée sur fond marron), jeu, et pastille beige
 * avec le copyright et les mentions (repère 3).
 */
export function Footer({ settings, showCollections, accents = [] }: { settings: PublicSettings; showCollections: boolean; accents?: readonly string[] }) {
  const { storeName } = settings;
  const socials = [
    { label: 'Instagram', href: settings.instagramUrl },
    { label: 'TikTok', href: settings.tiktokUrl },
    { label: 'Facebook', href: settings.facebookUrl },
  ].filter((social): social is { label: string; href: string } => Boolean(social.href));

  return (
    <footer className="site-footer">
      <div className="footer-scallop" aria-hidden="true" />

      <div className="container footer-inner">
        <p className="footer-brandline">{storeName}</p>
        <p className="footer-tagline">{fill(LANDING.footer.intro, { storeName })}</p>

        <nav aria-label="Navigation du pied de page" className="footer-nav">
          <ul>
            <li><Link href={PUBLIC_ROUTES.home}>Accueil</Link></li>
            <li><Link href={PUBLIC_ROUTES.shop}>Boutique</Link></li>
            {showCollections && <li><Link href="/#collections">Collections</Link></li>}
            <li><ModalLink hash={MODAL_HASHES.story}>Notre histoire</ModalLink></li>
            <li><Link href="/#faq">Questions fréquentes</Link></li>
            {settings.whatsappLink && (
              <li><a href={settings.whatsappLink} target="_blank" rel="noopener noreferrer">Contact WhatsApp</a></li>
            )}
          </ul>
        </nav>

        {socials.length > 0 && (
          <ul className="footer-socials" aria-label="Réseaux sociaux">
            {socials.map((social) => (
              <li key={social.label}><a href={social.href} target="_blank" rel="noopener noreferrer">{social.label}</a></li>
            ))}
          </ul>
        )}

        <Link href={PUBLIC_ROUTES.home} className="footer-logo" aria-label={`${storeName} — accueil`}>
          <img src={cld('/brand/logo-meera-kinks-beige.png', { width: 1200 })} alt={storeName} width={1200} height={468} loading="lazy" />
        </Link>

        <div className="footer-game"><SmashGame accents={accents} /></div>

        <p className="footer-payment">{paymentReminder(settings.depositAmount)}</p>

        <div className="footer-pill">
          <p>© {new Date().getFullYear()} {storeName}. Tous droits réservés.</p>
          <ul>
            <li><Link href="/cgv">Conditions générales de vente</Link></li>
            <li><Link href="/cgu">Conditions générales d’utilisation</Link></li>
            <li><Link href="/mentions-legales">Mentions légales</Link></li>
            <li><Link href="/politique-de-confidentialite">Politique de confidentialité</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
