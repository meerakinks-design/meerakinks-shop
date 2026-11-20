export const MAX_PRODUCT_IMAGES = 8;
// Limite côté navigateur, pour l'ergonomie : le plan gratuit de Cloudinary refuse au-delà de 10 Mo.
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const CLOUDINARY_UPLOAD_FOLDER = 'boutique/products';
export const CLOUDINARY_ALLOWED_FORMATS = 'jpg,jpeg,png,webp';
