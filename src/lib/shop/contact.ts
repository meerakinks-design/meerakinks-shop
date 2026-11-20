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
