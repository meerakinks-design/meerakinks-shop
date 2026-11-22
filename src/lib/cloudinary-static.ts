// Lecture des médias du dossier public/ depuis Cloudinary — même principe que `cld()` du projet rabbit :
// on garde le chemin local (`/brand/logo-meera-kinks.png`), seule l'origine change.
//
// La synchronisation est faite par `npm run media:sync` (scripts/upload-cloudinary.js), qui lit le MÊME fichier de
// configuration (config/cloudinary-media.json) : dossier racine, formats image / vidéo / son, fichiers qui restent locaux.
//
// Sans NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME (développement, tests, première mise en ligne avant la synchro), le chemin local
// est renvoyé tel quel : rien ne casse.
import media from '../../config/cloudinary-media.json';

export type StaticResourceType = 'image' | 'video' | 'raw';

const extensionOf = (path: string): string => {
  const dot = path.lastIndexOf('.');
  return dot === -1 || path.lastIndexOf('/') > dot ? '' : path.slice(dot + 1).toLowerCase();
};

/** Images → « image » ; vidéos et sons → « video » (Cloudinary range l'audio avec la vidéo) ; le reste → « raw ». */
export function staticResourceType(path: string): StaticResourceType {
  const extension = extensionOf(path);
  if (media.imageExtensions.includes(extension)) return 'image';
  if (media.videoExtensions.includes(extension) || media.audioExtensions.includes(extension)) return 'video';
  return 'raw';
}

/** Les polices et les icônes de site restent servies par le site lui-même (CSP font-src, /favicon.ico). */
export function isLocalOnly(path: string): boolean {
  const clean = path.replace(/^\/+/, '');
  return media.localOnly.some((entry) => (entry.endsWith('/') ? clean.startsWith(entry) : clean === entry));
}

/** Identifiant Cloudinary : racine + chemin sans extension (image, vidéo) ou avec extension (raw). */
export function staticPublicId(path: string): string {
  const clean = path.replace(/^\/+/, '').normalize('NFC');
  const extension = extensionOf(clean);
  const withoutExtension = staticResourceType(clean) === 'raw' || !extension ? clean : clean.slice(0, -(extension.length + 1));
  return `${media.baseFolder}/${withoutExtension}`;
}

/**
 * @param localPath chemin tel qu'il était utilisé en local, par ex. `/brand/logo-meera-kinks.png`
 * @param options.width largeur maximale demandée (px) ; sans elle, Cloudinary sert l'original optimisé (format + qualité)
 */
export function cld(localPath: string, options: { width?: number } = {}): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const clean = localPath.replace(/^\/+/, '');
  if (!cloudName || isLocalOnly(clean)) return `/${clean}`;

  const type = staticResourceType(clean);
  const transformation = type === 'raw' ? '' : `${['f_auto', 'q_auto', ...(options.width ? [`w_${Math.round(options.width)}`] : [])].join(',')}/`;
  // Chaque segment est encodé séparément (espaces, accents) sans toucher aux « / ».
  const publicId = staticPublicId(clean).split('/').map(encodeURIComponent).join('/');
  return `https://res.cloudinary.com/${cloudName}/${type}/upload/${transformation}${publicId}`;
}
