// Publications Instagram affichées sur la landing : ajoutées à la main (images hébergées sur Cloudinary).
// LISTE VIDE AU LANCEMENT : sous 4 publications, la section n'est pas affichée.

export interface InstagramPost {
  imageUrl: string;
  alt: string;
  href: string;
}

export const MIN_INSTAGRAM_POSTS = 4;
export const MAX_INSTAGRAM_POSTS = 6;
export const INSTAGRAM_POSTS: InstagramPost[] = [];
