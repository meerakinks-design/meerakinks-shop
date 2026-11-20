/** Insère une transformation Cloudinary dans une URL déjà stockée (miniature, recadrage…). */
export function cloudinaryTransform(url: string, transformation: string): string {
  const marker = '/image/upload/';
  const index = url.indexOf(marker);
  if (index === -1) return url;
  const cut = index + marker.length;
  return `${url.slice(0, cut)}${transformation}/${url.slice(cut)}`;
}

/** Miniature carrée, format et qualité choisis automatiquement par Cloudinary. */
export function cloudinaryThumbnail(url: string, size = 240): string {
  return cloudinaryTransform(url, `c_fill,w_${size},h_${size},f_auto,q_auto`);
}
