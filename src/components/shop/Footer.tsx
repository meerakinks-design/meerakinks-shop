import Link from 'next/link';
import { LANDING } from '@/content/landing';
import { paymentReminder } from '@/content/livraison';
import { MODAL_HASHES, PUBLIC_ROUTES } from '@/lib/constants/routes';
import { fill } from '@/lib/shop/template';
import type { PublicSettings } from '@/server/services/catalog.queries';
import { ModalLink } from './ModalLink';
import { SmashGame } from './SmashGame';

export function Footer({ settings, showCollections, accents = [] }: { settings: PublicSettings; showCollections: boolean; accents?: readonly string[] }) {
  const { storeName } = settings;
  const socials = [
    { label: 'Instagram', href: settings.instagramUrl },
    { label: 'TikTok', href: settings.tiktokUrl },
    { label: 'Facebook', href: settings.facebookUrl },
  ].filter((social): social is { label: string; href: string } => Boolean(social.href));

  return (
    <footer className="site-footer">
      <SmashGame accents={accents} />
      <div className="container footer-grid">
        <div>
          <p className="brand">{storeName}</p>
          <p>{fill(LANDING.footer.intro, { storeName })}</p>
        </div>

        <nav aria-label="Navigation du pied de page">
          <h2 className="footer-title">Navigation</h2>
          <ul>
            <li><Link href={PUBLIC_ROUTES.home}>Accueil</Link></li>
            <li><Link href={PUBLIC_ROUTES.shop}>Boutique</Link></li>
            {showCollections && <li><Link href="/#collections">Collections</Link></li>}
            <li><ModalLink hash={MODAL_HASHES.story}>Notre histoire</ModalLink></li>
          </ul>
        </nav>

        <div>
          <h2 className="footer-title">Aide</h2>
          <ul>
            {settings.whatsappLink && (
              <li><a href={settings.whatsappLink} target="_blank" rel="noopener noreferrer">Contact WhatsApp</a></li>
            )}
            <li><Link href="/#faq">Questions fréquentes</Link></li>
            <li><Link href="/#faq">Informations de paiement et livraison</Link></li>
          </ul>
        </div>

        {socials.length > 0 && (
          <div>
            <h2 className="footer-title">Suivez-nous</h2>
            <ul>
              {socials.map((social) => (
                <li key={social.label}><a href={social.href} target="_blank" rel="noopener noreferrer">{social.label}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="container footer-payment">
        <p>{paymentReminder(settings.depositAmount)}</p>
      </div>

      <div className="container footer-legal">
        <ul>
          <li><Link href="/cgv">Conditions générales de vente</Link></li>
          <li><Link href="/cgu">Conditions générales d’utilisation</Link></li>
          <li><Link href="/mentions-legales">Mentions légales</Link></li>
          <li><Link href="/politique-de-confidentialite">Politique de confidentialité</Link></li>
        </ul>
        <p>© {new Date().getFullYear()} {storeName}. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
