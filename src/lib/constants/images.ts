export const MAX_PRODUCT_IMAGES = 8;
// Limite côté navigateur, pour l'ergonomie : le plan gratuit de Cloudinary refuse au-delà de 10 Mo.
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// Les vidéos du back-office passent aussi par Cloudinary (envoi direct) ; 100 Mo est la limite du plan gratuit.
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'] as const;
export const ALLOWED_VIDEO_TYPES = ['video/webm', 'video/mp4', 'video/quicktime'] as const;

// Tout ce qui est envoyé depuis le back-office part chez Cloudinary, jamais sur le disque du serveur.
export const CLOUDINARY_UPLOAD_FOLDER = 'boutique/products';
export const CLOUDINARY_VIDEO_FOLDER = 'boutique/videos';
// Formats vérifiés PAR CLOUDINARY sur le contenu réel du fichier (et non sur l'extension ou le type annoncé par le navigateur).
// SVG volontairement absent : un SVG peut embarquer du script, il n'est jamais accepté depuis le back-office.
export const CLOUDINARY_ALLOWED_FORMATS = 'jpg,jpeg,png,webp,gif,avif';
export const CLOUDINARY_ALLOWED_VIDEO_FORMATS = 'webm,mp4,mov';

export const UPLOAD_KINDS = ['image', 'video'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const UPLOAD_SETTINGS: Record<UploadKind, { folder: string; allowedFormats: string }> = {
  image: { folder: CLOUDINARY_UPLOAD_FOLDER, allowedFormats: CLOUDINARY_ALLOWED_FORMATS },
  video: { folder: CLOUDINARY_VIDEO_FOLDER, allowedFormats: CLOUDINARY_ALLOWED_VIDEO_FORMATS },
};
