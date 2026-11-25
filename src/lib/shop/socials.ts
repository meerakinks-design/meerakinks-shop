import type { PublicSettings } from '@/server/services/catalog.queries';

export type SocialName = 'whatsapp' | 'instagram' | 'tiktok' | 'facebook';

export interface SocialLink {
  name: SocialName;
  label: string;
  href: string;
}

/**
 * Réseaux de la marque, dans l'ordre d'affichage (WhatsApp, Instagram, TikTok, Facebook). Un réseau sans lien configuré
 * n'apparaît pas : aucun lien n'est fabriqué. Source unique du pied de page et du pied du menu.
 */
export function buildSocialLinks(settings: Pick<PublicSettings, 'whatsappLink' | 'instagramUrl' | 'tiktokUrl' | 'facebookUrl'>): SocialLink[] {
  const links: Array<SocialLink | null> = [
    settings.whatsappLink ? { name: 'whatsapp', label: 'WhatsApp', href: settings.whatsappLink } : null,
    settings.instagramUrl ? { name: 'instagram', label: 'Instagram', href: settings.instagramUrl } : null,
    settings.tiktokUrl ? { name: 'tiktok', label: 'TikTok', href: settings.tiktokUrl } : null,
    settings.facebookUrl ? { name: 'facebook', label: 'Facebook', href: settings.facebookUrl } : null,
  ];
  return links.filter((link): link is SocialLink => link !== null);
}
