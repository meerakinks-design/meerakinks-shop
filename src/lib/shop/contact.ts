import { CONTACT_FORM_ENABLED } from '@/lib/constants/features';

export interface ContactSettings {
  whatsappLink: string | null;
  contactEmail: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
}

/** La section Contact (et son lien dans les menus) n'existe que s'il y a au moins un moyen de contact confirmé. */
export function hasContactChannels(settings: ContactSettings): boolean {
  return Boolean(settings.whatsappLink || settings.contactEmail || settings.instagramUrl || settings.tiktokUrl || settings.facebookUrl);
}

/** La section Contact existe dès qu'il y a un moyen d'écrire : le formulaire (Resend) ou au moins une coordonnée confirmée. */
export function hasContactSection(settings: ContactSettings): boolean {
  return CONTACT_FORM_ENABLED || hasContactChannels(settings);
}
