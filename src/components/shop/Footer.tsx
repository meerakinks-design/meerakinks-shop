import Link from 'next/link';
import { cld } from '@/lib/cloudinary-static';
import { PUBLIC_ROUTES } from '@/lib/constants/routes';
import { hasContactSection } from '@/lib/shop/contact';
import { buildSocialLinks } from '@/lib/shop/socials';
import type { PublicSettings } from '@/server/services/catalog.queries';
import { FooterCredit } from './FooterCredit';
import { SmashGame } from './SmashGame';
import { SocialIcon, type SocialIconName } from './SocialIcons';

const SIGNATURE = 'Embrassez vos kinks !';

interface FooterIcon {
  name: SocialIconName;
  label: string;
  href: string;
}

/**
 * Pied de page en trois parties (référence Skarlett) :
 *  1. en haut : logo, signature et contact (icônes) à gauche · informations (légal, crédits, à propos) au milieu · navigation à droite ;
 *  2. au milieu : le mini-jeu, sur toute la largeur du pied de page (carré sur téléphone) ;
 *  3. en bas : le nom de la marque écrit en grand (filigrane en texte, pas de logo) et le crédit « Créé par AKATech Studio ».
 * Une icône n'apparaît que si son lien est configuré : aucun lien fabriqué.
 */
export function Footer({ settings, showCollections, accents = [] }: { settings: PublicSettings; showCollections: boolean; accents?: readonly string[] }) {
  const { storeName } = settings;
  // WhatsApp, Instagram, TikTok, Facebook (mêmes liens et même ordre que le pied du menu), puis l'e-mail.
  const icons: FooterIcon[] = [
    ...buildSocialLinks(settings),
    ...(settings.contactEmail ? [{ name: 'mail' as const, label: 'Nous écrire par e-mail', href: `mailto:${settings.contactEmail}` }] : []),
  ];
  const showContact = hasContactSection(settings);

  return (
    <footer className="site-footer">
      <div className="footer-scallop" aria-hidden="true" />

      {/* Partie 1 */}
      <div className="container footer-top">
        <section className="footer-brand" aria-label={storeName}>
          <Link href={PUBLIC_ROUTES.home} className="footer-logo" aria-label={`${storeName} — accueil`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cld('/brand/logo-meera-kinks-beige.png', { width: 600 })} alt={storeName} width={600} height={234} loading="lazy" />
          </Link>
          <p className="footer-signature">{SIGNATURE}</p>
          {icons.length > 0 && (
            <nav className="footer-icons" aria-label="Nous joindre">
              {icons.map((icon) => (
                <a
                  key={icon.name}
                  href={icon.href}
                  aria-label={icon.label}
                  {...(icon.name === 'mail' ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                >
                  <SocialIcon name={icon.name} size={22} />
                </a>
              ))}
            </nav>
          )}
        </section>

        <nav className="footer-col footer-col-info" aria-labelledby="footer-info-title">
          <h2 id="footer-info-title" className="footer-heading">
            Informations
          </h2>
          <ul>
            <li><Link href={PUBLIC_ROUTES.about}>À propos</Link></li>
            <li><Link href={PUBLIC_ROUTES.credits}>Crédits</Link></li>
            <li><Link href={PUBLIC_ROUTES.cgv}>Conditions générales de vente</Link></li>
            <li><Link href={PUBLIC_ROUTES.cgu}>Conditions générales d’utilisation</Link></li>
            <li><Link href={PUBLIC_ROUTES.legalNotice}>Mentions légales</Link></li>
            <li><Link href={PUBLIC_ROUTES.privacy}>Politique de confidentialité</Link></li>
            <li><Link href={PUBLIC_ROUTES.cookies}>Gérer mes cookies</Link></li>
          </ul>
        </nav>

        <nav className="footer-col footer-col-nav" aria-labelledby="footer-nav-title">
          <h2 id="footer-nav-title" className="footer-heading">
            Navigation
          </h2>
          <ul>
            <li><Link href={PUBLIC_ROUTES.home}>Accueil</Link></li>
            <li><Link href={PUBLIC_ROUTES.shop}>Boutique</Link></li>
            {showCollections && <li><Link href="/#collections">Collections</Link></li>}
            <li><Link href="/#faq">Questions fréquentes</Link></li>
            {showContact && <li><Link href="/#contact">Contact</Link></li>}
          </ul>
        </nav>
      </div>

      {/* Partie 2 */}
      <div className="container footer-game">
        <SmashGame accents={accents} />
      </div>

      {/* Partie 3 */}
      <div className="footer-bottom">
        <p className="footer-watermark" aria-hidden="true">
          MEËRA KINKS
        </p>
        <div className="container footer-credit-row">
          <p>
            © {new Date().getFullYear()} {storeName}. Tous droits réservés.
          </p>
          <p className="footer-made">
            Créé par <FooterCredit />
          </p>
        </div>
      </div>
    </footer>
  );
}
